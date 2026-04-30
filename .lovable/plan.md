## What this does

You said "17,000 leads I uploaded" — there's no file in this chat, but the backend already mirrors **194,398 HubSpot contacts** (174,494 with email). That's the source. We'll:

1. Import them into `rep_leads` (the shared pool the reps already see)
2. Drip-release them to the 11 active reps on a daily cap (you set the number)
3. Run the Indianapolis scraper on a schedule to keep adding fresh net-new leads

No rep ever sees the full pool dump — they only see what's been released to them that day.

---

## How it works for the rep

```text
Rep logs in → Portal → "Leads" tab → "My Queue"
  ┌─────────────────────────────────────────┐
  │  TODAY'S DROP (8 new)                   │
  │  ─────────────────────                  │
  │  Acme Plumbing — Indianapolis           │
  │  Score 87 · why fit: 12 employees, ...  │
  │  [Claim] [Skip]                         │
  │  ...                                    │
  └─────────────────────────────────────────┘
  Active claimed: 14 / 25
```

Each rep gets **N leads/day** (you pick — default 10) auto-assigned to them as a soft hold for 24h. They claim or skip. Skipped ones go back to the pool. Won/lost/dead don't count against their 25-active cap.

---

## How it works for you (admin)

New "**Lead Pipeline**" panel in admin:

- **Pool stats**: Total, unassigned, dripped-but-unclaimed, claimed, worked, dead
- **Drip controls**: Daily-per-rep cap, ICP filter (Indianapolis-only toggle, industries, has-email required, exclude HubSpot lifecycle = customer/opportunity)
- **One-click "Import HubSpot Contacts"**: Pulls eligible mirror_contacts → rep_leads (idempotent on hubspot_id)
- **Scraper schedule**: ON/OFF + frequency (daily 6am ET default), Indianapolis SMB ICP

---

## Technical implementation

### 1. Schema additions (migration)

Add to `rep_leads`:
- `external_id text` (e.g. `hubspot:12345`) + unique index — prevents dupes on re-import
- `assigned_to_code text` + `assigned_at timestamptz` + `assignment_expires_at timestamptz` — soft drip hold (24h)
- `lifecycle_stage text`, `lead_status text` — copied from HubSpot for filtering

New table `lead_drip_settings` (singleton):
- `daily_per_rep int default 10`
- `enabled boolean default true`
- `require_email boolean default true`
- `indianapolis_only boolean default true`
- `excluded_lifecycle_stages text[] default '{customer,opportunity}'`
- `scraper_enabled boolean default true`
- `scraper_frequency text default 'daily'`

### 2. Backfill: HubSpot mirror_contacts → rep_leads

Edge function `admin-import-hubspot-leads` (admin-passcode protected):
- Reads `mirror_contacts` in batches of 1,000
- Filters: `email IS NOT NULL`, lifecycle NOT IN excluded list, `last_activity_date < now() - 30d` OR null (avoid stealing active deals)
- Maps to `rep_leads`:
  - `business_name` ← properties->>'company'
  - `contact_name` ← first_name + last_name
  - `email`, `phone` ← properties->>'phone'
  - `location` ← properties->>'city/state'
  - `industry` ← properties->>'industry'
  - `external_id` ← `'hubspot:' + hubspot_id`
  - `source` ← `'hubspot_import'`
  - `score` ← computed (Indianapolis +30, has phone +10, recent activity +20, has company +20)
- Returns `{ inserted, skipped, total_eligible }`. Run multiple times safely.

### 3. Daily drip job

Edge function `cron-drip-leads`, scheduled via pg_cron at 6am ET daily:

```text
For each active rep:
  current_active = rep_leads where claimed_by_code=rep AND status NOT IN (won,lost,dead)
  if current_active >= 25: skip
  needed = daily_per_rep - count(assigned to rep with non-expired hold)
  if needed <= 0: skip
  pull `needed` unassigned, unclaimed leads, ORDER BY score DESC
  set assigned_to_code, assignment_expires_at = now()+24h
```

Plus a sweep step: any `assignment_expires_at < now()` and not claimed → release back to pool.

### 4. Portal updates

`portal-leads` edge function — add view `view: "drip"` returning leads assigned to that rep where hold not expired. Claim action becomes "accept" (clears expiry, sets claimed_by_code).

`LeadsBoard.tsx` — add **"Today's Drop"** sub-tab as default view, badge with count, accept/skip buttons. Existing Pool/Mine tabs stay.

### 5. Scheduled Indianapolis scraping

Wrap existing `admin-scrape-leads` in a daily pg_cron job. ICP locked to:
- Geography: Indianapolis metro (Marion, Hamilton, Hendricks, Johnson counties)
- Revenue band: $1M–$50M
- Industries: services, healthcare, manufacturing, professional services, contractors
- Target: 50 net-new leads/day

Scraped leads get `source='firecrawl_indianapolis'` and feed the same drip queue.

### 6. Admin UI: `LeadPipelinePanel.tsx`

Replaces the bare-bones scraper panel. Sections:
- Stats grid (6 cards)
- Drip settings form (sliders + toggles, saves to `lead_drip_settings`)
- "Import from HubSpot" button → calls import function, shows progress
- "Run scraper now" button (manual trigger)
- Recent activity feed: imports, drips, claims

---

## Files

**New:**
- `supabase/migrations/<ts>_lead_drip_pipeline.sql`
- `supabase/functions/admin-import-hubspot-leads/index.ts`
- `supabase/functions/cron-drip-leads/index.ts`
- `src/components/admin/LeadPipelinePanel.tsx`

**Edited:**
- `supabase/functions/portal-leads/index.ts` — add drip view + accept action
- `supabase/functions/admin-scrape-leads/index.ts` — lock Indianapolis ICP defaults
- `src/components/portal/LeadsBoard.tsx` — Today's Drop tab
- `src/pages/AdminDashboard.tsx` — swap LeadScraperPanel for LeadPipelinePanel
- `src/lib/portalLeads.ts` — drip + accept helpers

---

## Open question (will assume defaults if you don't answer)

- **Daily drop per rep**: defaulting to **10/day**. With 11 reps that's 110/day → the 174K pool lasts ~4 years. If you want faster burn (e.g. 25/day), say so.
- **Initial seed**: I'll skip the auto-pre-fill on day one. Reps wake up tomorrow morning to their first drop. If you want to seed everyone with 10 immediately on deploy, say so.
