import { describe, it, expect } from "vitest";
import {
  buildGoldenReportModel,
  estimatePageCount,
  executiveExportGate,
  modelText,
  EXECUTIVE_PAGE_CEILING,
  type GoldenReportModel,
} from "@/lib/goldenReportModel";

// ─────────────────────────── fixtures ───────────────────────────

function chapter(no: number, over: Record<string, unknown> = {}) {
  return {
    no,
    slug: `chapter-${no}`,
    title: `Chapter ${no}`,
    verdict: `Verdict ${no}`,
    what_we_found: `Finding ${no}: the quote request on /contact-${no} fails.`,
    why_its_leaking: `Form ${no} posts to a dead endpoint.`,
    what_its_costing: "$40,000 - $60,000 annually",
    annual_low: 40000,
    annual_high: 60000,
    evidence: [
      { label: "HTTP", value: "500 observed on /contact" },
      { label: "Scan", value: `Unique observation ${no}` },
    ],
    what_to_do: {
      day_30: ["Fix the contact form"],
      day_60: ["Instrument lead tracking"],
      owner: [`Owner for chapter ${no}`],
    },
    internal_debug_note: "tokens=1234 prompt_hash=abc",
    ...over,
  };
}

/** No chapters, no money: the report must still render honestly. */
const sparseReport = {
  executive_summary: "The site could only be partially crawled.",
  chapters: [
    { no: 1, slug: "chapter-1", title: "Acquisition" },
    { no: 2, slug: "chapter-2", title: "Conversion" },
  ],
};

const normalReport = {
  executive_summary: "Revenue is leaking through a broken contact path.",
  chapters: [chapter(1), chapter(2), chapter(3), chapter(4)],
  top_leaks: [
    { title: "Broken contact form", slug: "chapter-1", dollars_low: 40000, dollars_high: 60000, basis: "500 on /contact" },
    { title: "No lead tracking", slug: "chapter-2", dollars_low: 20000, dollars_high: 35000, basis: "no analytics tags" },
  ],
  remediation: { day_30: ["Fix the contact form"], day_60: ["Instrument lead tracking"], day_90: ["Review quarterly"] },
};

const complexReport = {
  executive_summary: "Multiple compounding leaks across the funnel.",
  chapters: Array.from({ length: 14 }, (_, i) => chapter(i + 1)),
  top_leaks: Array.from({ length: 18 }, (_, i) => ({
    title: `Leak ${i + 1}`,
    slug: `chapter-${(i % 14) + 1}`,
    dollars_low: 10000 + i * 1000,
    dollars_high: 20000 + i * 1500,
    basis: `evidence ${i + 1}`,
  })),
  deliverables: {
    brand: { value_proposition: "We fix leaks", positioning: "Forensic operator" },
    posts: Array.from({ length: 8 }, (_, i) => ({ platform: "LinkedIn", hook: `Hook ${i}`, body: "Body copy" })),
  },
  remediation: { day_30: ["Fix forms"], day_60: ["Add tracking"], day_90: ["Quarterly review"] },
};

function build(profile: "executive" | "complete" | "data_appendix", report: Record<string, unknown>): GoldenReportModel {
  return buildGoldenReportModel({ report, company: "Acme", url: "https://acme.test", scanId: "scan-fixture", profile });
}

// ─────────────────────────── tests ───────────────────────────

describe("fixture: sparse report", () => {
  const exec = build("executive", sparseReport);

  it("collapses empty chapters into one coverage gap section", () => {
    expect(exec.sections.some((s) => s.id === "coverage-gaps")).toBe(true);
    expect(exec.sections.some((s) => s.id.startsWith("chapter-"))).toBe(false);
  });

  it("stays far under the page ceiling", () => {
    expect(estimatePageCount(exec)).toBeLessThan(EXECUTIVE_PAGE_CEILING);
  });

  it("still names the company and the scan", () => {
    expect(modelText(exec)).toContain("Acme");
    expect(modelText(exec)).toContain("scan-fixture");
  });
});

