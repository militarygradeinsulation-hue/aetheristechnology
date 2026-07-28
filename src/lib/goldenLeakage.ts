// Single source of truth for the Golden Report "Total Estimated Annual Revenue
// Loss" figure. Used by the main website, the portal report view, and the
// generated PDF so all surfaces always show the exact same numbers/wording.
//
// Resolution order (first valid wins, never double-counted):
//   1. report.overall_leakage  — canonical object persisted at scan completion
//   2. report.top_leaks        — priced leaks (numbers OR money strings)
//   3. report.chapters         — dollar ranges parsed out of chapter costing text,
//                                skipping chapters already priced in top_leaks
// Returns null when a scan carries no real monetary evidence. Callers must show
// a muted "could not be calculated" note rather than $0 / NaN / a fake estimate.

export type PricedLeak = {
  name?: string | null;
  chapter_slug?: string | null;
  dollars_low?: number | string | null;
  dollars_high?: number | string | null;
};

export type OverallLeakage = {
  annual_low: number;
  annual_high: number;
  currency: string;
  source: string;
  priced_leak_count: number;
};

export type GoldenReportLike = {
  overall_leakage?: OverallLeakage | null;
  top_leaks?: PricedLeak[] | null;
  chapters?: Array<{
    slug?: string;
    what_its_costing?: string | null;
  }> | null;
};

export type GoldenLeakage = {
  low: number;
  high: number;
  count: number;
  /** Where the numbers came from: overall_leakage | top_leaks | chapters */
  source: string;
  currency: string;
  /** Formatted "$1,000 – $2,000" (en-dash) for UI. */
  rangeLabel: string;
  /** Formatted "$1,000 - $2,000" (ASCII) for PDF fonts. */
  rangeLabelAscii: string;
  caption: string;
};

export const GOLDEN_LEAKAGE_LABEL = "Total Estimated Annual Revenue Loss";
export const GOLDEN_LEAKAGE_EMPTY_MESSAGE =
  "Annual revenue loss could not be calculated from this scan.";

/**
 * Accepts a real number, or a money string the model sometimes emits:
 * "25,000", "$25,000", "$-500,000", "12k", "1.2M". Returns a positive finite
 * magnitude, or null when there is no usable number.
 */
export function parseMoney(v: unknown): number | null {
  if (typeof v === "number") {
    return Number.isFinite(v) && v !== 0 ? Math.abs(v) : null;
  }
  if (typeof v !== "string") return null;
  const s = v.trim();
  if (!s) return null;
  const m = s.match(/-?\d[\d,\s]*(?:\.\d+)?\s*(k|m)?/i);
  if (!m) return null;
  const n = Number(m[0].replace(/[,\s]/g, "").replace(/[km]$/i, ""));
  if (!Number.isFinite(n) || n === 0) return null;
  const unit = (m[1] || "").toLowerCase();
  const mult = unit === "k" ? 1_000 : unit === "m" ? 1_000_000 : 1;
  return Math.abs(n) * mult;
}

function sumLeaks(leaks: PricedLeak[] | null | undefined) {
  if (!Array.isArray(leaks) || !leaks.length) return null;
  let low = 0;
  let high = 0;
  let count = 0;
  const seen = new Set<string>();
  for (const leak of leaks) {
    const key = String(leak?.name || leak?.chapter_slug || "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, " ")
      .trim();
    if (key && seen.has(key)) continue;
    const l = parseMoney(leak?.dollars_low);
    const h = parseMoney(leak?.dollars_high);
    if (l == null && h == null) continue;
    const lo = l ?? (h as number);
    const hi = h ?? (l as number);
    low += Math.min(lo, hi);
    high += Math.max(lo, hi);
    count += 1;
    if (key) seen.add(key);
  }
  if (!count || high <= 0) return null;
  return { low: low > 0 ? low : high, high, count };
}

/** Pull "$4,500 - $8,200" / "$4,500 to $8,200" / "$4,500" out of chapter prose. */
function leaksFromChapters(report: GoldenReportLike): PricedLeak[] {
  const priced = new Set(
    (report.top_leaks || [])
      .map((l) => String(l?.chapter_slug || "").toLowerCase())
      .filter(Boolean),
  );
  const out: PricedLeak[] = [];
  for (const ch of report.chapters || []) {
    const slug = String(ch?.slug || "").toLowerCase();
    if (slug && priced.has(slug)) continue;
    const text = String(ch?.what_its_costing || "");
    if (!text) continue;
    const range = text.match(
      /\$\s?([\d,]+(?:\.\d+)?\s*[kKmM]?)\s*(?:-|–|—|to)\s*\$?\s?([\d,]+(?:\.\d+)?\s*[kKmM]?)/,
    );
    if (range) {
      out.push({ chapter_slug: slug, dollars_low: range[1], dollars_high: range[2] });
      continue;
    }
    const single = text.match(/\$\s?([\d,]+(?:\.\d+)?\s*[kKmM]?)/);
    if (single) out.push({ chapter_slug: slug, dollars_low: single[1], dollars_high: single[1] });
  }
  return out;
}

const fmt = (n: number) => `$${Math.round(n).toLocaleString("en-US")}`;

function build(low: number, high: number, count: number, source: string, currency = "USD"): GoldenLeakage {
  return {
    low,
    high,
    count,
    source,
    currency,
    rangeLabel: `${fmt(low)} – ${fmt(high)}`,
    rangeLabelAscii: `${fmt(low)} - ${fmt(high)}`,
    caption: `Sum of the ${count} priced leak${count === 1 ? "" : "s"} documented in this report. Every dollar is a system your business is bleeding right now. Keep reading — each chapter shows exactly where and how to stop it.`,
  };
}

/**
 * Accepts either a full report object (preferred) or a bare top_leaks array
 * (legacy callers). Returns null when no valid monetary evidence exists.
 */
export function computeGoldenLeakage(
  input: GoldenReportLike | PricedLeak[] | null | undefined,
): GoldenLeakage | null {
  if (!input) return null;

  if (Array.isArray(input)) {
    const s = sumLeaks(input);
    return s ? build(s.low, s.high, s.count, "top_leaks") : null;
  }

  const report = input;

  // 1. canonical persisted total
  const ol = report.overall_leakage;
  if (ol) {
    const lo = parseMoney(ol.annual_low);
    const hi = parseMoney(ol.annual_high);
    if (lo != null || hi != null) {
      const low = Math.min(lo ?? (hi as number), hi ?? (lo as number));
      const high = Math.max(lo ?? (hi as number), hi ?? (lo as number));
      if (high > 0) {
        return build(
          low > 0 ? low : high,
          high,
          Number(ol.priced_leak_count) > 0 ? Number(ol.priced_leak_count) : (report.top_leaks?.length || 1),
          ol.source || "overall_leakage",
          ol.currency || "USD",
        );
      }
    }
  }

  // 2. priced top_leaks
  const fromLeaks = sumLeaks(report.top_leaks);
  if (fromLeaks) return build(fromLeaks.low, fromLeaks.high, fromLeaks.count, "top_leaks");

  // 3. chapter dollar ranges (legacy scans)
  const fromChapters = sumLeaks(leaksFromChapters(report));
  if (fromChapters) return build(fromChapters.low, fromChapters.high, fromChapters.count, "chapters");

  return null;
}
