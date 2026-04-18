
Goal: Layer in tasteful, performant motion across the site so text "floats", glass tiles shimmer/hover, and scrolling feels alive — without breaking the existing dark/amber aesthetic or the forbidden UX rules (no popups, no fake social proof).

## What I'll add

### 1. New global animation primitives (`src/index.css` + `tailwind.config.ts`)
- **`animate-float-slow`** — gentle 8s Y-axis drift for headings/hero text ("floating words")
- **`animate-shimmer`** — diagonal light sweep across glass tiles (uses existing amber gradient)
- **`animate-glow-pulse`** — soft amber halo that breathes
- **`.glass-shine`** utility — adds a `::before` pseudo-element with an animated diagonal highlight (the "glass shine" you want on tiles)
- **`.hover-lift`** utility — translate-Y + shadow on hover for tactile feel
- **`.text-float`** utility — applies `animate-float-slow` + subtle text-shadow shimmer
- **`.shimmer-border`** — animated gradient border that slowly rotates around glass cards

### 2. New scroll-reactive component: `src/components/ParallaxTilt.tsx`
- Wraps any tile; tracks scroll position via `useScroll` + `useTransform` (framer-motion, already installed)
- Tiles gently translateY/rotateX as the user scrolls past — gives the "hovering" feeling
- Respects `prefers-reduced-motion`

### 3. Upgrade existing `RevealOnScroll.tsx`
- Add optional `variant` prop: `'fade-up' | 'float' | 'shimmer-in' | 'scale-glow'`
- Stagger children when used as a list wrapper

### 4. Apply across high-impact surfaces (no behavior changes, just motion)
- **`Hero.tsx`** — H1 gets `.text-float` per-line (split spans), CTA buttons get `.hover-lift` + `animate-glow-pulse` on the primary
- **`ThreeAreas.tsx`**, **`ServiceCapabilities.tsx`**, **`FreeTools.tsx`** — wrap each tile in `ParallaxTilt`; add `.glass-shine` + `.shimmer-border`
- **`ServicesPricing.tsx` / `Services.tsx`** — apply `.glass-shine` + `.hover-lift` to the tiles (keeps the click-to-expand modal intact from last task)
- **`WhatsWrongDiagnostic.tsx`** result cards — shimmer-in reveal
- **Section headings sitewide** — `.text-float` on H2s inside a small helper

### 5. Cursor-reactive amber glow (subtle, opt-in)
- Add a `.cursor-glow` utility on key CTAs: a radial amber gradient follows the cursor inside the button (pure CSS via `--mx`/`--my` custom props set in a tiny mousemove handler)

## Performance & accessibility guardrails
- All animations use `transform` / `opacity` only (GPU-friendly)
- Wrap every new keyframe behind `@media (prefers-reduced-motion: no-preference)`
- No layout-shifting animations
- No new dependencies — uses existing `framer-motion` + Tailwind

## Files touched
- `src/index.css` (new utilities + keyframes)
- `tailwind.config.ts` (register new animations)
- `src/components/RevealOnScroll.tsx` (variants)
- `src/components/ParallaxTilt.tsx` (NEW)
- `src/components/Hero.tsx`
- `src/components/ThreeAreas.tsx`
- `src/components/ServiceCapabilities.tsx`
- `src/components/FreeTools.tsx`
- `src/components/ServicesPricing.tsx`
- `src/components/Services.tsx`
- `src/components/WhatsWrongDiagnostic.tsx`

