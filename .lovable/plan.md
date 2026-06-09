## Goal
Replace text-heavy sections with editorial forensic imagery. Cut copy ~40% (mid-aggressive). Mix three styles per fit: **Case File photographic** for evidence/proof, **Editorial illustration** for concept/argument, **Forensic diagrams** for process/method.

## Visual style rules (all images)
- Dark charcoal background, amber spot color, crimson reserved for "leak/bleed" signal
- Fraunces/JetBrains Mono captions baked into image where appropriate
- "Aetheris AI Studio" watermark bottom-right
- Generated via `imagegen--generate_image` (premium for any image with text, fast otherwise)
- Saved as `src/assets/editorial/*.jpg` (or .png when transparent)

## New images to generate (12 total)

**Home** (`src/assets/editorial/`)
1. `home-leak-anatomy.jpg` — Forensic diagram: business as cross-section building with amber dollar signs bleeding crimson out of 7 labeled fissures. Replaces wordy intro of `LeakAuditMethod`.
2. `home-3areas-triptych.jpg` — Editorial illustration triptych: Sales / Ops / Brand as three forensic specimen jars on a steel table, each tagged. Replaces text columns in `ThreeAreas`.
3. `home-pitch-evidence.jpg` — Case File photo: manila folder open, redacted invoice + magnifier + crimson "ACTIVE" stamp. Replaces paragraph stack in `ThePitch`.
4. `home-whyus-operator.jpg` — Editorial: lone operator silhouette at CRT terminal, amber glow, mono captions "12 yrs · 47 audits · 1 verdict". Replaces bullet list in `WhyUs`.

**Methodology** (the 7-step Leak Audit)
5–11. `method-step-1.jpg` … `method-step-7.jpg` — 7 forensic diagram tiles, one per step (Intake, Trace, Map, Quantify, Verdict, Plug, Verify). Each is a clean isometric/blueprint with a single mono label. Replaces bulky paragraph per step with image + 1-line caption.

**Services / Solutions**
12. `services-diagnostic-vs-retainer.jpg` — Editorial split-panel: left = "$2,500 Diagnostic" autopsy table, right = "$15k Retainer" ongoing surveillance wall. Replaces feature bullet lists in `PackageTiers`.

**Industries** — reuse existing `industry-*.jpg` photos; add one overlay treatment component instead of new files.

## Code changes (presentation only)

- `src/components/LeakAuditMethod.tsx` — lead with image #1, cut intro paragraph to 1 sentence, keep 7 steps but each becomes `icon → 1-line label` (no body copy).
- `src/components/ThreeAreas.tsx` — replace 3 text cards with image #2 + 3 short captions under image.
- `src/components/ThePitch.tsx` — image #3 left, ≤3-line value claim right, single CTA.
- `src/components/WhyUs.tsx` — image #4 hero, replace bullets with 3 mono stat chips.
- `src/pages/MethodologyPage.tsx` — replace each step block with image #5–11 + caption + one-line outcome. Remove redundant "what we look for" paragraphs.
- `src/components/PackageTiers.tsx` — image #12 at top, condense feature lists from 6–8 bullets to 3 per tier.
- `src/pages/IndustriesPage.tsx` — add a `CaseFileOverlay` treatment on existing industry photos (manila tab, redaction bar, crimson "ACTIVE LEAK" stamp) so each card reads as a case file instead of a stock photo with paragraph.
- `src/pages/VerticalLandingPage.tsx` — same overlay + trim hero copy to headline + one sentence; convert "common leaks" paragraph to 3-icon row.

## Out of scope (this pass)
- No new routes, no backend, no copywriting on blog/CRM/portal
- No changes to navigation, footer, or pricing logic
- Won't touch `Hero.tsx` (already image-led with `hero-leak.mp4`)

## QA
After generation, view each image at 1024px and verify: watermark present, crimson only on leak signals, no broken typography. Then preview Home, Methodology, Services, Industries pages on mobile (374px) and desktop.
