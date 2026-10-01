# Project Architecture Rules

- Writing identities use stable IDs and server-held prompt definitions so browser requests never become the source of truth for persona behavior.
- The Architect uses one bounded server policy builder with separate Nexus and post contexts; its complete source specification remains server-only for auditability.
- Golden Report social copy uses observed brand identity or the normalized target domain and keeps forensic findings private; contact names are not business identity, and saved posts are screened for outside-review voice.