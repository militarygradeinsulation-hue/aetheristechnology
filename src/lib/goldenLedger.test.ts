import { describe, it, expect } from "vitest";
import {
  buildFinancialLedger,
  resolveFinancialLedger,
  chapterAllocation,
  crossReferencedIn,
  needsFinancialRegeneration,
  parseMoney,
  fingerprintOf,
  formatUsdRange,
  formatUsdRangeAscii,
  FINANCIAL_MODEL_VERSION,
  REGENERATION_LABEL,
  type LedgerReportLike,
} from "@/lib/goldenLedger";
import { computeGoldenLeakage } from "@/lib/goldenLeakage";
import { buildGoldenReportModel, modelText } from "@/lib/goldenReportModel";

const ch = (slug: string, extra: Record<string, unknown> = {}) => ({
  no: 1,
  slug,
  title: slug,
  what_we_found: "Finding.",
  ...extra,
});

const meta = { company: "Test Co", url: "https://test.example", scanId: "scan-1" };

// ── invariants ───────────────────────────────────────────────────────────────
describe("ledger invariants", () => {
  const report: LedgerReportLike = {
    top_leaks: [
      { name: "Slow intake", chapter_slug: "conversion", dollars_low: 10_000, dollars_high: 20_000 },
      { name: "Dead SEO pages", chapter_slug: "seo", dollars_low: 4_000, dollars_high: 9_000 },
    ],
    chapters: [ch("conversion"), ch("seo"), ch("brand", { what_its_costing: "About $2,000 annually." })],
  } as never;

  it("overall equals the sum of unique active entries, counted once", () => {
    const l = buildFinancialLedger(report);
    const sum = l.active.reduce(
      (a, e) => ({ low: a.low + e.annual_low, high: a.high + e.annual_high }),
      { low: 0, high: 0 },
    );
    expect(l.overall).toEqual({ annual_low: sum.low, annual_high: sum.high });
    expect(l.overall).toEqual({ annual_low: 16_000, annual_high: 31_000 });
  });

  it("chapter allocations sum exactly to the overall total", () => {
    const l = buildFinancialLedger(report);
    const t = l.chapters.reduce(
      (a, c) => ({ low: a.low + c.annual_low, high: a.high + c.annual_high }),
      { low: 0, high: 0 },
    );
    expect([t.low, t.high]).toEqual([l.overall!.annual_low, l.overall!.annual_high]);
    expect(l.reconciliation.invariant_status).toBe("ok");
  });

  it("Top 10 subtotal equals overall when there are 10 or fewer priced leaks", () => {
    const l = buildFinancialLedger(report);
    expect(l.top10.priced_count).toBeLessThanOrEqual(10);
    expect(l.top10.remaining_count).toBe(0);
    expect([l.top10.subtotal_low, l.top10.subtotal_high]).toEqual([
      l.overall!.annual_low,
      l.overall!.annual_high,
    ]);
  });

  it("Top 10 subtotal plus remainder equals overall for large reports", () => {
    const big: LedgerReportLike = {
      top_leaks: Array.from({ length: 17 }, (_, i) => ({
        name: `Leak ${i}`,
        chapter_slug: `c${i}`,
        dollars_low: 1_000 + i * 100,
        dollars_high: 2_000 + i * 250,
      })),
      chapters: Array.from({ length: 17 }, (_, i) => ch(`c${i}`)),
    } as never;
    const l = buildFinancialLedger(big);
    expect(l.top10.entries).toHaveLength(10);
    expect(l.top10.remaining_count).toBe(7);
    expect(l.top10.remainder).toHaveLength(7);
    expect(l.top10.subtotal_low + l.top10.remainder_low).toBe(l.overall!.annual_low);
    expect(l.top10.subtotal_high + l.top10.remainder_high).toBe(l.overall!.annual_high);
    expect(l.top10.label).toBe("Top 10 of 17 priced leaks");
    expect(l.top10.subtotal_high).toBeLessThanOrEqual(l.overall!.annual_high);
  });

  it("ranks the Top 10 deterministically by annual_high desc", () => {
    const l = buildFinancialLedger({
      top_leaks: [
        { name: "small", chapter_slug: "a", dollars_low: 100, dollars_high: 200 },
        { name: "big", chapter_slug: "b", dollars_low: 900, dollars_high: 5_000 },
      ],
      chapters: [ch("a"), ch("b")],
    } as never);
    expect(l.top10.entries.map((e) => e.title)).toEqual(["big", "small"]);
    const again = buildFinancialLedger({
      top_leaks: [
        { name: "big", chapter_slug: "b", dollars_low: 900, dollars_high: 5_000 },
        { name: "small", chapter_slug: "a", dollars_low: 100, dollars_high: 200 },
      ],
      chapters: [ch("b"), ch("a")],
    } as never);
    expect(again.top10.entries.map((e) => e.title)).toEqual(["big", "small"]);
  });
});

