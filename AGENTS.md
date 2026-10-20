# Project Architecture Rules

- Writing identities use stable IDs and server-held prompt definitions so browser requests never become the source of truth for persona behavior.
- The Architect uses one bounded server policy builder with separate Nexus and post contexts; its complete source specification remains server-only for auditability.
- Golden Report social copy uses observed brand identity or the normalized target domain and keeps forensic findings private; contact names are not business identity, and saved posts are screened for outside-review voice.
- Admin quotes are read/written only through the admin-quotes function with the admin token, and the server recomputes totals with a byte-identical copy of the client quote math, so saved totals cannot drift from what was shown.
- Golden Report generation is a protected cost boundary. Drip, cron, bounce replacement, and background prospecting must never invoke forensic-scan-all. Do not derive scan targets from contact email domains. Any future automated report generation requires explicit owner approval, a hard budget/circuit breaker, verified company URL, duplicate reuse, and regression coverage. (Why: automatic drip scans drained AI credits on 2026-10-05.)
