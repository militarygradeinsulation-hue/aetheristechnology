import { useMemo, useState } from "react";
import { buildFrictionIntelligence, type FrictionLensId } from "../../supabase/functions/_shared/golden-friction-intelligence";
import type { ActiveFrictionSignal } from "../../supabase/functions/_shared/golden-friction-scan";
import { GoldenFrictionWorkspace } from "@/components/GoldenFrictionWorkspace";

const lensAccent: Record<FrictionLensId, string> = {
  operational: "text-blue-400",
  perceptual: "text-amber-400",
  human: "text-violet-400",
  economic: "text-emerald-400",
};

const lensNumber: Record<FrictionLensId, string> = {
  operational: "01",
  perceptual: "02",
  human: "03",
  economic: "04",
};

export function GoldenFrictionIntelligence({
  report, scanId, onInvestigate,
}: {
  report: unknown; scanId?: string;
  onInvestigate?: (prompt: string) => void;
}) {
  const [reviewedSignals, setReviewedSignals] = useState<ActiveFrictionSignal[] | null>(null);
  const model = useMemo(() => {
    const record = report && typeof report === "object" && !Array.isArray(report) ? report as Record<string, unknown> : {};
    return buildFrictionIntelligence(reviewedSignals ? {
      ...record, behavioral_friction_signals: reviewedSignals,
    } : record);
  }, [report, reviewedSignals]);

  return (
    <section aria-labelledby="golden-friction-title" className="space-y-4">
      <div className="flex flex-col gap-1">
        <div className="text-[10px] font-mono uppercase tracking-widest text-amber-500">
          Behavioral Friction Intelligence · Evidence-led
        </div>
        <h2 id="golden-friction-title" className="text-xl font-semibold font-forensic">
          Hidden Friction Analysis
        </h2>
        <p className="max-w-3xl text-sm text-muted-foreground">
          Four views of the same case file. These are investigation leads, not proven buyer motives,
          personnel diagnoses or additional dollar-loss claims.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {model.lenses.map(lens => (
          <article key={lens.id} className="rounded-lg border border-border bg-muted/20 p-4">
            <div className="flex items-center justify-between gap-2">
              <span className={`font-mono text-xs font-semibold ${lensAccent[lens.id]}`}>
                {lensNumber[lens.id]} · {lens.title}
              </span>
              <span className="text-[10px] uppercase tracking-wide text-muted-foreground">
                {lens.status === "source_linked"
                  ? "Source linked"
                  : lens.status === "review_required" ? "Review required" : "Not evaluated"}
              </span>
            </div>
            <p className="mt-2 text-sm text-foreground/85">{lens.question}</p>
            <p className="mt-3 text-xs text-muted-foreground">
              {lens.opportunities.length
                ? `${lens.opportunities.length} investigation ${lens.opportunities.length === 1 ? "lead" : "leads"}`
                : "Insufficient evidence in this report. This is not a clean bill of health."}
            </p>
          </article>
        ))}
      </div>

      {model.opportunities.length ? (
        <div className="space-y-3">
          <h3 className="font-semibold text-base">Investigation queue</h3>
          {model.opportunities.map((item, index) => (
            <details key={item.id} className="rounded-lg border border-border bg-background/40 p-4">
              <summary className="cursor-pointer list-none">
                <div className="flex items-start gap-3">
                  <span className="mt-0.5 text-xs font-mono text-amber-500">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-semibold">{item.patternLabel}</div>
                    <div className="mt-1 text-xs text-muted-foreground">
                      {item.chapter} · {item.basis === "linked_claim" ? "Linked to report claims" : "Report statement, verify"}
                    </div>
                  </div>
                  <span className="text-xs font-mono text-amber-500">Inspect +</span>
                </div>
              </summary>
              <div className="mt-4 space-y-3 border-t border-border pt-4 text-sm">
                <div>
                  <div className="mb-1 text-[10px] font-mono uppercase tracking-wider text-muted-foreground">Recorded finding</div>
                  <p className="whitespace-pre-wrap">{item.observation}</p>
                </div>
                {item.evidence.length > 0 && (
                  <div>
                    <div className="mb-1 text-[10px] font-mono uppercase tracking-wider text-muted-foreground">Linked evidence</div>
                    <ul className="space-y-2">
                      {item.evidence.map(e => (
                        <li key={e.claimId} className="rounded border border-border/60 px-3 py-2 text-xs">
                          <p>{e.statement || "Source record linked; no excerpt available"}</p>
                          <p className="mt-1 text-muted-foreground">Evidence status: {e.status}</p>
                          {e.sourceUrl && (
                            <a className="mt-1 inline-block text-amber-500 underline underline-offset-2 break-all"
                              href={e.sourceUrl} target="_blank" rel="noopener noreferrer">
                              Review source
                            </a>
                          )}
                          {!e.sourceUrl && e.sourceLocator && <p className="mt-1 text-muted-foreground">Locator: {e.sourceLocator}</p>}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                <div>
                  <div className="mb-1 text-[10px] font-mono uppercase tracking-wider text-muted-foreground">Hypothesis, not a verified cause</div>
                  <p>{item.hypothesis}</p>
                </div>
                <div>
                  <div className="mb-1 text-[10px] font-mono uppercase tracking-wider text-muted-foreground">Small test to run</div>
                  <p>{item.test}</p>
                </div>
                <div>
                  <div className="mb-1 text-[10px] font-mono uppercase tracking-wider text-muted-foreground">Measure</div>
                  <p>{item.metric}</p>
                </div>
                {onInvestigate && (
                  <button type="button" onClick={() => onInvestigate([
                    "Investigate this Golden Report behavioral friction finding.",
                    "Recorded finding: " + item.observation,
                    "Evidence: " + item.evidence.map(e => e.statement + (e.sourceUrl ? " (" + e.sourceUrl + ")" : "")).join("; "),
                    "Hypothesis to TEST, not assume: " + item.hypothesis,
                    "Proposed test: " + item.test,
                    "Measurement: " + item.metric,
                    "Separate observed evidence from speculation. Give the exact steps, baseline needed, owner role and measurement method. Do not invent costs or psychological motives.",
                  ].join("\n"))}
                    className="inline-flex rounded border border-amber-500/50 bg-amber-500/10 px-3 py-2 text-xs font-semibold text-amber-500 hover:bg-amber-500/20">
                    Ask This Report to design the test
                  </button>
                )}
              </div>
            </details>
          ))}
        </div>
      ) : (
        <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-4 text-sm">
          This saved case file does not contain sufficient structured findings for behavioral classification.
          Review the evidence ledger or request internal data before assigning friction causes.
        </div>
      )}

      {scanId && (
        <GoldenFrictionWorkspace
          scanId={scanId}
          opportunities={model.opportunities}
          onActiveScan={setReviewedSignals}
        />
      )}

      <details className="rounded border border-border/70 p-3">
        <summary className="cursor-pointer text-xs font-semibold text-muted-foreground">
          Methodology and limitations
        </summary>
        <ul className="mt-3 list-disc space-y-1 pl-5 text-xs text-muted-foreground">
          {model.notes.map(note => <li key={note}>{note}</li>)}
        </ul>
      </details>
    </section>
  );
}
