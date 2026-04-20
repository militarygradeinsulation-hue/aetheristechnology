

# Aetheris Design System — Colors, Typography & Style

This is the complete visual language used across the site. Sourced directly from `tailwind.config.ts`, `src/index.css`, and `mem://style/forensic-identity`.

---

## 1. Color Palette

All colors are stored as **HSL CSS variables** in `src/index.css` and exposed through Tailwind tokens (`bg-background`, `text-foreground`, `border-amber`, etc.). Never hardcode hex.

### Core surface tokens

| Token | HSL | Usage |
|---|---|---|
| `--background` | `220 15% 8%` | Page background — near-black charcoal |
| `--foreground` | `40 10% 92%` | Primary text — warm off-white |
| `--card` | `220 14% 12%` | Card surface |
| `--card-foreground` | `40 10% 92%` | Text on cards |
| `--popover` | `220 14% 10%` | Dropdowns, modals |
| `--surface-elevated` | `220 14% 14%` | Glass panels, elevated UI |
| `--surface-overlay` | `220 14% 10%` | Overlay backdrops |
| `--muted` | `220 12% 16%` | Subtle backgrounds |
| `--muted-foreground` | `220 10% 55%` | Secondary text, labels |
| `--border` | `220 12% 20%` | Default border |
| `--input` | `220 12% 20%` | Form input border |

### Brand accents

| Token | HSL | Usage |
|---|---|---|
| `--primary` / `--amber-glow` | `36 90% 55%` | **Amber** — primary CTAs, glows, highlights, brand accent |
| `--accent` | `36 70% 45%` | Deeper amber for hover/active states |
| `--ring` | `36 90% 55%` | Focus ring |
| `--secondary` | `220 12% 18%` | Neutral secondary buttons |

### Forensic signal — crimson (use sparingly)

| Token | HSL | Usage |
|---|---|---|
| `--crimson` | `0 65% 38%` | **Reserved exclusively for "leak" signals** — dollar bleeds, "ACTIVE" stamps, the word *leaking* |
| `--crimson-deep` | `0 70% 28%` | Crimson hover/depth |
| `--destructive` | `0 72% 51%` | Errors, destructive actions only |

**Crimson rule:** never use crimson decoratively. It signals revenue loss, active investigations, or critical alerts. Amber remains the brand color.

---

## 2. Gradients & Shadows

```
--gradient-primary: linear-gradient(135deg, hsl(36 90% 55%), hsl(40 85% 70%));
--gradient-glow:    linear-gradient(90deg, transparent, hsl(36 90% 55% / 0.3), transparent);

--shadow-glow:  0 0 20px hsl(36 90% 55% / 0.15), 0 0 60px hsl(36 90% 55% / 0.05);
--shadow-card:  0 10px 40px hsl(0 0% 0% / 0.5);
--shadow-lift:  0 20px 60px -10px hsl(36 90% 55% / 0.25), 0 10px 30px -10px hsl(0 0% 0% / 0.6);
```

Utility classes: `.glow-amber`, `.glow-text`, `.gradient-radial-amber`, `.text-gradient-amber`.

---

## 3. Typography

Four typefaces, each with a strict role.

| Token | Family | Use |
|---|---|---|
| `font-body` | **Inter** (300/400/500/600) | All body copy, UI, forms |
| `font-display` | **Space Grotesk** (300–700) | Default headings (h1–h6), navigation, buttons |
| `font-forensic` | **Fraunces** serif (400–700, opsz 9–144) | Autopsy headlines, case-file titles, dossier copy — forensic moments only |
| `font-case` | **JetBrains Mono** (400/500/600) | Case-file micro-labels, "CASE FILE #047", eyebrow tags, status stamps |

Headings default to Space Grotesk via a global rule in `src/index.css`. Switch to `font-forensic` for forensic content; switch to `font-case` (uppercase, tracked-wide, small) for forensic micro-labels.

**Forensic typographic pattern:**
```
font-case text-[10px] uppercase tracking-widest text-amber  ← micro-label
font-forensic text-3xl md:text-4xl font-bold text-foreground ← headline
font-body text-base text-muted-foreground                    ← supporting copy
```

---

## 4. Layout & Shape

- **Border radius:** `--radius: 0.75rem` → `rounded-lg`. Modifiers `rounded-md` (`-2px`), `rounded-sm` (`-4px`).
- **Container:** centered, `2rem` padding, max-width `1400px` at 2xl.
- **Spacing rhythm:** Tailwind defaults; sections typically `py-10` to `py-20`.

---

## 5. Glass & Motion Utilities

Defined in `src/index.css`:

- `.glass` — translucent elevated surface with backdrop blur and 0.5 border opacity
- `.glass-hover` — adds amber halo + border tint on hover
- `.glass-shine` — diagonal amber shine sweep on hover
- `.hover-lift` — tactile rise (`-6px translateY`) + amber lift shadow
- `.shimmer-border` — animated amber gradient border, fades in on hover
- `.cursor-glow` — radial amber glow that follows the cursor (CTAs)
- `.animate-float-slow` — 7s gentle vertical float
- `.animate-glow-pulse` — 3.5s breathing amber glow
- `.animate-pulse-glow` — drop-shadow amber pulse
- `.animate-shimmer-in` — entrance animation (blur + rise)
- `.text-float` — floating heading with soft amber text-shadow

All motion respects `prefers-reduced-motion: reduce` — continuous animations disable, hover state-changes still fire.

Tailwind keyframes: `fade-in` (10px rise), `scale-in` (0.96 → 1), `accordion-down/up`.

---

## 6. Forensic Field Kit Components

The brand-defining visual pattern. Used on `CaseFileCard.tsx`, leak callouts, autopsy posts.

**Anatomy:**
- `font-case` micro-header: `CASE FILE #047` (top-left)
- Status stamp top-right: amber border `SEALED` or crimson border `ACTIVE`
- `font-forensic` subject line
- Body copy in `font-body`
- Dollar bled: `font-forensic text-3xl font-bold text-crimson tracking-tight`
- Corner cross-hair details: `border-t border-r border-amber/40` (top-right), `border-b border-l` (bottom-left)
- `glass` surface, `border-border/60`

---

## 7. Image & Asset Rules

- All AI-generated images carry **"Aetheris AI Studio"** watermark, bottom-right.
- Photography: dark, high-contrast, never bright/sunny stock.
- Icons: `lucide-react` only, `text-amber` or `text-muted-foreground`.

---

## 8. Forbidden

- No bright/light backgrounds (white, pastels, light gray)
- No purple/teal/pink accents — amber is the only brand color
- No crimson used decoratively — leak signal only
- No serif fonts outside `font-forensic` forensic moments
- No emoji in UI copy
- No generic AI-guru gradients (purple→pink, teal→cyan)
- No social proof popups, testimonial carousels, or floating purchase nudges
- No hard-coded color hexes — always tokens

---

## TL;DR

**Colors:** Charcoal background `220 15% 8%`, warm off-white text `40 10% 92%`, amber primary `36 90% 55%`, crimson signal `0 65% 38%` (leaks only).
**Type:** Inter body, Space Grotesk headings, Fraunces forensic serif, JetBrains Mono case-file labels.
**Feel:** Dark forensic dossier — glass surfaces, amber glow, crimson where blood is.

