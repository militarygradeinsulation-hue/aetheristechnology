import type { OpportunityComponent } from "@/lib/xray/types";
import { DIMENSION_LABEL, money } from "@/lib/xray/format";

const STATUS_TEXT: Record<OpportunityComponent["status"], string> = {
  estimated: "",
  not_applicable: "Not applicable",
  insufficient: "Insufficient information",
};

/** Low–high range bars on a shared scale, base marked with a copper tick. */
export function OpportunityChart({ components }: { components: OpportunityComponent[] }) {
  const max = Math.max(1, ...components.map((c) => c.range?.high ?? 0));
  const pct = (v: number) => `${(v / max) * 100}%`;

  return (
    <div className="grid gap-4">
      {components.map((c) => (
        <div key={c.id} className="avoid-break grid gap-1.5 sm:grid-cols-[11rem_1fr_8rem] sm:items-center sm:gap-4">
          <div>
            <p className="text-sm font-medium">{c.label}</p>
            <p className="eyebrow text-muted-foreground">{DIMENSION_LABEL[c.dimension]}</p>
          </div>
          {c.range ? (
            <div className="relative h-5" role="img" aria-label={`${c.label}: ${money(c.range.low)} to ${money(c.range.high)}, base ${money(c.range.base)}`}>
              <div className="absolute inset-y-[9px] left-0 right-0 bg-muted" />
              <div className="absolute inset-y-1 bg-copper-soft" style={{ left: pct(c.range.low), width: `calc(${pct(c.range.high - c.range.low)} + 2px)` }} />
              <div className="absolute inset-y-0 w-0.5 bg-copper-strong" style={{ left: pct(c.range.base) }} />
            </div>
          ) : (
            <p className="text-sm italic text-muted-foreground">{STATUS_TEXT[c.status]}</p>
          )}
          <p className="font-mono text-sm sm:text-right">
            {c.range ? (
              <>
                {money(c.range.base)}
                <span className="block text-[0.625rem] text-muted-foreground">
                  {money(c.range.low)}–{money(c.range.high)}
                </span>
              </>
            ) : (
              <span className="text-muted-foreground">—</span>
            )}
          </p>
        </div>
      ))}
      <p className="flex items-center gap-4 font-mono text-[0.625rem] text-muted-foreground">
        <span className="flex items-center gap-1.5"><span className="inline-block h-2 w-5 bg-copper-soft" /> low–high range</span>
        <span className="flex items-center gap-1.5"><span className="inline-block h-3 w-0.5 bg-copper-strong" /> base case</span>
      </p>
    </div>
  );
}