// ═══════════════════════════════════════════════════════════════════════════
// Golden Report leakage resolver — a thin, display-oriented façade over the
// ONE canonical financial model in ./golden-ledger.ts.
//
// This file performs NO arithmetic of its own. It formats what the Financial
// Leak Ledger computed, so the website, portal, pre-download summary, main PDF,
// portal PDF, report history, reopened reports and email previews all print the
// same integers.
//
// Consumed by BOTH runtimes:
//   • Deno edge functions  → import "../_shared/golden-leakage.ts"
//   • Browser / Vite app   → src/lib/goldenLeakage.ts re-exports this file
// ═══════════════════════════════════════════════════════════════════════════

import {
  buildFinancialLedger,
  resolveFinancialLedger,
  FINANCIAL_MODEL_VERSION,
  formatUsd,
  formatUsdRange,
  formatUsdRangeAscii,
  parseMoney as parseMoneyImpl,
  MAX_SANE_LEAK as MAX_SANE_LEAK_IMPL,
  MAX_SANE_CHAPTER_LEAK as MAX_SANE_CHAPTER_LEAK_IMPL,
  LEAK_LOW_FIELDS as LOW_FIELDS,
  LEAK_HIGH_FIELDS as HIGH_FIELDS,
  LEAK_SINGLE_FIELDS as SINGLE_FIELDS,
  isPriceableChapter,
  rangeFromProse,
  chapterAllocation,
  crossReferencedIn,
  fingerprintOf,
  resolveChapterSlug,
  NON_PRICEABLE_CHAPTER_SLUGS,
  MAX_PLAUSIBLE_REPORT_TOTAL,
  type FinancialLedger,
  type LedgerEntry,
  type ChapterAllocation,
  type TopLeakView,
  type FinancialReconciliation,
} from "./golden-ledger.ts";

export {
  buildFinancialLedger,
  resolveFinancialLedger,
  chapterAllocation,
  crossReferencedIn,
  fingerprintOf,
  resolveChapterSlug,
  isPriceableChapter,
  rangeFromProse,
  formatUsd,
  formatUsdRange,
  formatUsdRangeAscii,
  FINANCIAL_MODEL_VERSION,
  NON_PRICEABLE_CHAPTER_SLUGS,
  MAX_PLAUSIBLE_REPORT_TOTAL,
};
export type {
  FinancialLedger,
  LedgerEntry,
  ChapterAllocation,
  TopLeakView,
  FinancialReconciliation,
};

/** Kept in lock-step with the financial model version. */
export const LEAKAGE_CALCULATION_VERSION = FINANCIAL_MODEL_VERSION;

export const MAX_SANE_LEAK = MAX_SANE_LEAK_IMPL;
export const MAX_SANE_CHAPTER_LEAK = MAX_SANE_CHAPTER_LEAK_IMPL;
export const LEAK_LOW_FIELDS = LOW_FIELDS;
export const LEAK_HIGH_FIELDS = HIGH_FIELDS;
export const LEAK_SINGLE_FIELDS = SINGLE_FIELDS;

export type PricedLeak = {
  name?: string | null;
  chapter_slug?: string | null;
  dollars_low?: number | string | null;
  dollars_high?: number | string | null;
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
  chapters?: Array<{
    slug?: string;
    title?: string;
    what_its_costing?: string | null;
    annual_low?: number | string | null;
    annual_high?: number | string | null;
    cost_basis?: string | null;
    excluded_from_total?: boolean | null;
  }> | null;
  financial_ledger?: FinancialLedger | null;
  [k: string]: unknown;
};

/** Backend alias kept for existing edge-function imports. */
export type ReportLike = GoldenReportLike;

export type GoldenLeakage = {
  low: number;
  high: number;
  count: number;
  source: string;
  currency: string;
  calculation_version: number;
  /** Formatted "$1,000 – $2,000" (en-dash) for UI. */
  rangeLabel: string;
  /** Formatted "$1,000 - $2,000" (ASCII) for PDF fonts. */
  rangeLabelAscii: string;
  displayValue: string;
  caption: string;
};

export const GOLDEN_LEAKAGE_LABEL = "TOTAL ESTIMATED ANNUAL REVENUE LOSS";
export const GOLDEN_LEAKAGE_EMPTY_MESSAGE =
  "Annual revenue loss could not be calculated from this scan.";
export const GOLDEN_LEAKAGE_LEGACY_MESSAGE =
  "Financial model requires report regeneration.";

export const parseMoney = parseMoneyImpl;
/** Backend alias kept for existing edge-function imports. */
export const parseMoneyValue = parseMoneyImpl;

export function formatLeakageRange(low: number, high: number): string {
  return formatUsdRange(low, high);
}

function build(
  low: number,
  high: number,
  count: number,
  source: string,
  currency = "USD",
  version = LEAKAGE_CALCULATION_VERSION,
): GoldenLeakage {
  const rangeLabel = formatUsdRange(low, high);
  return {
    low,
    high,
    count,
    source,
    currency,
    calculation_version: version,
    rangeLabel,
    rangeLabelAscii: formatUsdRangeAscii(low, high),
    displayValue: `${rangeLabel} / year`,
    caption: `Sum of the ${count} uniquely priced leak${count === 1 ? "" : "s"} documented in this report. Every dollar is a system your business is bleeding right now. Keep reading — each chapter shows exactly where and how to stop it.`,
  };
}

