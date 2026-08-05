import { describe, expect, it } from "vitest";
import {
  NEUTRAL_LEAK_SENTENCE,
  renderLeakPlaceholders,
  sanitizeGoldenReportFinancials,
  sanitizedGoldenReport,
} from "./goldenMoneySanitizer";

// A legacy-shaped report: structured leak fields and prose both carry stale
// amounts that predate the canonical ledger.
function legacyReport() {
  return {
    company_name: "Aspen Carbon Cat",
    executive_summary:
      "Aspen is leaking $17,200 to $36,500 per year in unbooked service work. Their published maintenance plan starts at $2,400 per unit.",
    overall_leakage: { annual_low: 1_400_000, annual_high: 2_200_000 },
    top_leaks: [
      {
        rank: 1,
        name: "Quote follow-up gap",
        chapter_slug: "sales-pipeline",
        dollars_low: 220_800,
        dollars_high: 341_500,
        basis: "12 stalled quotes at an $18,400 average job value",
        summary: "Annual exposure of $17,200 to $36,500 from stalled quotes.",
      },
      {
        rank: 2,
        name: "Site conversion friction",
        chapter_slug: "conversion",
        dollars_low: 21_000,
        dollars_high: 44_000,
        basis: "38 service pages, 2% close rate",
        summary: "Forms bury the phone number.",
      },
    ],
    chapters: [
      {
        no: 1,
        slug: "sales-pipeline",
        title: "Sales Pipeline",
        verdict: "Quotes go cold.",
        what_we_found: "12 quotes older than 30 days.",
        why_its_leaking: "No follow-up cadence exists.",
        what_its_costing:
          "That is an annual leak of $17,200 to $36,500, against an average job value of $18,400.",
        cost_usd: 17_200,
        annual_low: 220_800,
        annual_high: 341_500,
        cost_basis: "12 quotes x $18,400",
        evidence: [{ label: "Average job value", value: "$18,400 stated on the pricing page" }],
        what_to_do: { this_week: ["Call the 12 stalled quotes, worth $17,200 to $36,500 a year."] },
      },
      {
        no: 2,
        slug: "conversion",
        title: "Conversion",
        what_its_costing: "Revenue loss of {{CHAPTER_ANNUAL_RANGE}} per year.",
        annual_low: 21_000,
        annual_high: 44_000,
      },
    ],
    recommendations: ["Recover the $17,200 to $36,500 in stalled quotes this quarter."],
  };
}

const allText = (v: unknown): string => JSON.stringify(v);

describe("golden money sanitizer", () => {
  it("removes stale prose leak ranges that the ledger does not back", () => {
    const { report } = sanitizeGoldenReportFinancials(legacyReport() as never);
    const text = allText(report);
    // The ledger allocates $220,800-$341,500 to this chapter, so the stale
    // legacy range must be gone from every prose and structured surface.
    expect(text).not.toContain("$17,200 to $36,500");
    expect(text).not.toContain("17,200");
    expect(text).not.toContain("36,500");
  });

  it("keeps legitimate non-leak dollar evidence", () => {
    const { report } = sanitizeGoldenReportFinancials(legacyReport() as never);
    expect(allText(report)).toContain("18,400");
  });

  it("replaces an unbacked leak sentence with neutral text", () => {
    const { report } = sanitizeGoldenReportFinancials(legacyReport() as never);
    expect(allText(report)).toContain(NEUTRAL_LEAK_SENTENCE.slice(0, 20));
  });

  it("rewrites structured legacy fields to ledger values", () => {
    const { report } = sanitizeGoldenReportFinancials(legacyReport() as never);
    const r = report as never as ReturnType<typeof legacyReport> & {
      chapters: Array<Record<string, unknown>>;
    };
    expect(r.chapters[0].cost_usd).toBeUndefined();
    expect(typeof r.chapters[0].annual_low).toBe("number");
    expect(r.overall_leakage.annual_low).toBeLessThanOrEqual(r.overall_leakage.annual_high);
  });

  it("never leaves a raw placeholder token in output", () => {
    const { report } = sanitizeGoldenReportFinancials(legacyReport() as never);
    const text = allText(report);
    expect(text).not.toContain("{{CHAPTER_ANNUAL_RANGE}}");
    expect(text).not.toContain("{{REPORT_ANNUAL_TOTAL}}");
    expect(text).not.toContain("{{LEAK_ANNUAL_RANGE}}");
  });

  it("renders placeholders from supplied ledger labels", () => {
    expect(
      renderLeakPlaceholders("Costing {{CHAPTER_ANNUAL_RANGE}} a year.", { chapter: "$10,000 to $20,000" }),
    ).toBe("Costing $10,000 to $20,000 a year.");
  });

  it("is a no-op-safe pass for null reports", () => {
    expect(sanitizedGoldenReport(null)).toBeNull();
    expect(sanitizedGoldenReport(undefined)).toBeUndefined();
  });

  it("is idempotent", () => {
    const once = sanitizedGoldenReport(legacyReport() as never);
    const twice = sanitizedGoldenReport(once);
    expect(allText(twice)).toBe(allText(once));
  });
});
