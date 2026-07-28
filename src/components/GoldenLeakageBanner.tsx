import {
  computeGoldenLeakage,
  GOLDEN_LEAKAGE_LABEL,
  GOLDEN_LEAKAGE_EMPTY_MESSAGE,
  type GoldenReportLike,
  type PricedLeak,
} from "@/lib/goldenLeakage";
import {
  detectGenericReport,
  REGENERATION_REQUIRED_MESSAGE,
} from "@/lib/goldenGenericDetector";

/**
 * The red "Total Estimated Annual Revenue Loss" box shown on the main website,
 * in the portal report view, and mirrored on the PDF cover. Pass the whole
 * report so the canonical `overall_leakage` total is preferred; falls back to
 * top_leaks / chapter ranges for legacy scans. When a scan carries no valid
 * monetary evidence we show a muted note instead of a fabricated number.
 */
export function GoldenLeakageBanner({
  report,
  leaks,
  className = "",
}: {
  report?: GoldenReportLike | null;
  /** Legacy prop: bare priced-leak array. */
  leaks?: PricedLeak[] | null;
  className?: string;
}) {
  // A generic/template report has no measured evidence, so the red box must not
  // render at all — a boilerplate total is worse than no total.
  const generic = report ? detectGenericReport(report as never) : null;
  const blocked =
    (report as { report_state?: string } | null)?.report_state === "regeneration_required" ||
    !!generic?.regeneration_required;

  if (blocked) {
    return (
      <div className={`rounded-lg border border-border/60 bg-muted/20 p-4 ${className}`}>
        <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground mb-1">
          {GOLDEN_LEAKAGE_LABEL}
        </div>
        <p className="text-xs text-muted-foreground">{REGENERATION_REQUIRED_MESSAGE}</p>
      </div>
    );
  }

  const total = computeGoldenLeakage(report ?? leaks ?? null);

  if (!total) {
    return (
      <div className={`rounded-lg border border-border/60 bg-muted/20 p-4 ${className}`}>
        <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground mb-1">
          {GOLDEN_LEAKAGE_LABEL}
        </div>
        <p className="text-xs text-muted-foreground">{GOLDEN_LEAKAGE_EMPTY_MESSAGE}</p>
      </div>
    );
  }

  return (
    <div
      className={`rounded-lg border border-red-500/40 bg-gradient-to-br from-red-500/10 via-red-500/5 to-transparent p-5 ${className}`}
    >
      <div className="font-mono text-[10px] uppercase tracking-widest text-red-400 mb-1">
        {GOLDEN_LEAKAGE_LABEL}
      </div>
      <div className="font-serif text-3xl md:text-4xl font-bold text-red-400 leading-tight">
        {total.rangeLabel}
        <span className="ml-2 text-xs font-mono text-muted-foreground align-middle">/ year</span>
      </div>
      <p className="mt-2 text-xs text-muted-foreground">{total.caption}</p>
    </div>
  );
}