/**
 * Every uniquely priced (active) ledger entry, exposed in the legacy
 * PricedLeak shape for callers that still iterate leaks.
 */
export function allPricedLeaks(report: GoldenReportLike): PricedLeak[] {
  return resolveFinancialLedger(report as never).active.map((e) => ({
    name: e.title,
    chapter_slug: e.primary_chapter,
    dollars_low: e.annual_low,
    dollars_high: e.annual_high,
  }));
}

/** Legacy helper: chapters that carry their own priced allocation. */
export function leaksFromChapters(report: GoldenReportLike): PricedLeak[] {
  return buildFinancialLedger(report as never)
    .entries.filter((e) => e.origin === "chapter" && e.status === "active")
    .map((e) => ({
      chapter_slug: e.primary_chapter,
      dollars_low: e.annual_low,
      dollars_high: e.annual_high,
    }));
}

/** True when the report carries evidence the canonical model considers valid. */
export function hasPricedEvidence(report: GoldenReportLike | null | undefined): boolean {
  if (!report) return false;
  return !!buildFinancialLedger(report as never).overall;
}

/**
 * The ONLY allowed leakage display path. Accepts a full report object
 * (preferred) or a bare top_leaks array (legacy callers).
 */
export function computeGoldenLeakage(
  input: GoldenReportLike | PricedLeak[] | null | undefined,
): GoldenLeakage | null {
  if (!input) return null;

  if (Array.isArray(input)) {
    const ledger = buildFinancialLedger({ top_leaks: input as never });
    return ledger.overall
      ? build(ledger.overall.annual_low, ledger.overall.annual_high, ledger.active.length, "ledger")
      : null;
  }

  const report = input;
  const ledger = resolveFinancialLedger(report as never);
  if (ledger.overall) {
    return build(
      ledger.overall.annual_low,
      ledger.overall.annual_high,
      ledger.active.length,
      "financial_ledger",
      ledger.currency,
      ledger.model_version,
    );
  }

  // Legacy reports that stored only a total and no reconstructable evidence.
  const legacy = report.overall_leakage;
  if (legacy && typeof legacy === "object") {
    const lo = parseMoney(legacy.annual_low);
    const hi = parseMoney(legacy.annual_high);
    if (lo != null || hi != null) {
      const a = lo ?? (hi as number);
      const b = hi ?? (lo as number);
      const low = Math.min(a, b);
      const high = Math.max(a, b);
      if (high > 0) {
        return build(
          low > 0 ? low : high,
          high,
          Number(legacy.priced_leak_count) > 0 ? Number(legacy.priced_leak_count) : 1,
          "legacy_persisted_total",
          legacy.currency || "USD",
          Number(legacy.calculation_version) > 0 ? Number(legacy.calculation_version) : 1,
        );
      }
    }
  }

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

/**
 * The persistable summary of the ledger. `overall_leakage` is NEVER
 * independently generated — it is a projection of the ledger.
 */
export function computeOverallLeakage(report: GoldenReportLike): CanonicalOverallLeakage | null {
  const ledger = buildFinancialLedger(report as never);
  if (!ledger.overall) return null;
  return {
    annual_low: ledger.overall.annual_low,
    annual_high: ledger.overall.annual_high,
    currency: "USD",
    source: "financial_ledger",
    priced_leak_count: ledger.active.length,
    calculation_version: LEAKAGE_CALCULATION_VERSION,
  };
}

/** Consistency guard: the persisted total must equal the ledger exactly. */
export function chapterSumMismatch(report: GoldenReportLike): string | null {
  const ledger = buildFinancialLedger(report as never);
  const ol = report.overall_leakage;
  if (!ledger.overall || !ol) return null;
  const lo = parseMoney(ol.annual_low);
  const hi = parseMoney(ol.annual_high);
  if (hi == null) return null;
  if (Math.round(hi) !== ledger.overall.annual_high || (lo != null && Math.round(lo) !== ledger.overall.annual_low)) {
    return `overall_leakage ${lo ?? "?"}/${hi} does not equal the financial ledger ${ledger.overall.annual_low}/${ledger.overall.annual_high}`;
  }
  return null;
}

/**
 * Completion invariant. A report may not publish contradictory numbers:
 * evidence must resolve, the persisted total must equal the ledger, and every
 * ledger invariant (chapter allocation equality, Top 10 rules, dedupe) holds.
 */
export function leakageInvariantError(report: GoldenReportLike): string | null {
  const ledger = buildFinancialLedger(report as never);
  if (ledger.overall && !report.overall_leakage) {
    return "priced evidence present but overall_leakage could not be resolved";
  }
  const hard = ledger.reconciliation.violations.filter((v) => v.code !== "scale_warning");
  if (hard.length) return hard.map((v) => `${v.code}: ${v.detail}`).join("; ");
  return chapterSumMismatch(report);
}