describe("fixture: normal report", () => {
  const exec = build("executive", normalReport);
  const text = modelText(exec);

  it("renders chapters and stays within the page budget", () => {
    expect(exec.sections.some((s) => s.id === "chapter-1")).toBe(true);
    expect(estimatePageCount(exec)).toBeLessThanOrEqual(EXECUTIVE_PAGE_CEILING);
  });

  it("prints a repeated evidence line only once", () => {
    const hits = text.split("500 observed on /contact").length - 1;
    expect(hits).toBeLessThanOrEqual(1);
  });

  it("keeps horizon actions in the single roadmap, not per chapter", () => {
    expect(exec.sections.some((s) => s.id === "remediation-roadmap")).toBe(true);
    expect(text.split("Fix the contact form").length - 1).toBe(1);
  });

  it("omits internal debug fields from the client deliverable", () => {
    expect(text).not.toContain("prompt_hash");
    expect(modelText(build("complete", normalReport))).toContain("prompt_hash");
  });

  it("is materially shorter than the archival profile", () => {
    expect(estimatePageCount(exec)).toBeLessThan(estimatePageCount(build("complete", normalReport)));
  });
});

describe("fixture: complex report", () => {
  const exec = build("executive", complexReport);
  const text = modelText(exec);

  it("drops growth assets from the executive deliverable but keeps them archival", () => {
    expect(text).not.toContain("Ready To Publish Posts");
    expect(modelText(build("complete", complexReport))).toContain("Ready To Publish Posts");
  });

  it("never renders two competing Top 10 sections", () => {
    expect(exec.sections.filter((s) => s.id === "top-leaks").length).toBe(1);
  });

  it("either fits the ceiling or is gated for fallback", () => {
    const gate = executiveExportGate(exec);
    expect(gate.ok || gate.estimatedPages > EXECUTIVE_PAGE_CEILING).toBe(true);
  });
});

describe("layout density QA", () => {
  it("does not force a page break for every chapter", () => {
    const exec = build("executive", normalReport);
    const chapters = exec.sections.filter((s) => s.id.startsWith("chapter-"));
    expect(chapters.length).toBeGreaterThan(0);
    expect(chapters.every((s) => s.newPage)).toBe(false);
  });

  it("marks low-content sections compact rather than leaving a near-empty page", () => {
    const exec = build("executive", sparseReport);
    const gapSection = exec.sections.find((s) => s.id === "coverage-gaps");
    expect(gapSection?.density).toBe("compact");
    expect(gapSection?.newPage).toBe(false);
  });
});

describe("export gating", () => {
  it("blocks an executive export when the report awaits financial regeneration", () => {
    const report = { ...normalReport, report_state: "regeneration_required" };
    const gate = executiveExportGate(build("executive", report), undefined, report);
    expect(gate.ok).toBe(false);
    expect(gate.reasons.join(" ")).toMatch(/regeneration/i);
  });

  it("blocks on unresolved compiler contradictions", () => {
    const report = {
      ...normalReport,
      compiler_audit: { violations: [{ code: "MONEY_MISMATCH", detail: "chapter total disagrees with ledger" }] },
    };
    const gate = executiveExportGate(build("executive", report), undefined, report);
    expect(gate.ok).toBe(false);
    expect(gate.reasons.join(" ")).toContain("MONEY_MISMATCH");
  });

  it("passes a clean report", () => {
    expect(executiveExportGate(build("executive", normalReport), undefined, normalReport).ok).toBe(true);
  });
});

describe("backwards compatibility", () => {
  it("renders a pre-v5 legacy report without throwing", () => {
    const legacy = {
      summary: "Legacy narrative",
      chapters: [{ no: 1, slug: "legacy", title: "Legacy Chapter", what_we_found: "Something old" }],
      total_annual_leak: "$100,000",
    };
    for (const profile of ["executive", "complete", "data_appendix"] as const) {
      const model = build(profile, legacy);
      expect(model.sections.length).toBeGreaterThan(0);
      expect(model.profile).toBe(profile);
    }
  });

  it("defaults to the complete profile when none is given", () => {
    const model = buildGoldenReportModel({
      report: normalReport,
      company: "Acme",
      url: "https://acme.test",
      scanId: "scan-legacy",
    });
    expect(["complete", "executive"]).toContain(model.profile);
  });
});
