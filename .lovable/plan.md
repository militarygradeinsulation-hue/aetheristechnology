## Goal

Cut the wall-of-text feel on the highest-traffic pages by pairing each section with a forensic case-file infographic. Image carries the message; a short summary sits beside it. Long-form copy stays available but condensed.

## Scope (this round)

**Home page** (`src/components/Hero.tsx`, `src/components/LeakAuditMethod.tsx`, `src/components/VerifiableOutcomes.tsx`, `src/components/ThePitch.tsx`)
**Leak Audit page** (`src/pages/LeakAuditPage.tsx`)
**Methodology page** (`src/pages/MethodologyPage.tsx` — 6 sections)

Other pages (Services, About, Industries, Credentials) — deferred to a follow-up round once we lock the pattern.

## Infographic set (10 images)

All generated via existing `generate-content-image` edge function (already locked to the brand palette + Aetheris watermark). Style chosen per topic:

| # | Page / Section | Style | Subject |
|---|---|---|---|
| 1 | Home Hero — "Your business is leaking" | `noir_object` | Cracked pipeline gauge dripping crimson onto charcoal desk |
| 2 | Home — Leak Audit Method (7 steps) | `blueprint` | Isometric 7-stage pipeline blueprint, one stage breach-flagged |
| 3 | Home — Verifiable Outcomes | `data_macro` | Terminal screen, before/after revenue rows, one row crimson-underlined |
| 4 | Home — The Pitch | `case_file` | Manila folder labeled "CASE #001 — REVENUE LEAK" with redaction bars |
| 5 | Leak Audit page hero | `autopsy_diagram` | Business-process autopsy with 7 amber annotation arrows |
| 6 | Methodology §1 "What is a leak" | `autopsy_diagram` | Sales funnel cross-section with measurable gap highlighted |
| 7 | Methodology §2 "Baseline measurement" | `data_macro` | 12-month CRM data export with sample layers labeled |
| 8 | Methodology §3 "Attribution" | `blueprint` | Pre/post measurement diagram, same metric tagged on both sides |
| 9 | Methodology §4 "Scope" | `isometric` | Split diagram — "IN SCOPE" amber zone vs "OUT OF SCOPE" graphite zone |
| 10 | Methodology §6 "Deliverables" | `case_file` | Stack of deliverables: report, CSV appendix, quote sheet |

Images stored in `content-images` bucket, URLs pasted directly into components (no runtime generation on page load).

## Layout pattern

Two-column on desktop, stacked on mobile, inside the existing `forensic-tile`:

```text
+--------------------------------------------------+
|  [ INFOGRAPHIC ]   | CASE · 03                   |
|                    | Headline (Fraunces)         |
|   square, ~480px   | 2–3 line summary (Inter)    |
|                    |                             |
|                    | [Read full detail ▾]        |
+--------------------------------------------------+
```

- Image: `aspect-square`, `rounded-sm`, amber border on hover.
- Summary: capped at ~280 characters.
- Full text moved into a collapsible `<details>` so it stays indexable for SEO but is hidden by default.

## Steps

1. **Generate the 10 images** — one script call per image to `generate-content-image` with the prompts above, save the returned URLs to a small constants file `src/lib/infographics.ts`.
2. **Build `<ForensicInfographic>`** component (`src/components/ForensicInfographic.tsx`) — props: `image`, `caseNumber`, `title`, `summary`, `fullText?`. Handles the two-column layout + collapsible.
3. **Wire into Home sections** — replace existing tile bodies in Hero, LeakAuditMethod, VerifiableOutcomes, ThePitch with `<ForensicInfographic>`.
4. **Wire into Leak Audit page** — add hero infographic above the 7-step list.
5. **Wire into Methodology page** — wrap each of the 6 SECTIONS entries with `<ForensicInfographic>`, condensing the body[] arrays into a single summary string; original paragraphs go into `fullText`.
6. **QA pass** — screenshot Home, /leak-audit, /methodology at 1366px and mobile, verify alignment + readability.

## Notes

- No backend/data changes. Frontend + edge-function image generation only.
- Brand rules already enforced inside the edge function (charcoal/amber, crimson only for leak, watermark).
- If a generated image misses the brief, regenerate just that one — no need to redo the set.
- Other pages (Services, Industries, About, Credentials) — separate round after you approve the pattern on these three.
