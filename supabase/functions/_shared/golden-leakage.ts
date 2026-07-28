// ───────────── canonical annual revenue loss (server side) ─────────────
// Single backend implementation of the Golden Report "Total Estimated Annual
// Revenue Loss" math. Mirrors src/lib/goldenLeakage.ts (the client resolver).
//
// Universal by construction: it reads ONLY the report data shape. There is no
// company, url, account, rep or scan-id branch anywhere in this file.

export const LEAKAGE_CALCULATION_VERSION = 2;
/** Values above this are placeholders/data artifacts, not evidence for one leak. */
export const MAX_SANE_LEAK = 50_000_000;
/** Chapter prose mixes annual, quarterly and speculative TAM figures — cap tighter. */
export const MAX_SANE_CHAPTER_LEAK = 10_000_000;

const ANNUAL_WORDS = /\b(annual|annually|per year|a year|\/\s?yr|yearly)\b/i;
const RANGE_RE =
  /\$\s?([\d,]+(?:\.\d+)?\s*[kKmM]?)\s*(?:-|–|—|to)\s*\$?\s?([\d,]+(?:\.\d+)?\s*[kKmM]?)/;
const SINGLE_RE = /\$\s?([\d,]+(?:\.\d+)?\s*[kKmM]?)/;

export const LEAK_LOW_FIELDS = ["dollars_low", "annual_low", "low", "cost_low"];
export const LEAK_HIGH_FIELDS = ["dollars_high", "annual_high", "high", "cost_high"];
export const LEAK_SINGLE_FIELDS = ["dollars", "annual_cost", "estimated_annual_loss"];

export type ReportLike = {
  top_leaks?: Array<Record<string, unknown>> | null;
  chapters?: Array<Record<string, unknown>> | null;
  overall_leakage?: unknown;
};

export type OverallLeakage = {
  annual_low: number;
  annual_high: number;
  currency: "USD";
  source: "top_leaks" | "chapters";
  priced_leak_count: number;
  calculation_version: number;
};

/** Accepts numbers and the money strings models emit: "$25,000", " -500,000 ", "12k", "$2.5M". */
export function parseMoneyValue(v: unknown): number | null {
  let n: number | null = null;
  if (typeof v === "number") {
    n = Number.isFinite(v) && v !== 0 ? Math.abs(v) : null;
  } else if (typeof v === "string") {
    const m = v.trim().match(/-?\d[\d,\s]*(?:\.\d+)?\s*(k|m)?/i);
    if (!m) return null;
    const raw = Number(m[0].replace(/[,\s]/g, "").replace(/[km]$/i, ""));
    if (!Number.isFinite(raw) || raw === 0) return null;
    const unit = (m[1] || "").toLowerCase();
    n = Math.abs(raw) * (unit === "k" ? 1_000 : unit === "m" ? 1_000_000 : 1);
  }
  if (n == null || !Number.isFinite(n) || n <= 0 || n > MAX_SANE_LEAK) return null;
  return n;
}

function pickLeakValue(leak: Record<string, unknown>, fields: string[]): number | null {
  for (const f of fields) {
    const v = parseMoneyValue(leak?.[f]);
    if (v != null) return v;
  }
  return null;
}

function sumLeaks(leaks: Array<Record<string, unknown>> | null | undefined) {
  let low = 0, high = 0, count = 0;
  const seen = new Set<string>();
  for (const leak of leaks || []) {
    if (!leak || typeof leak !== "object") continue;
    const key = String(leak?.name || leak?.chapter_slug || "")
      .toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
    if (key && seen.has(key)) continue;
    const l = pickLeakValue(leak, LEAK_LOW_FIELDS) ?? pickLeakValue(leak, LEAK_SINGLE_FIELDS);
    const h = pickLeakValue(leak, LEAK_HIGH_FIELDS) ?? pickLeakValue(leak, LEAK_SINGLE_FIELDS);
    if (l == null && h == null) continue;
    const lo = l ?? (h as number), hi = h ?? (l as number);
    low += Math.min(lo, hi);
    high += Math.max(lo, hi);
    count += 1;
    if (key) seen.add(key);
  }
  return count && Number.isFinite(high) && high > 0
    ? { low: low > 0 ? low : high, high, count }
    : null;
}

/**
 * Legacy/partial reports: pull annual ranges out of chapter costing prose,
 * skipping chapters already represented in top_leaks so nothing is double
 * counted, and skipping quarterly / speculative market-size figures.
 */
export function leaksFromChapters(report: ReportLike): Array<Record<string, unknown>> {
  const priced = new Set(
    (report.top_leaks || []).map((l) => String(l?.chapter_slug || "").toLowerCase()).filter(Boolean),
  );
  const capOk = (v: unknown) => {
    const n = parseMoneyValue(v);
    return n != null && n <= MAX_SANE_CHAPTER_LEAK;
  };
  const derived: Array<Record<string, unknown>> = [];
  for (const ch of report.chapters || []) {
    const slug = String(ch?.slug || "").toLowerCase();
    if (slug && priced.has(slug)) continue;
    const text = String(ch?.what_its_costing || "");
    if (!text || !ANNUAL_WORDS.test(text)) continue;
    const range = text.match(RANGE_RE);
    if (range && capOk(range[1]) && capOk(range[2])) {
      derived.push({ chapter_slug: slug, dollars_low: range[1], dollars_high: range[2] });
      continue;
    }
    const single = text.match(SINGLE_RE);
    if (single && capOk(single[1])) {
      derived.push({ chapter_slug: slug, dollars_low: single[1], dollars_high: single[1] });
    }
  }
  return derived;
}

/** Returns the canonical object, or null when the report has no priced evidence. */
export function computeOverallLeakage(report: ReportLike): OverallLeakage | null {
  const fromLeaks = sumLeaks(report.top_leaks);
  if (fromLeaks) {
    return {
      annual_low: Math.round(fromLeaks.low),
      annual_high: Math.round(fromLeaks.high),
      currency: "USD",
      source: "top_leaks",
      priced_leak_count: fromLeaks.count,
      calculation_version: LEAKAGE_CALCULATION_VERSION,
    };
  }
  const fromChapters = sumLeaks(leaksFromChapters(report));
  if (fromChapters) {
    return {
      annual_low: Math.round(fromChapters.low),
      annual_high: Math.round(fromChapters.high),
      currency: "USD",
      source: "chapters",
      priced_leak_count: fromChapters.count,
      calculation_version: LEAKAGE_CALCULATION_VERSION,
    };
  }
  return null;
}

/** True when the report carries evidence this resolver considers valid. */
export function hasPricedEvidence(report: ReportLike): boolean {
  return !!sumLeaks(report.top_leaks) || !!sumLeaks(leaksFromChapters(report));
}

/**
 * Completion invariant: a report carrying valid priced evidence MUST resolve to
 * a canonical overall_leakage. Returns an error string when violated so
 * completion/backfill can fail loudly instead of silently hiding the red box.
 */
export function leakageInvariantError(report: ReportLike): string | null {
  if (hasPricedEvidence(report) && !report.overall_leakage) {
    return "priced evidence present but overall_leakage could not be resolved";
  }
  return null;
}
