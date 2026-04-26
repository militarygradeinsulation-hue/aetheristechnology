## Data Hygiene Engine — CRM cleanup feature for `/app/hygiene`

A new module inside the Revenue Recovery app that detects, categorizes, and (with approval) writes back data quality fixes to HubSpot. Reuses the existing mirror tables, OAuth, and AI pipeline — no duplicate sync or auth.

### Scope notes (please confirm during build)

- **AI model**: The brief asks for `claude-opus-4-7`, which isn't a real model and the project's AI gateway doesn't proxy Anthropic. We'll use the existing pattern from `run-audit` — Lovable AI Gateway with `openai/gpt-5` for categorization (matches the audit pipeline) and `google/gemini-2.5-flash` for cheaper batch confidence scoring. No new API keys needed.
- **Phase 1 only** — no Apollo/Clay enrichment, no auto-merge, no scheduled scans (UI placeholders only).
- **Safety-first writes** — one record at a time, ≤10 req/s, every change logged with full before/after, rollback supported.

---

### 1. Routes & Navigation

Add to `src/app/AppRouter.tsx`:
```
/app/hygiene          → redirects to /app/hygiene/scan
/app/hygiene/scan     → HygieneScan page
/app/hygiene/queue    → HygieneQueue page
/app/hygiene/history  → HygieneHistory page
```

Add a "Hygiene" nav item (Sparkles icon, cyan accent) to `AppLayout.tsx` between Audits and Settings.

A shared `HygieneSubNav` component renders Scan / Queue / History tabs at the top of each page.

---

### 2. Database (new migration)

Three new tables, all with RLS scoped to the user's account (same pattern as `audit_runs`):

```
hygiene_scans
  id uuid pk, account_id uuid, scan_date timestamptz default now(),
  status text ('running'|'complete'|'failed'),
  total_issues int default 0,
  totals_by_category jsonb default '{}',     -- quick rollup for list view
  results jsonb default '{}',                -- full per-category findings
  ai_status text default 'pending',          -- 'pending'|'running'|'complete'|'failed'
  error_message text,
  completed_at timestamptz

hygiene_actions
  id uuid pk, scan_id uuid fk, account_id uuid,
  category text,                             -- e.g. 'phone_format', 'duplicate_contacts'
  confidence text,                           -- 'high'|'medium'|'low'
  risk_level text,                           -- 'low'|'medium'|'high'
  approval_mode text,                        -- 'batch'|'individual'
  recommended_action jsonb,                  -- {label, rationale, change_spec}
  affected_record_ids text[] default '{}',
  affected_count int default 0,
  status text default 'pending',             -- pending|approved|executing|executed|skipped|failed
  approved_at timestamptz, executed_at timestamptz, created_at timestamptz default now()

hygiene_log
  id uuid pk, action_id uuid fk, account_id uuid,
  hubspot_object_type text,                  -- 'contact'|'deal'|'company'|'engagement'
  hubspot_object_id text,
  field_changes jsonb,                       -- [{field, before, after}]
  before_value jsonb, after_value jsonb,
  success boolean, error_message text,
  rolled_back_at timestamptz,
  executed_at timestamptz default now()

hygiene_settings (one row per account)
  account_id uuid pk,
  require_approval boolean default true,
  allow_auto_high_conf boolean default false,
  enable_enrichment boolean default false,
  max_batch_size int default 100,
  pause_threshold_pct int default 5,
  updated_at timestamptz default now()
```

RLS pattern (same as `audit_runs`):
- `service role manages all`
- `users select where account_id IN (select id from accounts where user_id = auth.uid())`
- Settings additionally allows insert/update for the owning user.

---

### 3. Edge functions (3 new)

All follow existing conventions: deno serve, CORS headers, JWT validated via `supabase.auth.getUser`, `EdgeRuntime.waitUntil` for long work, `verify_jwt = false` (in-code validation).

