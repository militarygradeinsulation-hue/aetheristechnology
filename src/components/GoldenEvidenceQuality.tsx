import { AlertTriangle, CheckCircle2, HelpCircle, ShieldAlert } from "lucide-react";
import type { ReportConsistency, CompilerViolation } from "@/lib/goldenCompiler";
import { detectGenericReport } from "@/lib/goldenGenericDetector";

export type CompilerMeta = {
  version?: number;
  state?: "compiled" | "needs_review" | "regeneration_required";
  compiled_at?: string;
  violations?: CompilerViolation[];
  repairs?: string[];
};

/** Reads the compiler block off any stored report without recomputing anything. */
export function readCompilerMeta(report: unknown): CompilerMeta | null {
  const c = (report as { compiler?: CompilerMeta } | null)?.compiler;
  return c && typeof c === "object" ? c : null;
}

export function readConsistency(report: unknown): ReportConsistency | null {
  const c = (report as { report_consistency?: ReportConsistency } | null)?.report_consistency;
  return c && typeof c === "object" ? c : null;
}

/**
 * True when the report may be downloaded / sent out.
 *
 * Blocked when the compiler gate failed, when the report was marked
 * regeneration_required, or — for legacy rows that predate the compiler — when
 * the deterministic generic/template detector says it is boilerplate. A legacy
 * report that is genuinely specific is still allowed through.
 */
export function isDeliverable(report: unknown): boolean {
  const r = report as Record<string, unknown> | null;
  if (r?.report_state === "regeneration_required") return false;
  const meta = readCompilerMeta(report);
  if (!meta?.state) {
    // Never compiled: fall back to the live generic check instead of trusting it.
    return !detectGenericReport(r as never).regeneration_required;
  }
  return meta.state === "compiled";
}


/**
 * Client-facing Evidence Confidence summary. Every number here is READ from the
 * compiled report through the shared formatter, so website, portal and PDF
 * wording cannot drift apart. Nothing is recalculated.
 */
export function GoldenEvidenceQuality({ report, className = "" }: { report: unknown; className?: string }) {
  const model = buildEvidenceConfidence(report);
  const meta = readCompilerMeta(report);
  if (!model) return null;

  return (
    <div className={`rounded-lg border border-amber-500/30 bg-black/40 p-5 ${className}`}>
      <div className="font-mono text-[10px] uppercase tracking-[0.25em] text-amber-500 mb-3">
        {model.title}
      </div>

      {model.lead && <p className="text-sm leading-relaxed text-foreground/90">{model.lead}</p>}

      {!!model.metrics.length && (
        <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-3">
          {model.metrics.map((m) => (
            <div key={m.key} className="rounded-md border border-amber-500/20 bg-background/40 px-3 py-3">
              <div className="text-2xl font-semibold text-amber-400 tabular-nums">{m.value}</div>
              <div className="mt-1 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                {m.label}
              </div>
            </div>
          ))}
        </div>
      )}

      <p className="mt-4 text-xs text-muted-foreground leading-relaxed">{model.explanation}</p>

      <details className="mt-4 group">
        <summary className="cursor-pointer font-mono text-[10px] uppercase tracking-widest text-muted-foreground hover:text-amber-500">
          Methodology notes
        </summary>
        <div className="mt-3 space-y-3">
          <p className="text-xs text-muted-foreground leading-relaxed">{model.methodologyNote}</p>
          {!!model.methodologyRows.length && (
            <ul className="grid grid-cols-2 gap-2">
              {model.methodologyRows.map((r) => (
                <li
                  key={r.label}
                  className="flex items-center justify-between gap-2 rounded border border-border/50 bg-background/40 px-3 py-2 text-xs"
                >
                  <span className="text-muted-foreground">{r.label}</span>
                  <span className="font-semibold tabular-nums">{r.value}</span>
                </li>
              ))}
            </ul>
          )}
          {!!meta?.violations?.length && (
            <ul className="space-y-1">
              {meta.violations.slice(0, 6).map((v, i) => (
                <li key={i} className="text-[11px] font-mono text-red-400/90">
                  {v.code} · {v.location}: {v.detail}
                </li>
              ))}
            </ul>
          )}
        </div>
      </details>
    </div>
  );
}

