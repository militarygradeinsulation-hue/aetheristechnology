import {
  MONEY_CATEGORY_LABEL,
  MONEY_CATEGORY_NOTE,
  MONEY_TAXONOMY_LEGEND,
  type MoneyCategory,
} from "@/lib/goldenMoneyTaxonomy";

/**
 * The one place the website/portal renders a money category label.
 *
 * The strings come from the same shared taxonomy module the edge functions and
 * both PDF exports read, so a dollar value can never be categorized one way on
 * screen and another way in the export.
 */
export function GoldenMoneyCategoryChip({
  category,
  className = "",
  withNote = false,
}: {
  category: MoneyCategory;
  className?: string;
  withNote?: boolean;
}) {
  const tone =
    category === "annual_revenue_loss"
      ? "border-red-500/40 text-red-400"
      : category === "source_evidence"
        ? "border-border text-muted-foreground"
        : "border-amber-500/40 text-amber-500";

  return (
    <span className={className}>
      <span
        className={`inline-block rounded border px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-widest ${tone}`}
      >
        {MONEY_CATEGORY_LABEL[category]}
      </span>
      {withNote && (
        <span className="ml-2 text-[10px] text-muted-foreground">{MONEY_CATEGORY_NOTE[category]}</span>
      )}
    </span>
  );
}

/** The four-category key. Rendered once per report, above the financials. */
export function GoldenMoneyLegend({ className = "" }: { className?: string }) {
  return (
    <p className={`text-[10px] leading-relaxed text-muted-foreground ${className}`}>
      {MONEY_TAXONOMY_LEGEND}
    </p>
  );
}
