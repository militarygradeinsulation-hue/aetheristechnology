// ═══════════════════════════════════════════════════════════════════════════
// CANONICAL Golden Report leakage resolver — the ONLY total-calculation path.
//
// This single file is consumed by BOTH runtimes:
//   • Deno edge functions  → import "../_shared/golden-leakage.ts"
//   • Browser / Vite app   → src/lib/goldenLeakage.ts re-exports this file
//
// Surfaces that must use it (never inline math):
//   - main website report view      (ForensicScanAllPanel -> GoldenLeakageBanner)
//   - portal / history report view  (same shared panel)
//   - pre-download summary          (same shared banner, above the PDF button)
//   - main website PDF              (generateForensicGoldenPdf)
//   - portal PDF                    (same generator)
//   - scan completion + backfill    (forensic-scan-all, golden-* backfills)
//
// Resolution order (first valid wins, never double-counted):
//   1. report.overall_leakage  — canonical object persisted at scan completion
//   2. report.top_leaks        — priced leaks (numbers OR money strings)
//   3. report.chapters         — annual dollar ranges parsed out of chapter
//                                costing prose, skipping chapters already priced
// Returns null only when a scan carries no real monetary evidence. Callers must
// show a muted "could not be calculated" note rather than $0 / NaN / a fake total.
//
// Universal by construction: it reads ONLY the report data shape. There is no
// company, url, account, rep or scan-id branch anywhere in this file.
// ═══════════════════════════════════════════════════════════════════════════

/** Bump when the math or field resolution changes. Persisted with the report. */
export const LEAKAGE_CALCULATION_VERSION = 3;

/** Values above this are placeholders/data artifacts, not evidence for one leak. */
export const MAX_SANE_LEAK = 50_000_000;
/** Chapter prose mixes annual, quarterly and speculative TAM figures — cap tighter. */
export const MAX_SANE_CHAPTER_LEAK = 10_000_000;

export const LEAK_LOW_FIELDS = ["dollars_low", "annual_low", "low", "cost_low"] as const;
export const LEAK_HIGH_FIELDS = ["dollars_high", "annual_high", "high", "cost_high"] as const;
export const LEAK_SINGLE_FIELDS = ["dollars", "annual_cost", "estimated_annual_loss"] as const;

const ANNUAL_WORDS = /\b(annual|annually|per year|a year|\/\s?yr|yearly)\b/i;
const RANGE_RE =
  /\$\s?([\d,]+(?:\.\d+)?\s*[kKmM]?)\s*(?:-|–|—|to)\s*\$?\s?([\d,]+(?:\.\d+)?\s*[kKmM]?)/;
const SINGLE_RE = /\$\s?([\d,]+(?:\.\d+)?\s*[kKmM]?)/;

export type PricedLeak = {
  name?: string | null;
  chapter_slug?: string | null;
  dollars_low?: number | string | null;
  dollars_high?: number | string | null;
  // legacy / alternate field names seen in older scan payloads
  annual_low?: number | string | null;
  annual_high?: number | string | null;
  low?: number | string | null;
  high?: number | string | null;
  cost_low?: number | string | null;
  cost_high?: number | string | null;
  dollars?: number | string | null;
  annual_cost?: number | string | null;
  estimated_annual_loss?: number | string | null;
  [k: string]: unknown;
};

export type OverallLeakage = {
  annual_low: number | string;
  annual_high: number | string;
  currency?: string;
  source?: string;
  priced_leak_count?: number;
  calculation_version?: number;
};

export type GoldenReportLike = {
  overall_leakage?: OverallLeakage | null;
  top_leaks?: PricedLeak[] | null;
  chapters?: Array<{ slug?: string; what_its_costing?: string | null }> | null;
  [k: string]: unknown;
};

/** Backend alias kept for existing edge-function imports. */
export type ReportLike = GoldenReportLike;

export type GoldenLeakage = {
  low: number;
  high: number;
  count: number;
  /** overall_leakage | top_leaks | chapters */
  source: string;
  currency: string;
  calculation_version: number;
  /** Formatted "$1,000 – $2,000" (en-dash) for UI. */
  rangeLabel: string;
  /** Formatted "$1,000 - $2,000" (ASCII) for PDF fonts. */
  rangeLabelAscii: string;
  /** Exactly what the UI prints next to the label. */
  displayValue: string;
  caption: string;
};

