## Add forensic infographics to remaining Home page tiles

### Images to generate (12 total, all square forensic case-file style with "Aetheris AI Studio" watermark)

**Hero 3 mini-tiles** (small icons, ~512x512):
1. `hero-what-we-do.jpg` — Stethoscope on a CRM dashboard, amber leak indicators
2. `hero-what-we-look-for.jpg` — Magnifying glass over a sales funnel with crimson drip points
3. `hero-what-you-get.jpg` — Stack of forensic report binders with amber tab

**Diagnostic 3 steps** (small icons, ~512x512):
4. `diagnostic-map.jpg` — Topographic map overlay on CRM data, leak points marked
5. `diagnostic-quantify.jpg` — Calculator + ledger with crimson dollar tally
6. `diagnostic-roadmap.jpg` — Sequenced repair checklist with amber priority flags

**Sample Case Files 3 cards** (small icons, ~512x512):
7. `case-47-gmail.jpg` — Overflowing Gmail inbox, unread leads, crimson "$380K" stamp
8. `case-62-proposals.jpg` — Stack of priced proposals, "NO FOLLOWUP" stamp
9. `case-74-bottleneck.jpg` — Bottleneck diagram, owner icon choking the funnel

**Standalone feature tiles** (larger ~1024x1024):
10. `home-ai-gurus.jpg` — Snake-oil bottles labeled "AI", one crossed out with amber stamp
11. `home-ai-operator.jpg` — AI agents inside a CRM running diagnostics, not a slide deck
12. `home-resume-forensics.jpg` — Resume document under forensic light with fit-score gauge

### Code changes

- **`src/lib/infographics.ts`** — register all 12 new entries
- **`src/components/Hero.tsx`** — add small square image (aspect-square, w-full, rounded-sm, amber border) above each of the 3 mini tiles
- **`src/pages/Home.tsx`**:
  - Diagnostic steps: add small image above each step card
  - Sample case files: pass image into `CaseFileCard` (extend component prop)
  - AI-gurus tile: refactor into `ForensicInfographic` two-column with image left, copy/CTAs right
  - AI-native operator tile: same treatment, image right / copy left (alternating)
  - Resume Forensics tile: same treatment
- **`src/components/CaseFileCard.tsx`** — add optional `image` prop rendered as a top thumbnail
- **`src/components/ForensicInfographic.tsx`** — already exists, reuse; add an `align="left"|"right"` prop if not present for alternating layouts (currently confirmed supported from prior round)

### Notes
- No backend changes. Pure frontend + asset generation.
- All images use `imagegen` with brand prompt wrapper (dark charcoal #1a1a1a bg, amber #d4a017 accents, crimson #c4302b reserved for leak signals only, JetBrains Mono micro-labels, "Aetheris AI Studio" watermark bottom-right).
- Mini-tile images use `aspect-square` thumbnail, full standalone tiles use ForensicInfographic two-column.
- Mobile: standalone infographics stack image-over-text; grid thumbnails remain square at full tile width.

### QA
After generation, visually inspect each image for: watermark present, no crimson misuse (only on leak signals), brand colors, no text errors. Regenerate any that miss.