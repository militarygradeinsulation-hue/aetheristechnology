import { describe, it, expect } from "vitest";
import {
  buildGoldenReportModel,
  dedupeEvidence,
  evidenceKey,
  groupByRootCause,
  chapterIsEmpty,
  collectRoadmap,
  estimatePageCount,
  executiveExportGate,
  EXECUTIVE_PAGE_CEILING,
  type GoldenReportModel,
} from "@/lib/goldenReportModel";
import type { LedgerEntry } from "@/lib/goldenLedger";

function chapter(no: number, over: Record<string, unknown> = {}) {
  return {
    no,
    slug: `chapter-${no}`,
    title: `Chapter ${no}`,
    verdict: `Verdict ${no}`,
    what_we_found: `Finding ${no}: the booking form on /contact returns a 500.`,
    why_its_leaking: `Because form ${no} fails silently.`,
    what_its_costing: "$40,000 - $60,000 annually",
    annual_low: 40000,
    annual_high: 60000,
    evidence: [{ label: "HTTP", value: `500 observed on /contact-${no}` }],
    internal_debug_blob: { tokens: 1234, prompt_hash: "abc" },
    ...over,
  };
}

const baseReport = {
  executive_summary: "Revenue is leaking through a broken contact path.",
  chapters: [chapter(1), chapter(2)],
  top_leaks: [
    { title: "Broken contact form", slug: "chapter-1", dollars_low: 40000, dollars_high: 60000, basis: "500 observed on /contact" },
  ],
  remediation: { day_30: ["Fix the contact form"], day_60: ["Instrument lead tracking"], day_90: ["Review quarterly"] },
};

function build(profile: "executive" | "complete" | "data_appendix", report: Record<string, unknown> = baseReport): GoldenReportModel {
  return buildGoldenReportModel({ report, company: "Acme", url: "https://acme.test", scanId: "scan-1", profile });
}

describe("evidence dedupe", () => {
  it("normalises case, punctuation and tracking params", () => {
    expect(evidenceKey("HTTP 500 on /contact?utm_source=x")).toBe(evidenceKey("http 500 on /contact!"));
  });

  it("removes repeats and keeps first-seen order", () => {
    expect(dedupeEvidence(["A fact", "a fact.", "B fact", ""])).toEqual(["A fact", "B fact"]);
  });

  it("dedupes globally when a shared seen-set is passed", () => {
    const seen = new Set<string>();
    expect(dedupeEvidence(["A fact"], seen)).toEqual(["A fact"]);
    expect(dedupeEvidence(["a fact"], seen)).toEqual([]);
  });
});

describe("root cause grouping", () => {
  it("groups entries sharing a root cause and sorts by exposure", () => {
    const e = (id: string, root: string, high: number): LedgerEntry => ({
      leak_id: id,
      root_cause_id: root,
      fingerprint: id,
      title: id,
      annual_low: 0,
      annual_high: high,
      currency: "USD",
      pricing_basis: "",
      evidence_refs: [],
      confidence: "medium",
      primary_chapter: "c",
      cross_referenced_chapters: [],
      status: "active",
      origin: "chapter",
      calculation_version: 6,
    });
    const groups = groupByRootCause([e("a", "r1", 10), e("b", "r1", 20), e("c", "r2", 50)]);
    expect(groups).toHaveLength(2);
    expect(groups[0].root_cause_id).toBe("r2");
    expect(groups[1].entries).toHaveLength(2);
  });
});

