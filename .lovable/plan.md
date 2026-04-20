

## Coin-spin logo on hover

Add a 3D Y-axis rotation to the Architect logo in the hero — triggered on mouse hover (and tap on mobile). Spins like a coin flipping.

### Implementation

**File:** `src/components/Hero.tsx`

Wrap the existing `<img>` in a perspective container and add a `coin-spin` utility class that triggers a full 360° `rotateY` on hover. Single 1.2s ease-in-out rotation per hover; if the user keeps hovering, it rests until they leave + re-enter (clean, not annoying). On tap (mobile), the same animation fires via `:active`.

```tsx
<div className="[perspective:1000px] inline-block">
  <img
    src={architectLogo}
    alt="The Architect — Aetheris Business Forensics Operator badge"
    className="w-40 md:w-52 h-auto rounded-full shadow-2xl coin-spin cursor-pointer"
    loading="eager"
  />
</div>
```

**File:** `src/index.css`

Add inside `@layer utilities`, gated by `prefers-reduced-motion: no-preference`:

```css
@keyframes coin-flip {
  0%   { transform: rotateY(0deg); }
  100% { transform: rotateY(360deg); }
}

.coin-spin {
  transform-style: preserve-3d;
  backface-visibility: visible;
  transition: filter 0.4s ease;
}

.coin-spin:hover,
.coin-spin:active {
  animation: coin-flip 1.2s cubic-bezier(0.4, 0, 0.2, 1);
  filter: drop-shadow(0 0 24px hsl(var(--amber-glow) / 0.45));
}
```

Reduced-motion users get the amber glow only — no rotation.

### Files touched
- `src/components/Hero.tsx` — wrap img in perspective div, add `coin-spin` class
- `src/index.css` — add `coin-flip` keyframe + `.coin-spin` utility

### Validation
- Hover the logo on desktop → one clean 360° flip with amber glow.
- Tap on mobile → same flip fires.
- `prefers-reduced-motion: reduce` → glow only, no spin.
- Zero impact on layout, surrounding hero copy, or other components.

