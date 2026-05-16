# Premium Navbar Redesign

## The problem
The current navbar throws four button styles at the user simultaneously: red pill (Leak Audit), yellow pill (Premium Tech Suite, Careers), amber pill (Home), and gray pill (everything else). It reads like a stoplight, not a forensics firm. No element earns priority — every link is shouting.

## The fix: one rail, one CTA
A premium operator nav has three tiers, not four colors:

1. **Logo** — anchors the brand (unchanged).
2. **Nav links** — a single quiet, unified row. No filled buttons. Subtle underline-on-hover, amber-on-active. Reads as type, not as UI chrome.
3. **One CTA on the right** — the only filled, amber button in the bar: **"Book the Diagnostic"**. This is what we want every visitor to click.

The Leak Audit gets a small forensic micro-tag treatment (case-file mono label, no pill), keeping its priority without competing with the CTA.

## Visual spec

```text
┌──────────────────────────────────────────────────────────────────────┐
│  [LOGO]   Home  Methodology  Industries  About  Field Notes  …      │
│                                                  [ Book Diagnostic ] │
└──────────────────────────────────────────────────────────────────────┘
       ↑ scroll → glass blur + thin amber hairline on bottom edge
```

- **Bar background:** transparent at top, `glass` (backdrop blur + 1px amber/15 hairline border-bottom) once scrolled.
- **Nav links:** `text-foreground/80`, `text-sm`, `tracking-wide`, `font-medium`. Hover: `text-amber` + animated underline (the existing `story-link` utility — 2px amber bar that wipes from right to left on hover, 300ms). Active route gets a permanent thin amber underline.
- **"The Leak Audit" link:** rendered as a JetBrains Mono micro-label `CASE · LEAK AUDIT` in amber, `text-[10px] uppercase tracking-[0.2em]`, with a 1.5px amber left bar. Forensic, not loud.
- **Primary CTA button (right-aligned):** `Book Diagnostic` in solid amber, black text, `font-bold`, `rounded-md` (not pill), subtle 1px amber-glow shadow on hover (`shadow-[0_10px_30px_-12px_hsl(var(--amber)/0.6)]`), `-translate-y-0.5` lift.
- **Spacing:** more generous gap between links (`gap-7`), larger horizontal padding on the bar.
- **Mobile:** sheet panel keeps the same hierarchy — quiet text links, single amber CTA pinned to bottom.

## Why this is "premium"

- Restraint. One color (amber), used once for the action that matters.
- Typography does the work, not button chrome.
- Hairline borders and micro-labels signal forensic / editorial (Bloomberg, FT, Linear, Stripe), not consultant-template.
- Removes the yellow/red/amber/gray collision that currently competes with the hero.

## Files changed

- `src/components/Navbar.tsx` — replace the per-item `tone` pill variants with a unified link style + single right-aligned amber CTA. Keep all routes, click tracking, logo-tap staff entry, mobile menu, sticky CTA bar, and the careers-context hiding logic intact.

No new components, no design-token changes, no other files touched.