describe("executive profile", () => {
  it("defaults to the complete profile for existing callers", () => {
    const model = buildGoldenReportModel({ report: baseReport, company: "Acme", url: "u", scanId: "s" });
    expect(model.profile).toBe("complete");
  });

  it("omits internal machinery the archival profile keeps", () => {
    const exec = JSON.stringify(build("executive"));
    const full = JSON.stringify(build("complete"));
    expect(full).toContain("Internal Debug Blob");
    expect(exec).not.toContain("Internal Debug Blob");
  });

  it("keeps the executive summary and chapter findings", () => {
    const exec = build("executive");
    const ids = exec.sections.map((s) => s.id);
    expect(ids).toContain("executive-summary");
    expect(ids).toContain("chapter-1");
    expect(JSON.stringify(exec)).toContain("Finding 1");
  });

  it("adds one central roadmap instead of per-chapter plans", () => {
    const exec = build("executive");
    const roadmaps = exec.sections.filter((s) => s.id === "remediation-roadmap");
    expect(roadmaps).toHaveLength(1);
    expect(JSON.stringify(roadmaps[0])).toContain("Fix the contact form");
  });

  it("adds visual summaries that always carry a text fallback", () => {
    const charts = build("executive").sections.flatMap((s) => s.blocks).filter((b) => b.kind === "chart");
    expect(charts.length).toBeGreaterThan(0);
    for (const c of charts) expect((c as { fallback?: unknown }).fallback).toBeTruthy();
  });

  it("lists empty chapters as coverage gaps rather than blank pages", () => {
    const report = { ...baseReport, chapters: [chapter(1), { no: 2, slug: "chapter-2", title: "Chapter 2" }] };
    const exec = build("executive", report);
    const gap = exec.sections.find((s) => s.id === "coverage-gaps");
    expect(gap).toBeTruthy();
    expect(JSON.stringify(gap)).toContain("Chapter 2");
    expect(exec.sections.find((s) => s.id === "chapter-2")).toBeUndefined();
  });

  it("does not repeat the same evidence line across chapters", () => {
    const shared = [{ label: "HTTP", value: "500 observed on /contact" }];
    const report = { ...baseReport, chapters: [chapter(1, { evidence: shared }), chapter(2, { evidence: shared })] };
    const monoLines = build("executive", report)
      .sections.flatMap((s) => s.blocks)
      .filter((b) => b.kind === "mono")
      .flatMap((b) => (b as { lines: string[] }).lines);
    const hits = monoLines.filter((l) => l.includes("500 observed on /contact"));
    expect(hits).toHaveLength(1);
  });
});

describe("financial classification", () => {
  it("keeps illustrative scenarios out of the totals and labels them", () => {
    const report = {
      ...baseReport,
      top_leaks: [
        ...(baseReport.top_leaks as unknown[]),
        {
          title: "Category benchmark upside",
          slug: "unmapped",
          dollars_low: 900000,
          dollars_high: 1200000,
          basis: "Illustrative industry average for the category, not measured on this site.",
        },
      ],
    };
    const exec = build("executive", report);
    const section = exec.sections.find((s) => s.id === "illustrative-scenarios");
    expect(section).toBeTruthy();
    expect(JSON.stringify(section)).toContain("Category benchmark upside");
    expect(exec.leakage?.high ?? 0).toBeLessThan(900000);
  });
});

describe("page budget and export gate", () => {
  it("keeps a normal report inside the executive ceiling", () => {
    const model = build("executive");
    expect(estimatePageCount(model)).toBeLessThanOrEqual(EXECUTIVE_PAGE_CEILING);
    expect(executiveExportGate(model).ok).toBe(true);
  });

  it("produces fewer pages than the archival profile", () => {
    const bulky = {
      ...baseReport,
      chapters: Array.from({ length: 14 }, (_, i) => chapter(i + 1)),
    };
    expect(estimatePageCount(build("executive", bulky))).toBeLessThan(estimatePageCount(build("complete", bulky)));
  });

  it("refuses the export when the page ceiling is blown", () => {
    const huge = build("complete", {
      ...baseReport,
      chapters: Array.from({ length: 60 }, (_, i) => chapter(i + 1)),
    });
    expect(executiveExportGate(huge).ok).toBe(false);
  });
});

describe("data appendix profile", () => {
  it("emits the ledger and no client prose", () => {
    const appendix = build("data_appendix");
    expect(appendix.profile).toBe("data_appendix");
    expect(appendix.sections.map((s) => s.id)).toContain("ledger-entries");
    expect(appendix.sections.find((s) => s.id === "executive-summary")).toBeUndefined();
  });
});

describe("helpers", () => {
  it("detects empty chapters", () => {
    expect(chapterIsEmpty({ no: 1, slug: "a", title: "A" })).toBe(true);
    expect(chapterIsEmpty(chapter(1))).toBe(false);
  });

  it("collects and dedupes roadmap items by horizon", () => {
    const items = collectRoadmap({
      a: { day_30: ["Fix form", "fix form."] },
      b: { chapters: [{ day_90: "Review quarterly" }] },
    });
    expect(items.filter((i) => i.horizon === "30")).toHaveLength(1);
    expect(items.find((i) => i.horizon === "90")?.item).toBe("Review quarterly");
  });
});