export const GOLDEN_LEAKAGE_LABEL = "TOTAL ESTIMATED ANNUAL REVENUE LOSS";
export const GOLDEN_LEAKAGE_EMPTY_MESSAGE =
  "Annual revenue loss could not be calculated from this scan.";

/**
 * Accepts a real number, or a money string the model sometimes emits:
 * "25,000", "$25,000", " $-500,000 ", "USD 12k", "1.2M", "$4,500/yr".
 * Rejects zero, NaN, Infinity, and absurd magnitudes.
 */
export function parseMoney(v: unknown): number | null {
  let n: number | null = null;
  if (typeof v === "number") {
    n = Number.isFinite(v) && v !== 0 ? Math.abs(v) : null;
  } else if (typeof v === "string") {
    const s = v.trim();
    if (!s) return null;
    const m = s.match(/-?\d[\d,\s]*(?:\.\d+)?\s*(k|m)?/i);
    if (!m) return null;
    const raw = Number(m[0].replace(/[,\s]/g, "").replace(/[km]$/i, ""));
    if (!Number.isFinite(raw) || raw === 0) return null;
    const unit = (m[1] || "").toLowerCase();
    n = Math.abs(raw) * (unit === "k" ? 1_000 : unit === "m" ? 1_000_000 : 1);
  }
  if (n == null || !Number.isFinite(n) || n <= 0 || n > MAX_SANE_LEAK) return null;
  return n;
}

/** Backend alias kept for existing edge-function imports. */
export const parseMoneyValue = parseMoney;

function pick(leak: PricedLeak, fields: readonly string[]): number | null {
  for (const f of fields) {
    const v = parseMoney((leak as Record<string, unknown>)[f]);
    if (v != null) return v;
  }
  return null;
}

