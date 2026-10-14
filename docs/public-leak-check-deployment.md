# Aetheris public Leak Check rollout

The public website code is maintained in GitHub. Editing or merging code does **not** guarantee the Lovable-hosted site has deployed, and it does **not** apply Supabase schema migrations or deploy Supabase Edge Functions.

## Visitor behavior

- The homepage primary CTA and nav lead to `/leak-audit/self-scan`, not the team-only Golden Report.
- The current free flow asks for a public company website, a revenue band, 14 operational responses and contact email.
- When `company-leak-audit` is available, the endpoint persists a company-level recommendation baseline, returns the frozen individual service catalog, and optionally queues an internal Golden Report under a database-enforced limit.
- When the endpoint is **unavailable or returns an error**, the browser calculates the same deterministic recommendations locally and displays a conspicuous **unsaved preview**. It does not claim contacts were saved or that a private scan was queued. The quote mailto and a separate booking link remain usable.
- Neither path takes a payment or promises verified recovered revenue.

## Required backend deployment (separate from GitHub)

1. Verify the correct Aetheris Supabase project and take a migration backup.
2. Apply `supabase/migrations/20261014231000_aetheris_private_company_audit.sql`.
3. Apply `supabase/migrations/20261014233500_private_golden_daily_cap_hardening.sql`. Never skip this second migration: it keeps failed or timed-out dispatches within the private Golden Report daily cost cap.
4. Deploy `company-leak-audit` with its `verify_jwt = false` configuration; it uses the service role **only on the server**.
5. Deploy the updated `forensic-scan-all` code if the private-intake changes from PR #10 are not already live.
6. Keep `SUPABASE_SERVICE_ROLE_KEY` and any scan-provider credentials out of browser code and public logs.
7. Have the owner approve the private scan budget before enabling that server pathway. The existing database claim limits starts to three daily attempts, and this hardening counts failed dispatch attempts too. No automated retries should be introduced.

## Manual release verification

- Confirm Lovable has synchronized the GitHub `main` commit and the published website points to that version.
- On mobile and desktop, click the homepage button and the navigation's free CTA; both must open the 14-question assessment.
- In staging, simulate the assessment endpoint returning an error. The user should receive local, explicitly unsaved results with a quote selection and a working booking fallback. No Golden Report should run in this case.
- In a controlled backend test, confirm that company follow-up submissions reuse the original recommendations and individual prices; do not let a later visitor overwrite the initial baseline.
- With owner-approved test budget only, verify authorized private scans stay private and daily claims never exceed three, including timed-out dispatches.
- Confirm the `/leak-audit/self-scan` canonical URL, `Aetheris Technology` page titles, seven-level pricing, homepage structured data and sitemap.
- Re-run Google Search Console URL Inspection after publication. Indexing, search ranking and lead conversion are not guaranteed by code changes.

## Operational notes

The two Indianapolis specialty landing pages are `/indianapolis/contractor-follow-up` and `/indianapolis/service-business-lead-tracking`. They make no claims about specific customers or verified losses. LinkedIn outreach, Google Business Profile, Maps listings and advertising require separate owner action; GitHub code cannot perform those external account tasks.