#### `hygiene-scan/index.ts`
- Input: `{ account_id }`
- Creates `hygiene_scans` row (status=running), returns `scan_id` immediately
- Background pipeline:
  1. Loads `mirror_contacts`, `mirror_deals`, `mirror_engagements`, `mirror_owners` for the account
  2. Runs the **8 detection routines** (in-memory JS, mirroring the `detectPatterns` style from `run-audit`):
     - `duplicate_contacts` — group by lowercased email, normalized phone (digits only), and (lowercased name + company_id) fuzzy bucket
     - `missing_critical_fields` — bucket by missing-set signature: `email|phone|company|title|industry`
     - `lifecycle_mismatch` — cross-reference contact lifecycle vs `mirror_deal_contacts` + deal stages
     - `formatting_inconsistencies` — name case (lower/upper/mixed), phone format variance, email whitespace/case, company trailing whitespace
     - `owner_issues` — null owner, owner_id not in `mirror_owners`, deal owner ≠ primary contact owner
     - `stale_lifecycle` — MQL/SQL/Opportunity with `last_activity_date` > 90d
     - `deal_data_issues` — open deals missing amount/close_date/contact/owner, or close_date < now() but stage not closed
     - `engagement_orphans` — `mirror_engagements` rows with neither `contact_id` nor `deal_id`
  3. Each routine returns `{ category, count, severity, sample_ids[], affected_record_ids[], details }`
  4. Persists to `hygiene_scans.results` and `totals_by_category`
  5. Triggers AI categorization (Stage 2 below) inline; updates `ai_status` to complete
  6. Inserts one `hygiene_actions` row per category with the AI verdict

