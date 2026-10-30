<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

## Architecture rules

- All diagnostic logic lives in `src/lib/xray/` as pure TypeScript (no React, no Date/random in the engine) — keeps it deterministic, testable and reusable by future integrations.
- Components only render; figures come from `computeAssessment()` — prevents UI-side math drifting from the documented method.
- Every non-customer number lives in `src/lib/xray/assumptions.ts` with bounds and an explanation — assumptions must stay reviewable and editable.
- The engine must return "insufficient"/"not_applicable" rather than guessed values, and must never emit VERIFIED evidence — the free scan is self-reported only.
- Opportunity components must measure distinct things and be summed once; anything overlapping is scored, not priced — avoids double-counting.
- State is in-memory only (`store.ts`); no localStorage, cookies, network, analytics or backend in v1 — privacy-first promise.
- Fonts are self-hosted via @fontsource — the app makes no external network requests.
- Brand copy, tiers and the enquiry email live in `src/config/site.ts` — single place to edit.
- Paid-service enquiries go only through a customer-opened `mailto:` draft — no automated purchase or payment links.
- Engine changes require tests in `src/lib/xray/*.test.ts` and a bump of `ENGINE_VERSION` when outputs change.