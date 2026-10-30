import { cn } from "@/lib/utils";
import type { DimensionScore } from "@/lib/xray/types";
import { BAND_LABEL, DIMENSION_LABEL } from "@/lib/xray/format";
import { EvidenceTag } from "./EvidenceTag";

const BAND_BAR: Record<DimensionScore["band"], string> = {
  low: "bg-band-low",
  moderate: "bg-band-moderate",
  high: "bg-band-high",
  insufficient: "bg-transparent",
};

export function ScoreBar({ score, band }: { score: number | null; band: DimensionScore["band"] }) {
  return (
    <div className="relative h-2 w-full bg-muted" role="img" aria-label={score === null ? "Insufficient information" : `${score} out of 100`}>
      {[33.3, 66.6].map((t) => (
        <span key={t} className="absolute top-[-3px] h-[14px] w-px bg-foreground/25" style={{ left: `${t}%` }} />
      ))}
      {score !== null && <div className={cn("h-full", BAND_BAR[band])} style={{ width: `${Math.max(2, score)}%` }} />}
    </div>
  );
}

export function FrictionMap({ scores, detailed = true }: { scores: DimensionScore[]; detailed?: boolean }) {
  return (
    <div className="grid gap-6">
      {scores.map((s) => (
        <div key={s.dimension} className="avoid-break">
          <div className="mb-2 flex items-baseline justify-between gap-3">
            <h3 className="font-display text-2xl leading-none">{DIMENSION_LABEL[s.dimension]}</h3>
            <p className="text-right">
              <span className="font-mono text-xl">{s.score === null ? "—" : s.score}</span>
              <span className="font-mono text-xs text-muted-foreground">/100</span>
              <span className="eyebrow block text-muted-foreground sm:ml-3 sm:inline">{BAND_LABEL[s.band]}</span>
            </p>
          </div>
          <ScoreBar score={s.score} band={s.band} />
          <div className="mt-1 flex justify-between font-mono text-[0.625rem] text-muted-foreground">
            <span>0 low</span>
            <span>moderate</span>
            <span>high 100</span>
          </div>
          {detailed && (
            <ul className="mt-3 divide-y divide-border border-y border-border text-sm">
              {s.signals.length === 0 && <li className="py-2 text-muted-foreground">Insufficient information — no usable answers for this area.</li>}
              {s.signals.map((sig) => (
                <li key={sig.label} className="flex items-center justify-between gap-3 py-2">
                  <span className="flex min-w-0 items-center gap-2">
                    <EvidenceTag kind="SELF_REPORTED" />
                    <span className="truncate">{sig.label}</span>
                  </span>
                  <span className="flex min-w-0 shrink items-center gap-3">
                    <span className="text-right text-muted-foreground">{sig.answer}</span>
                    <span className="w-8 text-right font-mono text-xs">{sig.score}</span>
                  </span>
                </li>
              ))}
            </ul>
          )}
          {detailed && s.limited && s.signals.length > 0 && (
            <p className="mt-2 text-xs text-muted-foreground">Based on a single signal — treat as indicative only.</p>
          )}
        </div>
      ))}
    </div>
  );
}