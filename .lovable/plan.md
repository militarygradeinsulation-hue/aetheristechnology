## Goal

Give reps a real lead workflow inside the portal (claim, touch, status, upload/download CSVs), track every login/activity, and let the admin scrape ideal-customer leads that get pushed into the shared rep pool.

## 1. Database (new migration)

**`rep_activity`** — every login + meaningful action
- `id uuid pk`, `rep_code text`, `rep_name text`
- `event text` ('login' | 'lead_claim' | 'lead_touch' | 'lead_status' | 'lead_upload' | 'lead_download' | 'tool_open')
- `meta jsonb`, `ip text`, `user_agent text`, `created_at timestamptz`
- Index on `(rep_code, created_at desc)`.

**`rep_leads`** — the shared lead pool reps work
- `id uuid pk`
- `business_name text`, `contact_name text`, `email text`, `phone text`, `website text`, `industry text`, `location text`, `notes text`
- `source text` ('admin_scrape' | 'rep_upload' | 'admin_manual')
- `score int` (admin/AI fit score 0–100, nullable)
- `claimed_by_code text` nullable, `claimed_at timestamptz`
- `status text` default `'new'` — one of: new, outreach, touched, replied, meeting, won, lost, dead
- `last_touched_at timestamptz`, `touch_count int default 0`
- `created_by_code text` nullable (set when a rep uploaded), `created_at`, `updated_at`
- Index on `(claimed_by_code, status)` and `(status, created_at desc)`.

**RLS:** both tables service-role only. All reads/writes go through edge functions that verify the portal HMAC token (so reps can only see/modify what's permitted by the function logic).

## 2. Edge functions (all gated by `_shared/portal-token.ts`)

- **`portal-activity`** — POST `{ event, meta? }` → inserts into `rep_activity`. Called by the client on login, tab switches, lead actions.
- **`portal-leads`** — single function, action-routed:
  - `list` — pool view (unclaimed) + "my leads" (claimed by current code), filterable by status.
  - `claim` — assigns lead to current rep_code if unclaimed.
  - `release` — unclaim.
  - `update_status` — change status, increments `touch_count`, sets `last_touched_at`.
  - `upload` — accepts parsed CSV rows, inserts as `source='rep_upload'`, `created_by_code=<me>`, auto-claimed to uploader.
  - `download` — returns CSV of caller's claimed leads (or admin-pushed pool, scoped to their view).
  - Every mutating action also logs to `rep_activity`.
- **`admin-scrape-leads`** — admin-PIN-gated wrapper around the existing `scrape-leads` flow that:
  1. Takes `{ industry, location, count }` (e.g. "HubSpot users in Indianapolis, 25").
  2. Uses Firecrawl search + Lovable AI Gateway (`google/gemini-2.5-flash-lite`) to build a list of ideal-customer prospects with a fit-score and "why this is a fit" note based on the Aetheris ICP (HubSpot users, mid-market, leak-audit fit).
  3. Inserts into `rep_leads` with `source='admin_scrape'`, `score`, leaving `claimed_by_code` null so reps can pull from the pool.

`scrape-leads` already exists for the drip campaign — we'll keep it untouched and add the new admin function so the rep pool is independent from the email drip system.

## 3. Portal UI changes (`src/pages/PortalPage.tsx`)

Add a new tab **"Leads"** (icon: Users) between "My Tools" and "AI Sales Coach". Three sub-views inside it:

```text
┌─ Leads ──────────────────────────────────────────────┐
│ [ Pool (admin pushed) ]  [ My Leads ]  [ Upload/CSV ]│
└──────────────────────────────────────────────────────┘
```

**Pool view** — table of unclaimed leads with score badge, "Claim" button. Filters: industry, location, score≥.

**My Leads view** — kanban-lite or table of claimed leads grouped by status (New → Outreach → Touched → Replied → Meeting → Won/Lost/Dead). Click a row to expand: status dropdown, notes textarea (autosaves), "Log a touch" button, "Release back to pool" link.

**Upload/Download view**
- Drop CSV (parsed client-side with PapaParse — already a common Lovable dep, will add if missing). Required columns: `business_name,email`. Optional: `contact_name,phone,website,industry,location,notes`. Preview first 5 rows, then "Upload N leads" → calls `portal-leads` action `upload`. Auto-claimed to uploader.
- "Download my leads (CSV)" button → calls `portal-leads` action `download`.
- Sample CSV template download (static).

### Activity tracking hooks

- On successful login (in `handleLogin`): call `portal-activity` with `event='login'`.
- On tab change: `event='tool_open'` with `meta={tab}`.
- On every lead action: handled server-side by `portal-leads`.
- Light client throttling: skip duplicate `tool_open` within 30s for the same tab.

## 4. Admin UI changes (`src/pages/AdminDashboard.tsx`)

Add a new "Lead Scraper" panel in the existing admin tool grid (or under the Reps section). Form:
- Industry (text), Location (default "Indianapolis, Indiana"), Count (5–50), "Push to rep pool" toggle (default on).
- "Run scrape" → calls `admin-scrape-leads`.
- Below: table of last 50 scraped leads with score, claimed-by, status. Column to manually push or delete.

Also add a small **"Rep Activity"** widget to the Reps panel (`RepPerformancePanel`):
- Per-rep: last login, leads claimed (7d / 30d), touches logged (7d / 30d), upload count, download count.
- Backed by a SQL view or aggregated query over `rep_activity` + `rep_leads`.

## 5. Files

**New**
- `supabase/migrations/<ts>_rep_activity_and_leads.sql`
- `supabase/functions/portal-activity/index.ts`
- `supabase/functions/portal-leads/index.ts`
- `supabase/functions/admin-scrape-leads/index.ts`
- `src/components/portal/LeadsBoard.tsx` (Pool + My Leads + Upload tabs)
- `src/components/portal/LeadCard.tsx`
- `src/components/admin/LeadScraperPanel.tsx`
- `src/components/admin/RepActivityPanel.tsx`
- `src/lib/portalLeads.ts` (typed client wrapper around `portal-leads` + `portal-activity`)

**Edited**
- `src/pages/PortalPage.tsx` — add Leads tab, activity hooks
- `src/pages/AdminDashboard.tsx` — add Lead Scraper + Rep Activity panels
- `.lovable/memory/features/rep-partner-portal.md` — document new tab + tracking
- `package.json` — add `papaparse` if not present

## 6. Open question

Right now anyone with a valid rep code can upload arbitrary leads and claim from the pool. **Should there be a max-claim cap (e.g. 25 active claimed leads per rep) so one rep can't sweep the entire pool?** I'd default to **25 active claimed** with auto-release after 30 days of no touch — but flag if you want different numbers.
