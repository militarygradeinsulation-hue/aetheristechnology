import React from "react";
import { AlertTriangle } from "lucide-react";

const FINDINGS = [
  { label: "Checkout Drop-off Anomaly", value: "-$84k/yr", tone: "text-crimson" },
  { label: "Pricing Page Clarity Gap", value: "-$42k/yr", tone: "text-amber" },
  { label: "Follow-up Failure Window", value: "-$16k/yr", tone: "text-amber" },
];

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
        <p className="font-heading text-2xl text-foreground">$142k - $218k</p>
      </div>
      <div className="rounded-lg border border-border bg-secondary/40 p-4">
        <p className="font-case text-[10px] uppercase text-muted-foreground mb-1">Evidence Confidence</p>
        <p className="font-heading text-2xl text-foreground">High</p>
      </div>
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
