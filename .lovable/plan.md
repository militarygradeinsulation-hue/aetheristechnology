## Goal

Make `ServicesPricing` (the main pricing grid on `/services` and Home) feel premium by using your 5 uploaded infographic visuals as the hero thumbnail for the matching package — instead of just a small icon and text.

## Mapping (uploaded image → service)

| Upload | Service title in `ServicesPricing.tsx` |
|---|---|
| `file_0000000054f071fda30f63b1879f801e.png` | Friction Vocabulary Audit ($79) |
| `file_0000000083b471fd97abdc9caaf08fd0.png` | Custom Implementation ($25,000+) |
| `file_000000009fe871fda6da0369c81f9884.png` | Brand Contradiction Finder ($119) |
| `file_00000000dca071fdb001ffdb18fb4b2f.png` | Strategic Question Engine ($99) |
| `file_00000000ddc871fdadce399623009150.png` | 14-Day Diagnostic ($2,900) |

The other 6 services (Fractional CTO/CMO, Strategic Discovery Audit, Website Evaluation, etc.) keep the current icon-only treatment until you provide visuals for them.

## Steps

1. **Save assets** — copy the 5 uploads into `src/assets/packages/` with clean names:
   - `friction-vocabulary-audit.png`
   - `custom-implementation.png`
   - `brand-contradiction-finder.png`
   - `strategic-question-engine.png`
   - `fourteen-day-diagnostic.png`

2. **Add a `thumbnail` field** to the matching 5 entries in the `services` array in `src/components/ServicesPricing.tsx` (imported via `@/assets/packages/...`).

3. **Render the thumbnail on the tile** — when a service has a `thumbnail`, replace the current icon+title row with a top hero image:
   - Full-width image with `aspect-[4/3]` at the top of the card (rounded top corners, no padding).
   - Image uses `object-cover` with a subtle dark gradient overlay at the bottom for text legibility.
   - Title overlays the bottom-left of the image in white.
   - Price, success stat, and footer hint stay where they are below the image.
   - Tiles without a thumbnail keep the existing icon layout — grid stays uniform via `h-full` and consistent card padding.

4. **Render the thumbnail in the expanded modal** — show the same image as a hero banner across the top of the modal (above the existing icon/title block, or replacing it for these 5 services). Keeps the premium "product packshot" feel when users click in.

5. **Performance** — use `loading="lazy"` and `decoding="async"` on the thumbnail `<img>` tags. Files are PNG ~1.3MB each at full resolution; that's acceptable since only 5 exist and they're lazy-loaded, but I'll keep them as-is unless you want me to also export WebP versions.

## Out of scope (ask if you want)
- Generating matching infographics for the remaining 6 services
- Replacing the Home-page service grid (`Services.tsx`) with the same thumbnails
- Converting PNGs to WebP for smaller payload