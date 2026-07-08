## Goal

Give the careers page two clear paths ($40 test OR $100 instant license), make the public "Try tool" output look as polished as the admin/rep portal renderings, and make sure Easy Mode is a first-class buyable tool.

## 1. Careers page — two paths side by side

Edit `src/pages/CareersPage.tsx`:

- Replace the single "Buy the $40 certification test" gate card with a two-column gate:
  - **Path A — $40 Certification Test** (existing flow → `/careers/test`). Copy: "Prove it, then get placed."
  - **Path B — $100 Instant License** (new flow → `/careers/license`). Copy: "Skip the test. Get your rep code today. Sell every Aetheris tool at full commission without being an employee."
- Keep the "You belong here if / Don't waste your time" and reality-check blocks.
- Update final CTA to show both buttons.
- Update SEO/hero copy to mention both options.

## 2. New $100 Instant License flow

- Add Stripe price via `payments--create_price`: `careers_instant_license_v1`, one-time, $10000 (cents), USD, on the same product as the test fee.
- New page `src/pages/CareersLicensePage.tsx` (mirrors `CareersTestPage.tsx` payment shell):
  - Explains what the license grants: personal rep code, ability to sell every catalog tool + flagships, standard commission (see Core memory split), no test required, no employment relationship (1099 independent).
  - Embedded Stripe checkout using `create-checkout` with `priceId: 'careers_instant_license_v1'` and `metadata.purpose: 'careers_instant_license'`.
  - On return (`?session_id=…`): calls new edge function `verify-careers-license` which:
    1. Confirms Stripe session is paid.
    2. Inserts a `rep_codes` row (auto-generates a 6-char code, stores `email`, `name`, `active: true`, `source: 'instant_license'`).
    3. Returns the rep code + portal URL.
  - Success screen: shows the rep code, one-click copy, "Open your rep portal" button (routes to existing rep portal entry), and a note that a confirmation email is sent.
- New edge function `supabase/functions/verify-careers-license/index.ts` (verify_jwt=false, CORS, uses `createStripeClient`, inserts into `rep_codes` with service role, sends confirmation email via existing resend-based function pattern used by `verify-careers-test-payment`).
- Route wiring in `src/App.tsx`: `/careers/license` → `CareersLicensePage`.

## 3. Portal-grade public tool output

Edit `src/pages/TryToolPage.tsx` so the sandbox output visually matches the admin/rep case-file rendering (currently it's a plain prose block):

- Wrap the output in a "case file" shell: crimson `ACTIVE` stamp, mono header showing `// case_id`, tool name, timestamp, and a subtle scanline background — same forensic-tile aesthetic used in `LeakMindMap`.
- Split rendered markdown into card sections when the AI emits `## Heading` blocks: parse the markdown into H2 sections client-side and render each as its own bordered card with an amber section label, so long outputs read like a structured report instead of a wall of prose.
- Add a sticky action bar at the bottom of the output: "Buy this tool $40" and "Become a licensed rep $100" (routes to `/careers/license`).
- Add print-friendly styles (`@media print`) and a "Download as PDF" button using existing `html2pdf`-style pattern already used elsewhere in the repo (reuse whatever the diagnostic PDF export uses; if none, use `window.print()`).
- No changes to the edge function's prompts — presentation only.

## 4. Easy Mode as a featured tool

- Confirm `easy-mode` stays in `src/lib/tool-shop-catalog.ts` (it already is) and is surfaced on `HomeToolShopGrid` — if not pinned, mark it as a featured card at the top of the grid with copy: "One prompt. Full plan, calendar, assets, and next steps."
- Ensure `TRY_META['easy-mode']` (already present) and the `try-tool-sandbox` PROMPTS for `easy-mode` return the full structured report (Snapshot → 30-Day Plan → Assets → Next Actions). If the current prompt is thin, extend it to match the depth of `website-scanner`.
- Add an "Easy Mode" highlight tile on `CareersPage` under Path A/B: "New reps love this — one tool that does everything, easiest to demo and sell."

## Technical notes

- All money stays USD (`$`) per Core memory currency lock.
- `rep_codes` insert must include a `GRANT`-safe path via service role in the edge function; do not expose service role client-side.
- New edge function follows `supabase/config.toml` auto-behavior (verify_jwt=false), CORS shared headers, Zod input validation.
- No changes to admin/rep portals themselves — instant-license reps get a normal rep code and use the existing rep portal.

## Out of scope

- Changing commission structure for licensed reps (uses existing catalog split).
- Building a full rep onboarding wizard behind the license — they get code + portal access, everything else is the existing flow.