## Out of scope
- Background canvas (you said it's perfect — leaving `Background.tsx` untouched)
- No changes to tool logic, Stripe, or library renderer
- No new third-party libs

<lov-actions>
<lov-suggestion message="Approved — implement the animation system, then I'll scroll through Home, Services, and Industries to confirm tiles shimmer, headings float, and nothing feels janky on the 1798px viewport.">Approve & implement</lov-suggestion>
<lov-suggestion message="Also add a subtle page-transition fade between routes so navigating between Home/Services/Industries feels seamless.">Add page transitions too</lov-suggestion>
<lov-suggestion message="Skip the cursor-reactive glow on buttons — keep the rest of the animation system but leave CTAs static.">Skip cursor-glow on CTAs</lov-suggestion>
</lov-actions><lov-plan>
Goal: Layer in tasteful, performant motion across the site so text "floats", glass tiles shimmer/hover, and scrolling feels alive — without breaking the dark/amber aesthetic or the forbidden UX rules (no popups, no fake social proof). Background canvas stays untouched.

## What I'll add

### 1. New global animation primitives (`src/index.css` + `tailwind.config.ts`)
- `animate-float-slow` — gentle 8s Y-axis drift for hero text ("floating words")
- `animate-shimmer` — diagonal light sweep across glass tiles
- `animate-glow-pulse` — soft amber halo that breathes on primary CTAs
- `.glass-shine` — `::before` pseudo-element with animated diagonal highlight (the "glass shine" on tiles)
- `.hover-lift` — translate-Y + amber shadow on hover for tactile feel
- `.text-float` — float animation + subtle text-shadow shimmer
- `.shimmer-border` — animated gradient border slowly rotating around glass cards

### 2. New scroll-reactive component: `src/components/ParallaxTilt.tsx`
- Wraps any tile; uses `useScroll` + `useTransform` from framer-motion (already installed)
- Tiles gently translateY/rotateX as user scrolls past — gives the "hovering" feel
- Respects `prefers-reduced-motion`

### 3. Upgrade `RevealOnScroll.tsx`
- Add `variant` prop: `'fade-up' | 'float' | 'shimmer-in' | 'scale-glow'`
- Optional stagger for child lists

### 4. Apply across high-impact surfaces (motion only, no behavior changes)
- **Hero.tsx** — H1 with `.text-float`, primary CTA with `animate-glow-pulse` + `.hover-lift`
- **ThreeAreas / ServiceCapabilities / FreeTools** — wrap tiles in `ParallaxTilt`, add `.glass-shine` + `.shimmer-border`
- **ServicesPricing / Services** — `.glass-shine` + `.hover-lift` on tiles (keeps the click-to-expand modal from last task intact)
- **WhatsWrongDiagnostic** result cards — shimmer-in reveal
- Section H2s sitewide — `.text-float`

### 5. Optional cursor-reactive amber glow on CTAs
- `.cursor-glow` utility: radial amber gradient follows cursor inside the button via `--mx`/`--my` CSS vars set by a tiny mousemove handler

## Performance & accessibility
- Transform/opacity only (GPU-friendly)
- All new keyframes gated behind `@media (prefers-reduced-motion: no-preference)`
- No layout shift, no new dependencies

## Files touched
- `src/index.css`, `tailwind.config.ts`
- `src/components/RevealOnScroll.tsx`
- `src/components/ParallaxTilt.tsx` (NEW)
- `src/components/Hero.tsx`
- `src/components/ThreeAreas.tsx`, `ServiceCapabilities.tsx`, `FreeTools.tsx`
- `src/components/ServicesPricing.tsx`, `Services.tsx`
- `src/components/WhatsWrongDiagnostic.tsx`

## Out of scope
- `Background.tsx` (you said it's perfect)
- Tool logic, Stripe, library renderer
- No new third-party libs

<lov-actions>
<lov-suggestion message="Approved — implement the animation system, then scroll through Home, Services, and Industries to confirm tiles shimmer, headings float, and nothing feels janky.">Approve & implement</lov-suggestion>
<lov-suggestion message="Also add a subtle page-transition fade between routes so navigating between pages feels seamless.">Add page transitions too</lov-suggestion>
<lov-suggestion message="Skip the cursor-reactive glow on buttons — keep the rest of the animation system but leave CTAs static.">Skip cursor-glow on CTAs</lov-suggestion>
</lov-actions>
