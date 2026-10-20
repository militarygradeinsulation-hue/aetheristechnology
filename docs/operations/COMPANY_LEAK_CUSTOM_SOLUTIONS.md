# Company Leak Check → Individual Solutions → Private Golden Report

## Public flow
1. Visitor enters a **public business URL** (canonicalized to lowercase host without `www` or paths), chooses their annual revenue band, completes 14 fixed questions, and provides an email. No payment or customer report is generated.
2. `company-leak-audit` stores the FIRST valid assessment in `aetheris_company_audit_cases`, keyed by a unique domain. This is a **frozen baseline**: later valid questionnaires for the same domain reuse its recommendations and price snapshot, even if the latest inputs differ. Submissions themselves are retained privately for staff review. Unverified answers are not presented as proven findings.
3. The user sees a ranked list of directional problems, fixes and 12 individual services priced using the commissions catalog. Recommendations are selected automatically; the user can select anything, remove anything, and see separate one-time and monthly totals.
4. A price selection is an **estimate / request for scope**, not an online checkout or a guarantee of ROI. Sales confirms scope and payment terms.

## Private forensic generation
- On the first company assessment, a privileged server-only dispatch invokes the existing `forensic-scan-all` function with `private_intake: true`, without returning `scan_id` or any Golden Report object to the browser.
- The existing forensic worker stores its report in `forensic_scans` and automatically archives completed reports via `golden-report-library`. They appear in the existing admin company-search library.
- `forensic-scan-all` GET returns 404 for `private_intake` reports without a valid **admin token** even if a scan UUID is known.
- Database row and lead submission tables use RLS with service-role grants only, not anon/authenticated grants.
- **Cost protection:** PostgreSQL serializes scan claims and allows at most three new full Golden Report dispatches per UTC day, with one per company. Subsequent tests never trigger a rescan. Cases exceeding the daily cap receive internal status `limited` and need staff review/requeue; they do **not** consume extra scan credits.
- Best-effort per-IP submission threshold of eight per rolling day (hash only, no IP stored in plaintext).
- Generated reports are private team material; public recommendation objects contain no report payload, raw private findings, archive URL, or scan UUID.

## Deployment requirement
Merging GitHub changes does **not by itself** apply Supabase database migrations or deploy edge functions to Lovable Cloud. Release in order:
1. Apply `supabase/migrations/20261014231000_aetheris_private_company_audit.sql`.
2. Deploy updated `forensic-scan-all` with the new private-report flag enforcement, and new `company-leak-audit` function.
3. Publish web frontend from the merged GitHub branch / Lovable connected deployment.
4. As staff, submit one test company, confirm only the custom recommendations and priced selections appear to the visitor, and verify the backend scan finishes in Golden Report Library. Repeat with different answers for the same domain and confirm same recommendations and saved prices and no new scan. Confirm an unauthenticated GET to `forensic-scan-all?id=<private UUID>` returns 404.
5. Confirm a fourth distinct domain in one UTC day is rate limited without a costly scan; staff can manually review the status and requeue after capacity resets.

**Operational warning:** full forensic jobs invoke Lovable AI and crawler services. Costs are bounded but not zero. Do not enable unlimited anonymous scanning without stronger identity verification and billing controls.

## Deliberate constraints
- Recommendations are frozen from the self-assessment, **not** based on an unreleased Golden Report. Internal operators can use the Golden Report to independently validate the recommendations before offering paid work.
- Anonymous domain ownership is not verified; a malicious or inaccurate first submission can establish a bad baseline. Reset of a company baseline requires internal staff intervention. Production hardening should add email ownership verification or explicit staff review before a baseline is treated as authoritative.
- Company-customized selection is **not a binding statement of work**, and the existing admin quoting POS remains the source of issued quotations and discounts.
