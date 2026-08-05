import {
  resolveFinancialLedger,
  formatUsdRange,
  type GoldenReportLike,
} from "@/lib/goldenLedger";

/**
 * The canonical global "Top 10 Active Leaks" view.
 *
 * Every figure comes from the Financial Leak Ledger — the same object the PDF,
 * the portal and the emails read. This component performs no arithmetic of its
 * own, which is what keeps the cover total, the chapters and this list from
 * ever disagreeing again.
 */
export function GoldenTopLeaks({ report }: { report: GoldenReportLike | null | undefined }) {
  const ledger = resolveFinancialLedger(report ?? null);
  if (!ledger.overall || !ledger.top10.entries.length) return null;

  const t = ledger.top10;
  const absorbed = ledger.entries.filter(
    (e) => e.status === "included_in_chapter" || e.status === "duplicate",
  );

  return (
    <section>
      <div className="flex items-baseline justify-between gap-2 mb-2">
        <div className="text-[10px] font-mono uppercase tracking-widest text-amber-500">
          Top 10 Active Leaks
        </div>
        <div className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">
          {t.label}
        </div>
      </div>

      <div className="grid sm:grid-cols-2 gap-2">
        {t.entries.map((e) => (
          <div key={e.leak_id} className="border border-border rounded p-3 bg-muted/20">
            <div className="flex items-baseline justify-between gap-2">
              <span className="font-mono text-xs text-amber-500">#{e.rank}</span>
              <span className="text-xs font-mono text-red-400">{e.range_label}</span>
            </div>
            <div className="text-sm font-semibold mt-1">{e.title}</div>
            <div className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground mt-1">
              {e.primary_chapter}
            </div>
            {e.pricing_basis && (
              <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{e.pricing_basis}</p>
            )}
          </div>
        ))}
      </div>

      <div className="mt-3 grid sm:grid-cols-3 gap-2 text-xs font-mono">
        <div className="border border-border rounded p-2 bg-muted/20">
          <div className="text-[10px] uppercase tracking-widest text-muted-foreground">Top 10 subtotal</div>
          <div className="text-red-400">{formatUsdRange(t.subtotal_low, t.subtotal_high)}</div>
        </div>
        {t.remaining_count > 0 && (
          <div className="border border-border rounded p-2 bg-muted/20">
            <div className="text-[10px] uppercase tracking-widest text-muted-foreground">
              Remaining {t.remaining_count} leaks
            </div>
            <div className="text-red-400">{formatUsdRange(t.remainder_low, t.remainder_high)}</div>
          </div>
        )}
        <div className="border border-red-500/40 rounded p-2 bg-red-500/5">
          <div className="text-[10px] uppercase tracking-widest text-muted-foreground">Report total</div>
          <div className="text-red-400">
            {formatUsdRange(ledger.overall.annual_low, ledger.overall.annual_high)}
          </div>
        </div>
      </div>

      {t.remaining_count > 0 && (
        <details className="mt-2">
          <summary className="cursor-pointer text-xs text-muted-foreground hover:text-foreground">
            Show the remaining {t.remaining_count} priced leaks
          </summary>
          <ul className="mt-2 space-y-1 text-xs">
            {t.remainder.map((e) => (
              <li key={e.leak_id} className="flex items-baseline justify-between gap-3 border-b border-border/40 pb-1">
                <span>
                  <span className="font-mono text-muted-foreground mr-2">#{e.rank}</span>
                  {e.title}
                </span>
                <span className="font-mono text-red-400 whitespace-nowrap">{e.range_label}</span>
              </li>
            ))}
          </ul>
        </details>
      )}

      {absorbed.length > 0 && (
        <details className="mt-2">
          <summary className="cursor-pointer text-xs text-muted-foreground hover:text-foreground">
            Also identified ({absorbed.length}) — already counted inside a chapter total
          </summary>
          <ul className="mt-2 space-y-1 text-xs text-muted-foreground">
            {absorbed.map((e) => (
              <li key={e.leak_id}>
                {e.title} — included in the {e.primary_chapter} chapter total
              </li>
            ))}
          </ul>
        </details>
      )}
    </section>
  );
}
