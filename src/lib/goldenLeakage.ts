// Single source of truth for the Golden Report "Total Estimated Annual Leakage"
// figure. Used by the main website / portal panel AND the generated PDF so all
// three surfaces always show the exact same numbers and wording.

export type PricedLeak = {
  dollars_low?: number | null;
  dollars_high?: number | null;
};

export type GoldenLeakage = {
  low: number;
  high: number;
  count: number;
  /** Formatted "$1,000 – $2,000" (en-dash) for UI. */
  rangeLabel: string;
  /** Formatted "$1,000 - $2,000" (ASCII) for PDF fonts. */
  rangeLabelAscii: string;
  caption: string;
};

const isFiniteNum = (v: unknown): v is number =>
  typeof v === "number" && Number.isFinite(v) && v > 0;

/**
 * Sums every priced leak in the report. A leak counts when at least one of
 * dollars_low / dollars_high is a positive finite number; the missing side
 * falls back to the present one so partial data never produces $0 or NaN.
 * Returns null when the scan produced no usable dollar figures — callers must
 * render nothing rather than a fabricated estimate.
 */
export function computeGoldenLeakage(
  leaks: PricedLeak[] | null | undefined,
): GoldenLeakage | null {
  if (!Array.isArray(leaks) || !leaks.length) return null;

  let low = 0;
  let high = 0;
  let count = 0;

  for (const leak of leaks) {
    const l = isFiniteNum(leak?.dollars_low) ? leak.dollars_low : null;
    const h = isFiniteNum(leak?.dollars_high) ? leak.dollars_high : null;
    if (l == null && h == null) continue;
    const lo = l ?? (h as number);
    const hi = h ?? (l as number);
    low += Math.min(lo, hi);
    high += Math.max(lo, hi);
    count += 1;
  }

  if (!count || high <= 0) return null;
  if (low <= 0) low = high;

  const fmt = (n: number) => `$${Math.round(n).toLocaleString("en-US")}`;

  return {
    low,
    high,
    count,
    rangeLabel: `${fmt(low)} – ${fmt(high)}`,
    rangeLabelAscii: `${fmt(low)} - ${fmt(high)}`,
    caption: `Sum of the top ${count} priced leak${count === 1 ? "" : "s"} documented in this report. Every dollar is a system your business is bleeding right now. Keep reading — each chapter shows exactly where and how to stop it.`,
  };
}

export const GOLDEN_LEAKAGE_LABEL = "Total Estimated Annual Leakage";
