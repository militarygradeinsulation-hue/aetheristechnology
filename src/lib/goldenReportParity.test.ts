import { describe, it, expect } from "vitest";
import {
  buildGoldenReportModel,
  auditGoldenReportParity,
  modelText,
  collectDisplayedLeaves,
} from "@/lib/goldenReportModel";
import { generateForensicGoldenPdf, auditGoldenPdfParity } from "@/lib/generateForensicGoldenPdf";

import { QA_FULL_REPORT as fullReport, QA_META as meta } from "./goldenReportParity.fixture";
import { QA_CHAPTER as chapter } from "./goldenReportParity.fixture";


const build = (report: unknown) =>
  buildGoldenReportModel({ report: report as Record<string, unknown>, ...meta });

describe("golden report view model", () => {
  it("carries every saved website field into the PDF model (parity audit passes)", () => {
    const { audit } = auditGoldenPdfParity({ report: fullReport as never, ...meta });
    expect(audit.issues).toEqual([]);
    expect(audit.ok).toBe(true);
    expect(audit.checkedLeaves).toBeGreaterThan(200);
  });

  it("exports executive summary, top leaks, all chapters and all growth assets", () => {
    const model = build(fullReport);
    const ids = model.sections.map((s) => s.id);
    expect(ids).toContain("executive-summary");
    expect(ids).toContain("top-leaks");
    expect(ids).toContain("brand");
    expect(ids).toContain("imagery");
    expect(ids).toContain("posts");
    expect(ids).toContain("schedule");
    for (let n = 1; n <= 14; n++) expect(ids).toContain(`chapter-${n}`);
  });

  it("uses the canonical leakage resolver and never a hardcoded range", () => {
    const model = build(fullReport);
    expect(model.leakage?.rangeLabelAscii).toBe("$4,100 - $8,900");
    expect(modelText(model)).not.toMatch(/\$75,000|\$450,000/);
  });

  it("says 'Not calculated' instead of inventing a range when there is no priced evidence", () => {
    const noEvidence = { ...fullReport, overall_leakage: null, top_leaks: [], chapters: [{ no: 1, slug: "a", title: "A", what_its_costing: "Not quantified." }] };
    const model = build(noEvidence);
    expect(model.leakage).toBeNull();
    const leak = model.sections.find((s) => s.id === "leakage");
    expect(leak).toBeDefined();
    expect(modelText(model)).toContain("Not calculated");
    expect(modelText(model)).not.toMatch(/\$75,000|\$450,000/);
  });

  it("exports report_consistency detail and future consistency fields", () => {
    const model = build({
      ...fullReport,
      report_consistency: {
        ...fullReport.report_consistency,
        detected_findings: 18,
        uniquely_priced_leaks: 5,
        unique_root_causes: 4,
        site_type: "b2b_saas",
        future_added_field: "FUTURE-CONSISTENCY-VALUE",
      },
    });
    const text = modelText(model);
    expect(text).toContain("b2b_saas");
    expect(text).toContain("FUTURE-CONSISTENCY-VALUE");
  });

  it("routes unknown future top-level fields into the export automatically", () => {
    const model = build({ ...fullReport, brand_new_section: { headline: "FUTURE-TOP-LEVEL-VALUE", items: ["future item one"] } });
    const text = modelText(model);
    expect(text).toContain("FUTURE-TOP-LEVEL-VALUE");
    expect(text).toContain("future item one");
    const audit = auditGoldenReportParity({ ...fullReport, brand_new_section: { headline: "FUTURE-TOP-LEVEL-VALUE", items: ["future item one"] } }, model);
    expect(audit.ok).toBe(true);
  });

  it("surfaces the degraded-synthesis warning the website shows", () => {
    const model = build({ ...fullReport, synth_fallback: { degraded: true, chapters_fallback: [1, 2], chapters_total: 14 } });
    expect(modelText(model)).toMatch(/2 of 14 chapters fell back/);
  });

  it("renders every evidence item of every finding without capping arrays", () => {
    const many = { ...chapter(1), evidence: Array.from({ length: 25 }, (_, i) => ({ label: `E${i}`, value: `EVIDENCE-VALUE-${i}` })) };
    const model = build({ ...fullReport, chapters: [many] });
    const text = modelText(model);
    for (let i = 0; i < 25; i++) expect(text).toContain(`EVIDENCE-VALUE-${i}`);
  });


  it("keeps long prose intact — no truncation or ellipsis injection", () => {
    const long = "A ".repeat(4000) + "END-OF-LONG-CHAPTER";
    const model = build({ ...fullReport, chapters: [{ ...chapter(1), what_we_found: long }] });
    expect(modelText(model)).toContain("END-OF-LONG-CHAPTER");
    const audit = auditGoldenReportParity({ ...fullReport, chapters: [{ ...chapter(1), what_we_found: long }] }, model);
    expect(audit.ok).toBe(true);
  });

  it("ignores internal machinery keys in the parity audit", () => {
    const leaves = collectDisplayedLeaves(fullReport).map(([p]) => p);
    expect(leaves.some((p) => p.startsWith("compiler"))).toBe(false);
    expect(leaves.some((p) => p.endsWith(".slug"))).toBe(false);
  });
});

describe("golden report PDF", () => {
  it("renders a long report across many auto-flowed pages", () => {
    const doc = generateForensicGoldenPdf({ report: fullReport as never, ...meta });
    const pages = doc.getNumberOfPages();
    expect(pages).toBeGreaterThan(14);
    const text = JSON.stringify(doc.internal.pages);
    expect(text).not.toMatch(/75,000/);
  });

  it("still produces a valid PDF for a report with no evidence and no growth assets", () => {
    const bare = { executive_summary: "Short summary.", chapters: [chapter(1)] };
    const doc = generateForensicGoldenPdf({ report: bare as never, ...meta });
    expect(doc.getNumberOfPages()).toBeGreaterThanOrEqual(3);
  });

  it("refuses to export a report that failed the consistency gate", () => {
    const failed = { ...fullReport, compiler: { state: "needs_review" as const, violations: [{ code: "COUNT_MISMATCH", location: "exec", detail: "counts differ" }] } };
    expect(() => generateForensicGoldenPdf({ report: failed as never, ...meta })).toThrow(/consistency gate/);
  });
});
