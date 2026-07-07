import React, { useState } from "react";
import { Sliders, RotateCcw, ChevronDown, Zap } from "lucide-react";
import type { ChaosTuning } from "@/hooks/useChaosPhysics";
import { DEFAULT_TUNING } from "@/hooks/useChaosPhysics";

type Props = {
  tuning: ChaosTuning;
  onChange: (patch: Partial<ChaosTuning>) => void;
  onReset: () => void;
  /** Optional: put nodes back to their resting positions. */
  onResetPositions?: () => void;
  /** Optional: kick every node with a random impulse to test the current tuning. */
  onShake?: () => void;
  className?: string;
};

const Row: React.FC<{
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  hint: string;
  onChange: (v: number) => void;
  fmt?: (v: number) => string;
}> = ({ label, value, min, max, step, hint, onChange, fmt }) => (
  <div className="space-y-1">
    <div className="flex items-baseline justify-between gap-2">
      <span className="font-mono text-[10px] uppercase tracking-widest text-foreground/80">{label}</span>
      <span className="font-mono text-[10px] text-amber tabular-nums">{fmt ? fmt(value) : value.toFixed(2)}</span>
    </div>
    <input
      type="range"
      min={min}
      max={max}
      step={step}
      value={value}
      onChange={(e) => onChange(parseFloat(e.target.value))}
      className="w-full h-1.5 accent-amber cursor-pointer"
      aria-label={label}
    />
    <div className="font-mono text-[9px] text-foreground/50 leading-tight">{hint}</div>
  </div>
);

/**
 * Compact tuning panel for the chaos physics — intuitive controls that map to
 * stable spring/damping internals. Collapses to a single chip.
 */
export const ChaosTuner: React.FC<Props> = ({
  tuning,
  onChange,
  onReset,
  onResetPositions,
  onShake,
  className = "",
}) => {
  const [open, setOpen] = useState(false);

  return (
    <div className={`absolute top-2 right-2 z-50 ${className}`}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-sm border border-amber/40 bg-background/85 backdrop-blur-md font-mono text-[10px] uppercase tracking-widest text-amber hover:border-amber/70 hover:bg-amber/10 transition-colors"
        aria-expanded={open}
        aria-controls="chaos-tuner-panel"
      >
        <Sliders className="w-3 h-3" />
        Chaos tuning
        <ChevronDown className={`w-3 h-3 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div
          id="chaos-tuner-panel"
          className="mt-2 w-64 rounded-sm border border-amber/40 bg-background/95 backdrop-blur-md p-3 shadow-[0_20px_60px_-15px_rgba(0,0,0,0.7)] animate-fade-in"
        >
          <div className="space-y-3">
            <Row
              label="Push strength"
              value={tuning.dragImpulse}
              min={0}
              max={1.5}
              step={0.05}
              hint="How hard a fling shoves neighboring bubbles."
              onChange={(v) => onChange({ dragImpulse: v })}
            />
            <Row
              label="Ripple reach"
              value={tuning.rippleRadius}
              min={60}
              max={600}
              step={10}
              hint="How far the ripple travels from the bubble you're dragging."
              onChange={(v) => onChange({ rippleRadius: v })}
              fmt={(v) => `${v.toFixed(0)}px`}
            />
            <Row
              label="Ripple sharpness"
              value={tuning.rippleSharpness}
              min={0.4}
              max={3.5}
              step={0.1}
              hint="Low = wide/soft wave. High = tight punch near the drag."
              onChange={(v) => onChange({ rippleSharpness: v })}
            />
            <Row
              label="Return speed"
              value={tuning.returnSpeed}
              min={0.05}
              max={1}
              step={0.05}
              hint="How fast bubbles head home. Low = drifty, high = snappy."
              onChange={(v) => onChange({ returnSpeed: v })}
            />
            <Row
              label="Bounciness"
              value={tuning.bounciness}
              min={0}
              max={1}
              step={0.05}
              hint="0 = molasses (no overshoot). 1 = jelly (lots of wobble)."
              onChange={(v) => onChange({ bounciness: v })}
            />
            <Row
              label="Edge bounce"
              value={tuning.edgeBounce}
              min={0}
              max={0.95}
              step={0.05}
              hint="0 = sticks to edge. 0.9 = rubber-ball bounce."
              onChange={(v) => onChange({ edgeBounce: v })}
            />
          </div>

          <div className="mt-3 pt-3 border-t border-amber/20 grid grid-cols-3 gap-2">
            {onShake && (
              <button
                type="button"
                onClick={onShake}
                className="flex items-center justify-center gap-1 px-2 py-1.5 rounded-sm border border-amber/40 text-amber hover:bg-amber/10 font-mono text-[10px] uppercase tracking-widest transition-colors"
                title="Kick every bubble to test current tuning"
              >
                <Zap className="w-3 h-3" />
                Shake
              </button>
            )}
            <button
              type="button"
              onClick={onReset}
              className="flex items-center justify-center gap-1 px-2 py-1.5 rounded-sm border border-border/60 hover:border-amber/60 hover:text-amber font-mono text-[10px] uppercase tracking-widest transition-colors"
            >
              <RotateCcw className="w-3 h-3" />
              Defaults
            </button>
            {onResetPositions && (
              <button
                type="button"
                onClick={onResetPositions}
                className="px-2 py-1.5 rounded-sm border border-border/60 hover:border-amber/60 hover:text-amber font-mono text-[10px] uppercase tracking-widest transition-colors"
              >
                Recenter
              </button>
            )}
          </div>

          <div className="mt-2 font-mono text-[9px] text-foreground/45 text-center">
            Grab a bubble. Fling it. Watch the ripple.
          </div>
        </div>
      )}
    </div>
  );
};

export { DEFAULT_TUNING };
export default ChaosTuner;
