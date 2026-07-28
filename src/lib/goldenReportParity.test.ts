import { describe, it, expect } from "vitest";
import {
  buildGoldenReportModel,
  auditGoldenReportParity,
  modelText,
  collectDisplayedLeaves,
} from "@/lib/goldenReportModel";
import { generateForensicGoldenPdf, auditGoldenPdfParity } from "@/lib/generateForensicGoldenPdf";

const chapter = (no: number) => ({
  no,
  slug: `chapter-${no}`,
  title: `Chapter ${no} Title`,
  verdict: `Verdict for chapter ${no}`,
  what_we_found: `Found ${no}: paragraph one.\n\nFound ${no}: paragraph two with a very long sentence that must wrap across several lines in the PDF without ever being truncated or replaced by an ellipsis.`,
  why_its_leaking: `Leaking because of reason ${no}.`,
  what_its_costing: `$1,000 - $2,000 per year for chapter ${no}.`,
  what_to_do: {
    this_week: [`Week action ${no}`],
    this_month: [`Month action ${no}`],
    this_quarter: [`Quarter action ${no}`],
  },
  evidence: [{ label: `Evidence label ${no}`, value: `Evidence value ${no}` }],
});

const fullReport = {
  executive_summary: "Executive paragraph one.\n\nExecutive paragraph two.",
  overall_leakage: {
    annual_low: 4100,
    annual_high: 8900,
    currency: "USD",
    source: "priced_leaks",
    priced_leak_count: 5,
    calculation_version: 2,
  },
  top_leaks: [
    { rank: 1, name: "Proof Is Not Doing Enough Work", summary: "No case studies surfaced in crawl.", dollars_low: 1000, dollars_high: 2200, chapter_slug: "content" },
    { rank: 2, name: "Diluted Call To Action", summary: "Four competing CTAs on the homepage.", dollars_low: 900, dollars_high: 1800, chapter_slug: "conversion" },
  ],
  deliverables: {
    brand: {
      positioning: "Positioning statement.",
      target_audience: "Operations leaders at mid-market manufacturers.",
      value_proposition: "One clear value proposition.",
      voice: { summary: "Operator-grade, direct.", do: ["Lead with outcomes"], dont: ["Use the word synergy"] },
      messaging_pillars: [{ title: "Pillar One", detail: "Pillar one detail." }],
      differentiators: ["Differentiator alpha"],
      color_guidance: { summary: "Palette summary.", palette: [{ hex: "#875A7B", role: "Primary", use: "Key metrics" }] },
      typography_guidance: { headline: "Headline font", body: "Body font", notes: "Typography notes." },
      corrections: [{ issue: "Issue text", fix: "Fix text" }],
    },
    imagery: {
      visual_style: "Documentary style.",
      subjects: ["Hands in motion"],
      composition: "Composition notes.",
      lighting: "Lighting notes.",
      color_treatment: "Color treatment notes.",
      show: ["Real business outcomes"],
      avoid: ["Stock-photo models"],
      prompts: [{ title: "Manufacturing Inventory Dashboard", prompt: "A factory floor supervisor holds a tablet showing SKU counts." }],
    },
    posts: Array.from({ length: 12 }, (_, i) => ({
      platform: "LinkedIn",
      hook: `Hook number ${i + 1}`,
      body: `Body copy number ${i + 1}.`,
      cta: `CTA number ${i + 1}`,
      visual: `Visual note ${i + 1}`,
    })),
    schedule: {
      overview: "Thirty day schedule overview.",
      days: Array.from({ length: 30 }, (_, i) => ({
        day: i + 1,
        platform: "LinkedIn",
        time: "8:30 AM ET",
        purpose: "authority",
        topic: `Topic for day ${i + 1}`,
        visual: `Carousel concept for day ${i + 1}`,
      })),
    },
  },
  chapters: Array.from({ length: 14 }, (_, i) => chapter(i + 1)),
  report_consistency: {
    canonical_counts_sentence: "This report documents 18 findings and 5 uniquely priced leaks.",
    evidence_quality: {
      verified: 10, verified_pct: 55,
      inferred: 5, inferred_pct: 28,
      unverified: 3, unverified_pct: 17,
      contradicted: 0, contradicted_pct: 0,
    },
  },
  compiler: { state: "compiled" as const, violations: [], repairs: [] },
};

const meta = { company: "Odoo", url: "www.odoo.com", scanId: "7d4630c0-8bb6-490a-a8f4-2dc1cd72008d" };

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