- AI Stage A (confidence scoring): one Lovable AI call per category with a sample of 5–10 records → JSON `{confidence, reasoning}`
- AI Stage B (action recommendation): one call per category → JSON `{label, rationale, change_spec, risk_level, approval_mode}`
- Tool-calling JSON pattern (from project's AI guidance), gemini-2.5-flash for Stage A, gpt-5 for Stage B
- Falls back to deterministic defaults if `LOVABLE_API_KEY` missing (matches `run-audit`)

#### `hygiene-execute/index.ts`
- Input: `{ action_id, record_ids?: string[], modifications?: Record<id, override> }`
- Marks action `status=executing`
- Looks up account → resolves HubSpot access token via existing `getAccessToken` helper (reuse pattern from `hubspot-sync`)
- For each affected record (one at a time, 100ms delay = 10 req/s cap):
  1. `GET` current value from HubSpot to detect drift
  2. Computes diff against `change_spec`
  3. `PATCH` the object with the approved change
  4. Inserts `hygiene_log` row with field-level before/after
  5. Updates corresponding `mirror_*` row to keep UI consistent
- On any single failure: log error, continue with next record
- Special branch: **duplicates** — performs HubSpot merge API call (`/crm/v3/objects/contacts/merge`) using user-selected master id
- Refuses to run any DELETE without `confirm_delete: true` flag (Phase 1 has no UI for it)
- Sends progress to client via `hygiene_actions.status` polling (same pattern as audit's `current_stage`)

#### `hygiene-rollback/index.ts`
- Input: `{ log_id }` or `{ action_id, all: true }` for batch rollback
- For each log row: PATCH HubSpot with `before_value`, set `rolled_back_at`, mirror update
- Same per-record safety + rate limit as execute

---

### 4. Frontend pages

#### `src/app/pages/AppHygieneScan.tsx`
- Empty state: "Run Hygiene Scan" CTA card
- During scan: progress bar + live status from `hygiene_scans.status` + `ai_status` (poll every 3s, same as Dashboard sync polling)
- Results: 8 category cards in a grid. Each card:
  - Category title + issue count (e.g. "847 duplicate contacts")
  - Severity chip (green #10b981 / amber #eab308 / red-orange #ef4444)
  - Confidence label (`Auto-fixable` / `Needs review` / `Requires enrichment`)
  - Estimated impact line from AI rationale
  - "Send to Action Queue" → updates `hygiene_actions.status=pending`, navigates to `/app/hygiene/queue`
- Past scans list at bottom (last 5)

#### `src/app/pages/AppHygieneQueue.tsx`
- Pulls all `hygiene_actions` where `status='pending'` for the account
- Collapsible section per category with three buttons: **Approve All / Review Each / Skip Category**
- **Approve All modal** (high-confidence batch):
  - Shows 5 sample before/after pairs (computed client-side from change_spec)
  - "Confirm — Execute All" calls `hygiene-execute`
  - Live progress bar driven by polling `hygiene_actions.status` + count of `hygiene_log` rows
- **Review Each** (medium/low confidence): card-based reviewer
  - Each card: record snapshot (before) + proposed (after) + Approve / Modify / Skip
  - Modify: inline editor for the proposed value, stored in `modifications` map
  - "Skip all remaining" at top
- **Duplicate-specific UI**: side-by-side comparison of all matched records, radio to pick master, checkbox per field to choose source. Preview merged result modal before confirm.
- **Missing fields**: Phase 1 → "Export to CSV" button (client-side download of affected_record_ids with current field state), enrichment toggle disabled with "Phase 2" tag.

#### `src/app/pages/AppHygieneHistory.tsx`
- Timeline list of past scans (date, total_issues, executed count from `hygiene_log`)
- Click a scan → drill into per-action `hygiene_log` rows
- Each log row: object type/id, field-level diff, success status, "Rollback" button
- "Rollback entire batch" button on action level
- Confirmation modal for any rollback

#### Settings additions
- New "Hygiene Settings" section appended to `src/app/pages/AppSettings.tsx`
- Fields wired to `hygiene_settings` row (auto-create on first read):
  - Toggles: require_approval, allow_auto_high_conf, enable_enrichment (disabled, Phase 2 tag)
  - Numbers: max_batch_size (1–1000), pause_threshold_pct (1–50)
- Save button uses upsert; toast on success

---

### 5. Design

- Match existing `/app` dark aesthetic (cards, borders, muted text)
- New accent: cyan `hsl(189 94% 43%)` for hygiene-specific elements (sidebar icon active state, page accents, primary CTAs)
- Severity color tokens added to local component scope only (not global theme):
  - high `#10b981`, medium `#eab308`, low `#ef4444`
- Loading copy: "Scanning 12,847 contacts...", "Updating 234 of 847 records..."
- All progress uses existing `Progress` component

---

### 6. Build order (matches brief)

1. Routes, sidebar nav, sub-nav skeleton
2. DB migration (4 tables + RLS + settings auto-row)
3. `hygiene-scan` edge function — detection routines first, AI layer second
4. `AppHygieneScan` page + scan trigger + results display
5. `AppHygieneQueue` — start with formatting/whitespace (highest confidence, lowest risk)
6. `hygiene-execute` edge function with one-at-a-time + rate limit
7. Duplicate merge & review-each flows
8. `AppHygieneHistory` + `hygiene-rollback`
9. Settings panel

Test gate (per brief): run a 5-record dry-run before exposing 100+ batch approval in any category.

### Files created/edited

**New**
- `supabase/migrations/<ts>_hygiene_engine.sql`
- `supabase/functions/hygiene-scan/index.ts`
- `supabase/functions/hygiene-execute/index.ts`
- `supabase/functions/hygiene-rollback/index.ts`
- `src/app/pages/AppHygieneScan.tsx`
- `src/app/pages/AppHygieneQueue.tsx`
- `src/app/pages/AppHygieneHistory.tsx`
- `src/app/components/HygieneSubNav.tsx`
- `src/app/components/HygieneCategoryCard.tsx`
- `src/app/components/HygieneReviewCard.tsx`
- `src/app/components/DuplicateMergeModal.tsx`
- `src/app/lib/hygiene.ts` (shared types + client helpers)

**Edited**
- `src/app/AppRouter.tsx` (3 new routes)
- `src/app/AppLayout.tsx` (Hygiene nav item)
- `src/app/pages/AppSettings.tsx` (Hygiene Settings section)
