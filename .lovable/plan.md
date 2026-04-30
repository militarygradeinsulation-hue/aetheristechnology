## Add Web Scraper to Rep Portal (with Industry Preset Buttons)

Mirror the admin lead scraper into the rep portal so reps can hunt their own ICP-fit prospects on demand. Scraped leads land directly in the rep's "Today's Drop" workflow (24h soft hold, just like the admin drip), with the option to push to the shared pool instead.

### 1. New edge function: `supabase/functions/portal-scrape-leads/index.ts`

Same Firecrawl + Lovable AI pipeline as `admin-scrape-leads`, but:
- Auth via `verifyPortalToken` + `x-portal-token` (not admin token).
- Smaller cap: `count` clamped to 3–25 (admins can do 5–50).
- Default behavior: assigns the inserted leads to the rep's own `code` with `assignment_expires_at = now + 24h` (so they appear in **Today's Drop**).
- Optional `assign_to_me: false` body flag pushes to the shared pool instead.
- `source` field stamped as `rep_scrape:<rep_code>` for audit clarity.
- Logs a `scrape_leads` event to `rep_activity` with `{industry, location, count, inserted}`.
- Reuses existing `external_id` upsert dedup so reps can't double-claim the same business.

### 2. Update `src/components/portal/LeadsBoard.tsx`

Add a new sub-tab **"Hunt"** (Search icon) between "Lead Pool" and "My Leads":

```
[ Today's Drop ] [ Lead Pool ] [ Hunt ] [ My Leads ] [ Upload / Download ]
```

The Hunt panel contains:
- **Premade industry buttons** (chip row, click to set the input):
  - Roofing, HVAC, Dental, Med Spa, Law Firms, Accounting, Real Estate Brokerages, Auto Dealers, Home Services, Manufacturing, SaaS, Marketing Agencies
- **Industry input** (free-text, prefilled when a chip is clicked)
- **Location input** (defaults to `Indianapolis, Indiana`)
- **Count input** (3–25, default 10)
- **Toggle**: "Drop into my queue" (default ON) vs "Push to shared pool"
- **"Run scrape" button** → calls `portal-scrape-leads` via `supabase.functions.invoke` with `x-portal-token` header
- After success: toast `"Scraped N leads → Today's Drop"`, auto-switch to `drip` sub-tab and refresh

Reuses existing `getPortalToken()` from `@/lib/portalAuth` (already imported pattern is in `portalLeads.ts`).

### 3. Wire into existing types

No DB migration needed — `rep_leads` already has `assigned_to_code`, `assignment_expires_at`, `source`, and `external_id` from prior work. The `rep_activity` table already exists.

### Out of scope
- No new tables / RLS changes.
- No quota system on rep scrapes for now (we can add a daily cap later if reps abuse it).
- Admin scraper unchanged.