// ── deduplication ────────────────────────────────────────────────────────────
describe("deduplication", () => {
  it("prices the same root cause once, keeping the higher exposure", () => {
    const l = buildFinancialLedger({
      top_leaks: [
        { name: "Missing Schema Markup", chapter_slug: "seo", dollars_low: 1_000, dollars_high: 2_000 },
        { name: "missing  schema   markup", chapter_slug: "tech", dollars_low: 1_500, dollars_high: 3_000 },
      ],
      chapters: [ch("seo"), ch("tech")],
    } as never);
    expect(l.active).toHaveLength(1);
    expect(l.overall).toEqual({ annual_low: 1_500, annual_high: 3_000 });
    expect(l.reconciliation.duplicate_count).toBe(1);
  });

  it("allocates a leak to one chapter and cross-references the other", () => {
    const l = buildFinancialLedger({
      top_leaks: [{ name: "Intake gap", chapter_slug: "conversion", dollars_low: 5_000, dollars_high: 7_000 }],
      chapters: [ch("conversion", { annual_low: 8_000, annual_high: 12_000 }), ch("seo")],
    } as never);
    // The chapter prices itself, so the leak is explained but not re-counted.
    expect(l.overall).toEqual({ annual_low: 8_000, annual_high: 12_000 });
    const xr = crossReferencedIn(l, "conversion");
    expect(xr.map((e) => e.title)).toEqual(["Intake gap"]);
    expect(xr[0].status).toBe("included_in_chapter");
  });

  it("fingerprints ignore case, punctuation and word order noise", () => {
    expect(fingerprintOf("Dead SEO Pages")).toBe(fingerprintOf("dead   seo, pages!"));
  });
});

// ── value hygiene ────────────────────────────────────────────────────────────
describe("value hygiene", () => {
  it("parses money strings and rejects junk, zero, NaN and absurd values", () => {
    expect(parseMoney("$1.2M")).toBe(1_200_000);
    expect(parseMoney("12k")).toBe(12_000);
    expect(parseMoney("$-4,500")).toBe(4_500);
    for (const v of [0, "$0", "n/a", "TBD", NaN, Infinity, null, undefined, 1e12]) {
      expect(parseMoney(v as unknown)).toBeNull();
    }
  });

  it("normalizes a reversed range", () => {
    const l = buildFinancialLedger({
      top_leaks: [{ name: "x", chapter_slug: "a", dollars_low: 9_000, dollars_high: 1_000 }],
      chapters: [ch("a")],
    } as never);
    expect(l.overall).toEqual({ annual_low: 1_000, annual_high: 9_000 });
  });

  it("keeps a finding unpriced rather than inventing money", () => {
    const l = buildFinancialLedger({
      top_leaks: [{ name: "unpriceable", chapter_slug: "a" }],
      chapters: [ch("a", { what_its_costing: "Not quantifiable from this scan." })],
    } as never);
    expect(l.overall).toBeNull();
    expect(l.active).toHaveLength(0);
    expect(l.reconciliation.unpriced_count).toBeGreaterThan(0);
  });

  it("flags a wildly disproportionate report total instead of publishing it silently", () => {
    const l = buildFinancialLedger({
      top_leaks: Array.from({ length: 6 }, (_, i) => ({
        name: `huge ${i}`,
        chapter_slug: `c${i}`,
        dollars_low: 5_000_000,
        dollars_high: 9_000_000,
      })),
      chapters: Array.from({ length: 6 }, (_, i) => ch(`c${i}`)),
    } as never);
    expect(l.reconciliation.invariant_status).not.toBe("ok");
    expect(l.reconciliation.violations.map((v) => v.code)).toContain("scale_warning");
  });

  it("never lets a roll-up chapter contribute its own money", () => {
    const l = buildFinancialLedger({
      top_leaks: [{ name: "real", chapter_slug: "seo", dollars_low: 1_000, dollars_high: 2_000 }],
      chapters: [
        ch("seo"),
        ch("top-10-leaks", { what_its_costing: "Total annual loss of $500,000 - $900,000." }),
      ],
    } as never);
    expect(l.overall).toEqual({ annual_low: 1_000, annual_high: 2_000 });
    expect(chapterAllocation(l, "top-10-leaks")).toBeNull();
  });
});

