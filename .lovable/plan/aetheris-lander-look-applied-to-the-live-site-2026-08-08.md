# Aetheris Lander Look, Applied to the Live Site

Port the visual language of the `Aetheris-Lander` repo (dark minimal, generative amber hero, floating glass navbar, mono case-file labels) onto the real website, starting with the home page, and wire it to the real routes and data already in this project.

## What changes

### 1. Design tokens (minimalist palette)
Add the lander palette as semantic tokens in `src/index.css` / `tailwind.config.ts` so no component hardcodes hex:
- background `#0F0F14`, surface `#14141A`, elevated `#1A1A24`, border `#2A2A35`
- foreground `#EAE7E1`, muted `#9B978E`, amber accent `#D9821F` (hover `#F09936`)
- crimson `#B31C1C` stays reserved for leak signals only (existing rule)
Typography stays Space Grotesk headings + JetBrains Mono micro-labels, which the lander already assumes.

### 2. Hero
New `AnomalousMatterHero` component ported from the repo: Three.js icosahedron with a Perlin-noise vertex shader lit in amber, lazy-loaded and mounted behind the headline, with a static gradient fallback for reduced-motion and WebGL-less devices. Requires adding the `three` dependency.

### 3. Floating navbar
Port the resizable navbar: transparent at top, shrinks into a blurred pill on scroll, mono uppercase links, mobile sheet menu. Wired to the real site nav (Leak Audit, Golden Report, Blog, Free Business Guides, Careers, Partners) plus real CTAs: Client Portal and Start Free Scan (Golden Report), not the repo's placeholder anchors.

### 4. Home page recomposition (`/` = LeakLanderPage)
Rebuild the page in the lander's minimalist rhythm: large quiet sections, thin dividers, no gradient noise, generous whitespace.
- Hero with the generative scene plus the live Case File Preview card (case number, exposure range, evidence confidence, top findings) fed by real language from the Golden Report model rather than fixed demo numbers where available.
- How It Works: the existing 3-step process (free scan, show the leaks, build the recovery system).
- What We Find: compact grid of leak categories.
- Evidence: the existing evidence-confidence framing.
- Case Files: existing `RealCaseStudiesSection`, restyled to the lander card treatment.
- Pricing: existing `TierLadder` (Free through Active Case), restyled, no new pricing content.
Sections and offers already on the home page are kept; only their presentation changes.

### 5. Consistency pass
Apply the navbar, footer treatment, and token set to the highest-traffic public pages so the site does not feel half-skinned: Revenue Leak Audit, Partners, Careers, Resources, Blog. No copy or business logic changes on those pages.

## Technical notes
- Add `three` (and `@types/three`); hero is code-split via `React.lazy` so the Three.js bundle never blocks first paint.
- Port `anomalous-matter-hero.tsx`, `resizable-navbar.tsx`, and `AetherisLogoSymbol.tsx` into `src/components/lander/`, converted to the project's token classes instead of inline hex.
- Existing shadcn `card`/`avatar` are reused; the repo copies are not imported.
- Motion respects `prefers-reduced-motion`; the canvas pauses when offscreen.
- SEO head, structured data, and all existing routes/CTAs on the home page are preserved.

## Out of scope
- No pricing, commission, or Golden Report logic changes.
- No changes to portals, admin, or edge functions.
