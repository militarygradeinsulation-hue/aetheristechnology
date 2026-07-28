import { computeGoldenLeakage, GOLDEN_LEAKAGE_LABEL, type PricedLeak } from "@/lib/goldenLeakage";

/**
 * The red "Total Estimated Annual Leakage" bubble shown on the main website,
 * in the portal report view, and mirrored on the PDF cover. Renders nothing
 * when the scan returned no priced leaks (never $0 / NaN / fake estimates).
 */
export function GoldenLeakageBanner({
  leaks,
  className = "",
}: {
  leaks: PricedLeak[] | null | undefined;
  className?: string;
}) {
  const total = computeGoldenLeakage(leaks);
  if (!total) return null;

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