function leakKey(leak: PricedLeak): string {
  return String(leak?.name || leak?.chapter_slug || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function sumLeaks(leaks: PricedLeak[] | null | undefined) {
  if (!Array.isArray(leaks) || !leaks.length) return null;
  let low = 0;
  let high = 0;
  let count = 0;
  const seen = new Set<string>();
  for (const leak of leaks) {
    if (!leak || typeof leak !== "object") continue;
    const key = leakKey(leak);
    if (key && seen.has(key)) continue; // dedupe before summing
    const l = pick(leak, LEAK_LOW_FIELDS) ?? pick(leak, LEAK_SINGLE_FIELDS);
    const h = pick(leak, LEAK_HIGH_FIELDS) ?? pick(leak, LEAK_SINGLE_FIELDS);
    if (l == null && h == null) continue;
    const a = l ?? (h as number);
    const b = h ?? (l as number);
    // reversed ranges are normalized rather than rejected outright
    low += Math.min(a, b);
    high += Math.max(a, b);
    count += 1;
    if (key) seen.add(key);
  }
  if (!count || !Number.isFinite(high) || high <= 0) return null;
  return { low: low > 0 ? low : high, high, count };
}

/**
 * Pull "$4,500 - $8,200" / "$4,500 to $8,200" / "$4,500" out of chapter prose.
 * Only the first figure per chapter is used, and only when the chapter states an
 * annual amount, so quarterly and speculative market-size numbers in the same
 * paragraph are never summed into the yearly total.
 */
export function leaksFromChapters(report: GoldenReportLike): PricedLeak[] {
  const priced = new Set(
    (report.top_leaks || []).map((l) => String(l?.chapter_slug || "").toLowerCase()).filter(Boolean),
  );
  const capOk = (v: unknown) => {
    const n = parseMoney(v);
    return n != null && n <= MAX_SANE_CHAPTER_LEAK;
  };
  const out: PricedLeak[] = [];
  for (const ch of report.chapters || []) {
    const slug = String(ch?.slug || "").toLowerCase();
    if (slug && priced.has(slug)) continue;
    const text = String(ch?.what_its_costing || "");
    if (!text || !ANNUAL_WORDS.test(text)) continue;
    const range = text.match(RANGE_RE);
    if (range && capOk(range[1]) && capOk(range[2])) {
      out.push({ chapter_slug: slug, dollars_low: range[1], dollars_high: range[2] });
      continue;
    }
    const single = text.match(SINGLE_RE);
    if (single && capOk(single[1])) {
      out.push({ chapter_slug: slug, dollars_low: single[1], dollars_high: single[1] });
    }
  }
  return out;
}

/** True when the report carries evidence this resolver considers valid. */
export function hasPricedEvidence(report: GoldenReportLike | null | undefined): boolean {
  if (!report) return false;
  return !!sumLeaks(report.top_leaks) || !!sumLeaks(leaksFromChapters(report));
}

const fmt = (n: number) => `$${Math.round(n).toLocaleString("en-US")}`;

export function formatLeakageRange(low: number, high: number): string {
  return `${fmt(low)} – ${fmt(high)}`;
}

function build(
  low: number,
  high: number,
  count: number,
  source: string,
  currency = "USD",
  version = LEAKAGE_CALCULATION_VERSION,
): GoldenLeakage {
  const rangeLabel = `${fmt(low)} – ${fmt(high)}`;
  return {
    low,
    high,
    count,
    source,
    currency,
    calculation_version: version,
    rangeLabel,
    rangeLabelAscii: `${fmt(low)} - ${fmt(high)}`,
    displayValue: `${rangeLabel} / year`,
    caption: `Sum of the ${count} uniquely priced leak${count === 1 ? "" : "s"} documented in this report. Every dollar is a system your business is bleeding right now. Keep reading — each chapter shows exactly where and how to stop it.`,
  };
}

/**
 * The ONLY allowed leakage calculation path. Accepts a full report object
 * (preferred) or a bare top_leaks array (legacy callers).
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

  // 1. canonical persisted total (preserved as-is for older reports)
  const ol = report.overall_leakage;
  if (ol && typeof ol === "object") {
    const lo = parseMoney(ol.annual_low);
    const hi = parseMoney(ol.annual_high);
    if (lo != null || hi != null) {
      const a = lo ?? (hi as number);
      const b = hi ?? (lo as number);
      const low = Math.min(a, b);
      const high = Math.max(a, b);
      if (high > 0) {
        const count =
          Number(ol.priced_leak_count) > 0
            ? Number(ol.priced_leak_count)
            : report.top_leaks?.length || 1;
        return build(
          low > 0 ? low : high,
          high,
          count,
          ol.source || "overall_leakage",
          ol.currency || "USD",
          Number(ol.calculation_version) > 0 ? Number(ol.calculation_version) : 1,
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

export type CanonicalOverallLeakage = {
  annual_low: number;
  annual_high: number;
  currency: "USD";
  source: string;
  priced_leak_count: number;
  calculation_version: number;
};

/** Returns the canonical persistable object, or null when there is no evidence. */
export function computeOverallLeakage(report: GoldenReportLike): CanonicalOverallLeakage | null {
  const fromLeaks = sumLeaks(report.top_leaks);
  const chosen = fromLeaks
    ? { ...fromLeaks, source: "top_leaks" }
    : (() => {
        const c = sumLeaks(leaksFromChapters(report));
        return c ? { ...c, source: "chapters" } : null;
      })();
  if (!chosen) return null;
  return {
    annual_low: Math.round(chosen.low),
    annual_high: Math.round(chosen.high),
    currency: "USD",
    source: chosen.source,
    priced_leak_count: chosen.count,
    calculation_version: LEAKAGE_CALCULATION_VERSION,
  };
}

/**
 * Completion invariant: a report carrying valid priced evidence MUST resolve to
 * a canonical overall_leakage. Returns an error string when violated so
 * completion/backfill can fail loudly instead of silently hiding the red box.
 */
export function leakageInvariantError(report: GoldenReportLike): string | null {
  if (hasPricedEvidence(report) && !report.overall_leakage) {
    return "priced evidence present but overall_leakage could not be resolved";
  }
  return null;
}