// ── legacy shapes and reopen parity ──────────────────────────────────────────
describe("legacy shapes and parity", () => {
  it("recomputes rather than trusting a stale persisted ledger version", () => {
    const stale = {
      financial_ledger: { model_version: 1, entries: [], active: [], overall: { annual_low: 1, annual_high: 2 } },
      top_leaks: [{ name: "a", chapter_slug: "x", dollars_low: 3_000, dollars_high: 4_000 }],
      chapters: [ch("x")],
    } as never;
    expect(resolveFinancialLedger(stale).overall).toEqual({ annual_low: 3_000, annual_high: 4_000 });
  });

  it("reuses a current-version persisted ledger byte-for-byte on reopen", () => {
    const built = buildFinancialLedger({
      top_leaks: [{ name: "a", chapter_slug: "x", dollars_low: 3_000, dollars_high: 4_000 }],
      chapters: [ch("x")],
    } as never);
    expect(built.model_version).toBe(FINANCIAL_MODEL_VERSION);
    const reopened = resolveFinancialLedger({ financial_ledger: built } as never);
    expect(reopened).toBe(built);
  });

  it("reads legacy string money and legacy field names", () => {
    const l = buildFinancialLedger({
      top_leaks: [
        { name: "a", chapter_slug: "x", low: "5,000", high: "9,000" },
        { name: "b", chapter_slug: "y", estimated_annual_loss: "$3,000" },
      ],
      chapters: [ch("x"), ch("y")],
    } as never);
    expect(l.overall).toEqual({ annual_low: 8_000, annual_high: 12_000 });
  });

  it("labels an unreconcilable legacy report for regeneration", () => {
    const legacy = {
      chapters: [ch("top-10-leaks", { what_its_costing: "Costing about $250,000 a year." })],
    } as never;
    expect(needsFinancialRegeneration(legacy)).toBe(true);
    const model = buildGoldenReportModel({ report: legacy, ...meta });
    expect(modelText(model)).toContain(REGENERATION_LABEL);
  });

  it("the leakage resolver and the ledger always agree", () => {
    const report = {
      top_leaks: [{ name: "a", chapter_slug: "x", dollars_low: 3_000, dollars_high: 4_000 }],
      chapters: [ch("x"), ch("y", { what_its_costing: "$1,000 annually." })],
    } as never;
    const l = buildFinancialLedger(report);
    const leak = computeGoldenLeakage(report)!;
    expect([leak.low, leak.high]).toEqual([l.overall!.annual_low, l.overall!.annual_high]);
    expect(leak.source).toBe("financial_ledger");
  });
});

// ── display parity ───────────────────────────────────────────────────────────
describe("website and PDF format the same values", () => {
  it("formats one shared USD range for both surfaces", () => {
    expect(formatUsdRange(1_000, 2_000)).toBe("$1,000 – $2,000");
    expect(formatUsdRangeAscii(1_000, 2_000)).toBe("$1,000 - $2,000");
  });

  it("chapter, Top 10 and cover totals are identical strings in the export", () => {
    const report = {
      executive_summary: "Summary.",
      top_leaks: [
        { name: "a", chapter_slug: "x", dollars_low: 3_000, dollars_high: 4_000 },
        { name: "b", chapter_slug: "y", dollars_low: 1_000, dollars_high: 2_000 },
      ],
      chapters: [ch("x"), ch("y")],
    } as never;
    const l = buildFinancialLedger(report);
    const text = modelText(buildGoldenReportModel({ report, ...meta }));
    const total = formatUsdRangeAscii(l.overall!.annual_low, l.overall!.annual_high);
    expect(text).toContain(total); // cover
    expect(text).toContain("Top 10 subtotal");
    expect(text).toContain(formatUsdRangeAscii(3_000, 4_000)); // chapter allocation
  });
});
