import React from "react";
import { AlertTriangle } from "lucide-react";

const FINDINGS = [
  { label: "Checkout Drop-off Anomaly", value: "-$84k/yr", tone: "text-crimson" },
  { label: "Pricing Page Clarity Gap", value: "-$42k/yr", tone: "text-amber" },
  { label: "Follow-up Failure Window", value: "-$16k/yr", tone: "text-amber" },
];

const SERIES = [6, 9, 8, 13, 15, 14, 19, 23, 22, 28, 33, 38];
const MONTHS = ["J", "F", "M", "A", "M", "J", "J", "A", "S", "O", "N", "D"];

/** Compact SVG area/bar chart showing cumulative leak growth. */
const LeakChart: React.FC = () => {
  const w = 320;
  const h = 96;
  const max = Math.max(...SERIES);
  const pts = SERIES.map((v, i) => {
    const x = (i / (SERIES.length - 1)) * (w - 8) + 4;
    const y = h - 10 - (v / max) * (h - 24);
    return [x, y] as const;
  });
  const line = pts.map(([x, y], i) => `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`).join(" ");
  const area = `${line} L${pts[pts.length - 1][0].toFixed(1)},${h - 6} L${pts[0][0].toFixed(1)},${h - 6} Z`;
  const barW = (w - 8) / SERIES.length - 6;

  return (
    <div>
      <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-24" role="img" aria-label="Monthly revenue leak trend">
        <defs>
          <linearGradient id="leakFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="hsl(var(--amber))" stopOpacity="0.35" />
            <stop offset="100%" stopColor="hsl(var(--amber))" stopOpacity="0" />
          </linearGradient>
        </defs>
        {[0.25, 0.5, 0.75].map((g) => (
          <line
            key={g}
            x1="4"
            x2={w - 4}
            y1={h - 10 - g * (h - 24)}
            y2={h - 10 - g * (h - 24)}
            stroke="hsl(var(--border))"
            strokeDasharray="2 4"
          />
        ))}
        {SERIES.map((v, i) => {
          const x = (i / (SERIES.length - 1)) * (w - 8) + 4;
          const bh = (v / max) * (h - 24);
          return (
            <rect
              key={i}
              x={x - barW / 2}
              y={h - 6 - bh}
              width={barW}
              height={bh}
              rx="1.5"
              fill="hsl(var(--foreground))"
              opacity={i === SERIES.length - 1 ? 0.28 : 0.1}
            />
          );
        })}
        <path d={area} fill="url(#leakFill)" />
        <path d={line} fill="none" stroke="hsl(var(--amber))" strokeWidth="2" strokeLinejoin="round" />
        <circle
          cx={pts[pts.length - 1][0]}
          cy={pts[pts.length - 1][1]}
          r="3.5"
          fill="hsl(var(--crimson, var(--amber)))"
          stroke="hsl(var(--background))"
          strokeWidth="1.5"
        />
      </svg>
      <div className="mt-1 flex justify-between font-case text-[8px] uppercase text-muted-foreground/70">
        {MONTHS.map((m, i) => (
          <span key={i}>{m}</span>
        ))}
      </div>
    </div>
  );
};


/** Minimal case-file preview card used in the hero. Illustrative sample output. */
export const CaseFilePreview: React.FC = () => (
  <div className="relative w-full rounded-xl border border-border bg-card/50 backdrop-blur-md p-6 shadow-2xl overflow-hidden">
    <div className="absolute top-0 left-1/2 -translate-x-1/2 w-3/4 h-px bg-gradient-to-r from-transparent via-amber/40 to-transparent" />

    <div className="flex items-center justify-between border-b border-border pb-4 mb-5">
      <div className="flex items-center gap-3">
        <span className="h-2 w-2 rounded-full bg-amber animate-pulse" />
        <span className="font-case text-[10px] uppercase tracking-widest text-muted-foreground">
          Case // 491-B
        </span>
      </div>
      <span className="font-case text-[10px] uppercase tracking-wider text-muted-foreground">
        Status: <span className="text-foreground">Analyzing</span>
      </span>
    </div>

    <div className="grid grid-cols-2 gap-4 mb-6">
      <div className="rounded-lg border border-border bg-secondary/40 p-4">
        <p className="font-case text-[10px] uppercase text-muted-foreground mb-1">Exposure Range</p>
        <p className="font-display text-2xl text-foreground">$142k - $218k</p>
      </div>
      <div className="rounded-lg border border-border bg-secondary/40 p-4">
        <p className="font-case text-[10px] uppercase text-muted-foreground mb-1">Evidence Confidence</p>
        <p className="font-display text-2xl text-foreground">High</p>
      </div>
    </div>

    <div className="mb-6 rounded-lg border border-border bg-secondary/30 p-4">
      <div className="flex items-center justify-between mb-3">
        <p className="font-case text-[10px] uppercase text-muted-foreground">Leak Trend (12 mo)</p>
        <p className="font-case text-[10px] uppercase text-crimson">Compounding</p>
      </div>
      <LeakChart />
    </div>

    <div className="space-y-3">
      <p className="font-case text-[10px] uppercase text-muted-foreground">Highest-Priority Findings</p>
      {FINDINGS.map((f) => (
        <div
          key={f.label}
          className="flex items-center justify-between rounded bg-secondary/40 px-3 py-2.5 border border-border/50 hover:border-border transition-colors"
        >
          <span className="flex items-center gap-2">
            <AlertTriangle size={14} className={f.tone} />
            <span className="text-sm text-foreground">{f.label}</span>
          </span>
          <span className="font-case text-xs text-muted-foreground">{f.value}</span>
        </div>
      ))}
    </div>

    <p className="mt-5 font-case text-[10px] uppercase tracking-widest text-muted-foreground/70">
      Sample output. Your report uses your own numbers.
    </p>
  </div>
);

export default CaseFilePreview;
