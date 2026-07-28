import { describe, expect, it } from "vitest";
import { detectGenericReport } from "@/lib/goldenGenericDetector";
import { compileGoldenReport } from "@/lib/goldenCompiler";
import { computeGoldenLeakage } from "@/lib/goldenLeakage";

/** The exact five-category boilerplate that produced the $75,000 – $450,000 headline. */
const GENERIC_TOP_LEAKS = [
  { rank: 1, name: "Pipeline & follow-up bleed", dollars_low: 24_000, dollars_high: 180_000, chapter_slug: "pipeline-forensics" },
  { rank: 2, name: "Site conversion friction", dollars_low: 18_000, dollars_high: 72_000, chapter_slug: "site-autopsy" },
  { rank: 3, name: "Lead hygiene & workflow gaps", dollars_low: 12_000, dollars_high: 90_000, chapter_slug: "lead-hygiene" },
  { rank: 4, name: "Competitive & SEO position", dollars_low: 12_000, dollars_high: 60_000, chapter_slug: "competitive" },
  { rank: 5, name: "Brand voice contradictions", dollars_low: 9_000, dollars_high: 48_000, chapter_slug: "brand-contradictions" },
];

const genericReport = () => ({
  executive_summary:
    "Hallmark Homes was scanned across every forensic tool in the Aetheris stack. Every chapter that follows is populated with conservative annualised exposure ranges grounded in standard SMB leak math for a business at Hallmark Homes's public profile.",
  top_leaks: GENERIC_TOP_LEAKS,
  chapters: [
    {
      slug: "site-autopsy",
      verdict: "Hallmark Homes shows visible leak signals in this area that warrant operator review.",
      what_its_costing:
        "Conservative annualised exposure for this chapter sits in the $18,000–$72,000 range for a business at Hallmark Homes's public profile.",
    },
  ],
});

const specificReport = () => ({
  executive_summary:
    'The scan of hallmarkhomes.com found the contact form at /contact returns a 500 error, and the homepage hero promises "24-hour response" while the footer states "3-5 business days".',
  top_leaks: [
    {
      rank: 1,
      name: "Broken /contact form drops inbound builder inquiries",
      dollars_low: 41_200,
      dollars_high: 88_600,
      chapter_slug: "site-autopsy",
      source_url: "https://hallmarkhomes.com/contact",
      evidence_quote: "HTTP 500 returned on POST to /contact",
      calculation_method: "12 monthly form sessions x 34% observed drop x $842 avg lot deposit",
      evidence_class: "observed",
    },
  ],
  chapters: [
    {
      slug: "site-autopsy",
      verdict: 'The /contact form on hallmarkhomes.com returns HTTP 500, so inbound inquiries never arrive.',
      what_its_costing: "Annual exposure of $41,200 - $88,600 based on observed form sessions.",
    },
  ],
});

describe("generic report detector", () => {
  it("flags the five-category boilerplate as requiring regeneration", () => {
    const v = detectGenericReport(genericReport() as never);
    expect(v.generic).toBe(true);
    expect(v.regeneration_required).toBe(true);
    expect(v.generic_leak_names.length).toBeGreaterThanOrEqual(5);
  });

  it("does not flag an evidence-backed, company-specific report", () => {
    const v = detectGenericReport(specificReport() as never);
    expect(v.regeneration_required).toBe(false);
  });
});

describe("compiler gate", () => {
  it("strips the unsupported $75,000-$450,000 total from a generic report", () => {
    const compiled = compileGoldenReport({
      report: genericReport() as never,
      rawFindings: {},
      url: "https://hallmarkhomes.com",
      company: "Hallmark Homes",
    });
    expect(compiled.ok).toBe(false);
    expect(compiled.state).toBe("regeneration_required");
    expect(compiled.report.overall_leakage).toBeFalsy();
    expect(computeGoldenLeakage(compiled.report as never)).toBeNull();
  });

  it("never emits the 75000/450000 headline for any generic input", () => {
    const compiled = compileGoldenReport({
      report: genericReport() as never,
      rawFindings: {},
      url: "https://example.com",
      company: "Example Co",
    });
    const total = computeGoldenLeakage(compiled.report as never);
    expect(total).toBeNull();
  });

  it("keeps a specific report publishable with its measured total", () => {
    const compiled = compileGoldenReport({
      report: specificReport() as never,
      rawFindings: {},
      url: "https://hallmarkhomes.com",
      company: "Hallmark Homes",
    });
    expect(compiled.state).not.toBe("regeneration_required");
    const total = computeGoldenLeakage(compiled.report as never);
    expect(total?.high).toBeGreaterThan(0);
    expect(total?.rangeLabel).not.toContain("450,000");
  });
});
