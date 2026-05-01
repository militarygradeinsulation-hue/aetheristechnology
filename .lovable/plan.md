## Goal
Make every tile, thumbnail, and image card on the site feel like luxury hardware — premium glass shine, breathing amber halo, animated gradient borders, and a subtle Ken-Burns-style image drift on hover. No new emojis, no clutter — just motion and material quality.

## What changes

### 1. New CSS primitives in `src/index.css`

Add three reusable utilities that complement the existing `glass-shine`, `hover-lift`, and `shimmer-border`:

- **`.premium-tile`** — convenience class that bundles `glass + glass-shine + hover-lift + shimmer-border` plus a soft amber inner halo on hover.
- **`.thumb-frame`** — wraps `<img>` thumbnails. Adds:
  - Soft amber vignette overlay
  - Diagonal light sweep on hover (separate from card-level glass-shine, so both fire)
  - Slow Ken-Burns drift on hover (`scale + translate` over 1.2s)
  - Top-edge gradient hairline that lights amber on hover
- **`.amber-corner`** — pseudo-element corner brackets (top-left + bottom-right) that fade in on hover. Reinforces the forensic case-file aesthetic on premium cards.

All animations respect `prefers-reduced-motion`.

### 2. `src/components/FreeTools.tsx` — Capability Demonstration tiles
- Swap card class to `premium-tile` (replaces current `glass hover:glass-shine hover-lift` chain).
- Wrap thumbnail `<img>` in a `thumb-frame` div for the sweep + Ken-Burns + vignette.
- Add `amber-corner` brackets to each card.
- Tighten arrow-CTA: amber underline reveal on hover instead of just gap-shift.

### 3. `src/components/CaseFileCard.tsx` — Field Report case files
- Add `glass-shine hover-lift shimmer-border` to the existing card.
- The two existing cross-hair corner brackets stay (already on-brand). Add subtle hover state that brightens them to full amber.
- Add a faint horizontal scanline gradient at the top edge that pulses on hover (forensic monitor feel).

### 4. `src/components/LeakAuditMethod.tsx` — Leak Audit thumbnail
- The big thumbnail button gets `thumb-frame` treatment (sweep + Ken-Burns + vignette).
- Add `shimmer-border` so the amber border traces around it on hover — signals "this is interactive, click me."
- The 7-step cards inside the expanded grid get `premium-tile` treatment.

### 5. `src/components/VerifiableOutcomes.tsx` — Outcome cards
- Already uses `glass hover:glass-shine`. Upgrade to `premium-tile` for parity with FreeTools.
- Make the metric number (`{outcome.metric}`) glow softly on hover via amber text-shadow transition.

### 6. `src/components/WhatsWrongDiagnostic.tsx` — Category cards
- The 4 collapsible category cards get `glass-shine` added (currently plain `glass`).
- Selected/open state already glows; add `shimmer-border` so the amber traces around the active one continuously.

## Technical notes
- All new utilities live in `src/index.css` under `@layer utilities` inside the existing `prefers-reduced-motion: no-preference` block.
- No new dependencies, no token changes — uses existing `--amber-glow` and `--shadow-lift`.
- Ken-Burns drift uses `transform: scale(1.06) translate(-1%, -1%)` over 1.2s ease-out, returning over 0.5s on mouse-leave.
- All hover effects are GPU-only (`transform`, `opacity`, `box-shadow`) — no layout thrash.
- Crimson is preserved strictly for leak signals (CaseFileCard `$ amount bled`, `ACTIVE` stamps) — none of the new shine introduces crimson.

## Out of scope
- No copy changes.
- No layout/structure changes — purely material/motion polish.
- No changes to the Hero (already has its own treatment).