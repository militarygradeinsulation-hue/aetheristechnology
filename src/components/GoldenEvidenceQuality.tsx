import { AlertTriangle, CheckCircle2, HelpCircle, ShieldAlert } from "lucide-react";
import type { ReportConsistency, CompilerViolation } from "@/lib/goldenCompiler";

export type CompilerMeta = {
  version?: number;
  state?: "compiled" | "needs_review";
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

/** True when the report passed the compiler gate, or predates the compiler. */
export function isDeliverable(report: unknown): boolean {
  const meta = readCompilerMeta(report);
  if (!meta?.state) return true; // legacy report, never compiled — not blocked
  return meta.state === "compiled";
}

/**
 * Evidence quality summary. Every number here is READ from the compiled report;
 * this component never recalculates totals, counts or statuses.
 */
export function GoldenEvidenceQuality({ report, className = "" }: { report: unknown; className?: string }) {
  const consistency = readConsistency(report);
  const meta = readCompilerMeta(report);
  if (!consistency) return null;

  const q = consistency.evidence_quality;
  const rows = [
    { label: "Verified", value: q.verified, pct: q.verified_pct, icon: CheckCircle2, tone: "text-emerald-400" },
    { label: "Inferred", value: q.inferred, pct: q.inferred_pct, icon: HelpCircle, tone: "text-amber-400" },
    { label: "Unverified", value: q.unverified, pct: q.unverified_pct, icon: AlertTriangle, tone: "text-muted-foreground" },
    { label: "Contradicted", value: q.contradicted, pct: q.contradicted_pct, icon: ShieldAlert, tone: "text-red-400" },
  ];

  return (
    <div className={`rounded-lg border border-border/60 bg-muted/10 p-4 ${className}`}>
      <div className="flex items-center justify-between gap-3 flex-wrap mb-3">
        <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
          Evidence Quality
        </div>
        <div
          className={`font-mono text-[10px] uppercase tracking-widest ${
            meta?.state === "compiled" ? "text-emerald-400" : "text-red-400"
          }`}
        >
          {meta?.state === "compiled" ? "Compiled · consistency checks passed" : "Needs review · checks failed"}
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {rows.map((r) => (
          <div key={r.label} className="rounded-md border border-border/50 bg-background/40 px-3 py-2">
            <div className={`flex items-center gap-1.5 text-[10px] font-mono uppercase tracking-wider ${r.tone}`}>
              <r.icon className="w-3 h-3" /> {r.label}
            </div>
            <div className="mt-1 text-lg font-semibold">{r.value}</div>
            <div className="text-[10px] font-mono text-muted-foreground">{r.pct}% of claims</div>
          </div>
        ))}
      </div>

      <p className="mt-3 text-xs text-muted-foreground leading-relaxed">
        {consistency.canonical_counts_sentence} Anything not marked verified is labelled inferred or unverified in the
        report body, and absence of a signal in a partial crawl is never written as proof of absence.
      </p>

      {!!meta?.violations?.length && (
        <ul className="mt-3 space-y-1">
          {meta.violations.slice(0, 6).map((v, i) => (
            <li key={i} className="text-[11px] font-mono text-red-400/90">
              {v.code} · {v.location}: {v.detail}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
