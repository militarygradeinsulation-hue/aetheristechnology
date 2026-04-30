# Forecast Center — Company Portal Live Daily Briefing

A new dashboard inside the partner-only **Company Portal** tab that delivers a fresh daily intelligence briefing: tip of the day, trending tech, trending industry shifts, and trending Indianapolis SMB target companies — each with a *why* and source citations.

## What the user sees

A new card stack at the top of the **Company Portal** tab (`tab === 'company'`), titled **"Forecast Center — Daily Intel Briefing"** with a date stamp + "Refreshed Xh ago" + manual Refresh button.

Four sections, each in a dark/amber forensic-styled card:

1. **Tip of the Day** — One actionable operator tip pulled from Aetheris methodology + current trends (e.g. "HubSpot just shipped X — reps should pivot pitch to Y").
2. **Tech Trends** — 3-4 bullets on what's moving in AI/CRM/automation this week, each with a 1-line "why it matters for us."
3. **Industry Shifts** — 3-4 trending plays in Indianapolis SMB verticals (roofing, HVAC, dental, med spa, law, SaaS, etc.) with concrete signal + dollar/risk rationale.
4. **Target Companies** — 5-8 trending Indianapolis-area SMBs ($1M-$50M) worth pursuing right now. Each card shows: company name, website, industry, a **factual signal** ("hiring 12 sales reps", "raised Series A", "expanded second location"), the **why-go-after** (leak hypothesis), and a "Push to Lead Pool" button that drops them into `rep_leads`.

Loading skeletons + an empty state with a "Generate today's briefing" CTA if cache is empty.

## How it works

**Daily generation, cached for 24h** — single AI run per day shared across all partner sessions.

```text
[Cron 6am ET]            [On-demand if cache empty/stale]
       |                                |
       v                                v
  edge: forecast-generate-daily  <----  partner clicks Refresh
       |
       v
  Firecrawl search (industry/tech queries, Indy SMB signals)
       +
  Lovable AI (gemini-2.5-pro, web-grounded reasoning, tool calling)
       |
       v
  forecast_briefings table (date, tip, tech[], industry[], companies[])
       |
       v
  edge: portal-forecast (read-only, gated by partner HMAC token)
       |
       v
  ForecastCenter.tsx renders cards
```

Push-to-pool reuses the existing `rep_leads` insert path via a new `portal-forecast` action `push_lead` (partner-only).

## Technical details

**New table** `forecast_briefings`:
- `id uuid pk`, `briefing_date date unique`, `tip jsonb`, `tech jsonb`, `industry jsonb`, `companies jsonb`, `sources jsonb`, `generated_at timestamptz`, `model text`
- Service-role only, no RLS exposure to clients.

**New edge functions**:
- `forecast-generate-daily` — Service-role. Pulls last 7 days of `rep_leads`/`contact_submissions` for context, runs Firecrawl search (`tbs: 'qdr:w'`) on ~5 query buckets, then `google/gemini-2.5-pro` with `report_briefing` tool call to extract structured `{ tip, tech[], industry[], companies[] }`. Each `companies[]` entry: `{ name, website, industry, location, signal, why, source_url }`. Upserts on `briefing_date`.
- `portal-forecast` — Verifies partner HMAC token. Actions: `get_today` (returns latest briefing, triggers generate if stale > 20h), `regenerate` (partner-only, force refresh), `push_lead` (insert into `rep_leads` with `source: 'forecast:<date>'` and `external_id: <website>`).

**Cron** (separate SQL via insert tool, not migration): `pg_cron` job at 11:00 UTC daily → `net.http_post` to `forecast-generate-daily`.

**Frontend**:
- New component `src/components/portal/ForecastCenter.tsx` — fetches via `supabase.functions.invoke('portal-forecast', { body: { action: 'get_today' }, headers: { 'x-portal-token': token }})`.
- Embed it at top of the `tab === 'company'` block in `src/pages/PortalPage.tsx` above the existing AI-coach hint card.
- Cards use existing dark/amber tokens (`text-amber`, `border-amber/30`, `bg-card/50`), Fraunces serif for section titles, JetBrains Mono for `SIGNAL`/`WHY` micro-labels — consistent with forensic identity.
- Source links open in new tab with `ExternalLink` icon. Each company card has a `Crosshair` "Push to Lead Pool" button → toast confirmation.

**AI prompt anchors**:
- System: "You are the Aetheris Forecast Operator. Surface what changed in the last 7 days that affects an Indianapolis SMB consulting firm selling Leak Audits + AI ops. Every claim must cite a source URL. Companies must be real, ≤$50M revenue, located in Indiana."
- Tool schema enforces required fields incl. `source_url` per item — no hallucinated companies pass schema validation.

**Secrets** — all already configured: `LOVABLE_API_KEY`, `FIRECRAWL_API_KEY`, `SUPABASE_SERVICE_ROLE_KEY`.

## Files to create / edit

Create:
- `supabase/migrations/<ts>_forecast_briefings.sql`
- `supabase/functions/forecast-generate-daily/index.ts`
- `supabase/functions/portal-forecast/index.ts`
- `src/components/portal/ForecastCenter.tsx`
- `src/lib/portalForecast.ts` (thin client wrapper)

Edit:
- `src/pages/PortalPage.tsx` — mount `<ForecastCenter />` in the `company` tab.

Schedule cron via `supabase--read_query`-adjacent insert tool after deploy.

## Out of scope (for v1)
- Per-rep personalization (everyone sees the same daily briefing).
- Editable/dismissable items.
- Historical archive UI (data is stored, just not browsed yet — easy follow-up).
