import React, { useState } from "react";
import { Sliders, RotateCcw, ChevronDown } from "lucide-react";
import type { ChaosTuning } from "@/hooks/useChaosPhysics";
import { DEFAULT_TUNING } from "@/hooks/useChaosPhysics";

type Props = {
  tuning: ChaosTuning;
  onChange: (patch: Partial<ChaosTuning>) => void;
  onReset: () => void;
  /** Optional secondary reset (e.g. put nodes back). */
  onResetPositions?: () => void;
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
      <span className="font-mono text-[10px] text-amber tabular-nums">{fmt ? fmt(value) : value.toFixed(1)}</span>
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
 * Compact tuning panel for the chaos physics — drag impulse, ripple falloff,
 * spring stiffness. Collapses to a single chip on mobile.
 */
export const ChaosTuner: React.FC<Props> = ({
  tuning,
  onChange,
  onReset,
  onResetPositions,
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
              label="Drag impulse"
              value={tuning.dragImpulse}
              min={0}
              max={20}
              step={0.5}
              hint="How hard a drag shoves neighboring bubbles."
              onChange={(v) => onChange({ dragImpulse: v })}
            />
            <Row
              label="Ripple falloff"
              value={tuning.rippleRadius}
              min={40}
              max={500}
              step={10}
              hint="Reach of the ripple — smaller radius = more focused chaos."
              onChange={(v) => onChange({ rippleRadius: v })}
              fmt={(v) => `${v.toFixed(0)}px`}
            />
            <Row
              label="Spring-back"
              value={tuning.springStiffness}
              min={2}
              max={80}
              step={1}
              hint="How fast bubbles snap back to their orbit."
              onChange={(v) => onChange({ springStiffness: v })}
            />
            <Row
              label="Damping"
              value={tuning.damping}
              min={0.5}
              max={15}
              step={0.5}
              hint="Higher = calms fast; lower = keeps oscillating."
              onChange={(v) => onChange({ damping: v })}
            />
            <Row
              label="Edge bounce"
              value={tuning.edgeBounce}
              min={0}
              max={0.95}
              step={0.05}
              hint="0 = stick to edge, 0.9 = rubber-ball bounce."
              onChange={(v) => onChange({ edgeBounce: v })}
              fmt={(v) => v.toFixed(2)}
            />
          </div>

          <div className="mt-3 pt-3 border-t border-amber/20 flex gap-2">
            <button
              type="button"
              onClick={onReset}
              className="flex-1 flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-sm border border-border/60 hover:border-amber/60 hover:text-amber font-mono text-[10px] uppercase tracking-widest transition-colors"
            >
              <RotateCcw className="w-3 h-3" />
              Defaults
            </button>
            {onResetPositions && (
              <button
                type="button"
                onClick={onResetPositions}
                className="flex-1 px-2 py-1.5 rounded-sm border border-border/60 hover:border-amber/60 hover:text-amber font-mono text-[10px] uppercase tracking-widest transition-colors"
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
