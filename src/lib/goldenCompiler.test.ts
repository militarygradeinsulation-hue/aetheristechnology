import { describe, it, expect } from "vitest";
import {
  compileGoldenReport,
  validateCompiledReport,
  semanticRootCauseKey,
  classifySiteType,
  isRecommendationApplicable,
  buildSourceInventory,
  gradeClaim,
  softenNegativeProse,
  scrubValue,
  scrubUrl,
} from "./goldenCompiler";

const htmlFindings = {
  firecrawl_scrape: { data: { html: "<html>".padEnd(400, "x") } },
  scan_website: { gaps: [{ title: "Meta description missing" }] },
};
const markdownOnlyFindings = {
  firecrawl_scrape: { data: { markdown: "Odoo is an open source ERP".padEnd(500, " ") } },
};
const truncatedFindings = {
  firecrawl_scrape: { data: { markdown: "partial page".padEnd(200, " "), truncated: true } },
};

const leak = (name: string, low: number, high: number, slug = "seo") => ({
  name,
  chapter_slug: slug,
  dollars_low: low,
  dollars_high: high,
});

describe("source suitability", () => {
  it("treats markdown as unsuitable to verify schema absence", () => {
    const inv = buildSourceInventory(markdownOnlyFindings);
    expect(inv.markdown.available).toBe(true);
    expect(inv.raw_html.available).toBe(false);
    expect(gradeClaim("schema", inv).status).toBe("inferred");
  });

  it("verifies schema claims when raw HTML landed", () => {
    const inv = buildSourceInventory(htmlFindings);
    expect(inv.raw_html.available).toBe(true);
    expect(gradeClaim("schema", inv).status).toBe("verified");
  });

  it("downgrades a truncated crawl to unverified", () => {
    const inv = buildSourceInventory(truncatedFindings);
    expect(inv.markdown.truncated).toBe(true);
    expect(gradeClaim("content", inv).status).toBe("unverified");
  });

  it("never verifies mobile layout without a browser test", () => {
    expect(gradeClaim("mobile_layout", buildSourceInventory(htmlFindings)).status).not.toBe("verified");
  });

  it("never verifies owner or capacity facts from a public site", () => {
    expect(gradeClaim("owner_capacity", buildSourceInventory(htmlFindings)).status).not.toBe("verified");
  });
});

describe("semantic root-cause deduplication", () => {
  it("collapses differently worded proof gaps into one key", () => {
    const a = semanticRootCauseKey("No case studies on the site");
    const b = semanticRootCauseKey("Testimonials and social validation are thin");
    const c = semanticRootCauseKey("Authority proof is missing");
    expect(a.key).toBe("proof");
    expect(b.key).toBe("proof");
    expect(c.key).toBe("proof");
  });

  it("keeps genuinely different root causes separate", () => {
    expect(semanticRootCauseKey("Schema markup missing").key).not.toBe(
      semanticRootCauseKey("CTA hierarchy is diluted").key,
    );
  });

  it("prices a duplicated root cause only once", () => {
    const out = compileGoldenReport({
      report: {
        top_leaks: [
          leak("No case studies", 1000, 2000, "content"),
          leak("Testimonials missing", 3000, 4000, "content"),
          leak("Schema markup missing", 500, 700, "seo"),
        ],
      },
      rawFindings: htmlFindings,
    });
    expect(out.priced_leaks).toHaveLength(2);
    expect(out.consistency.uniquely_priced_leaks).toBe(2);
    // duplicate row dropped from the total: 1000+500 / 2000+700
    expect(out.leakage?.low).toBe(1500);
    expect(out.leakage?.high).toBe(2700);
    expect(out.violations.filter((v) => v.code === "duplicate_pricing")).toHaveLength(0);
  });
});

describe("canonical totals", () => {
  it("rewrites a stale total in the executive summary", () => {
    const out = compileGoldenReport({
      report: {
        executive_summary: "Total annual revenue exposure is $17,900 - $38,100 across the funnel.",
        top_leaks: [leak("Schema markup missing", 7200, 15100, "seo")],
      },
      rawFindings: htmlFindings,
    });
    expect(out.report.executive_summary).toContain("$7,200 - $15,100");
    expect(out.report.executive_summary).not.toContain("$17,900");
    expect(out.violations.some((v) => v.code === "total_mismatch")).toBe(false);
  });

  it("rewrites stale totals inside chapters too", () => {
    const out = compileGoldenReport({
      report: {
        top_leaks: [leak("Schema markup missing", 1000, 2000, "seo")],
        chapters: [{ slug: "seo", what_its_costing: "Total annual revenue loss across the report is $9,000 - $12,000." }],
      },
      rawFindings: htmlFindings,
    });
    const ch = (out.report.chapters as Array<Record<string, string>>)[0];
    expect(ch.what_its_costing).toContain("$1,000 - $2,000");
  });

  it("leaves a chapter subtotal alone instead of overwriting it with the report total", () => {
    const out = compileGoldenReport({
      report: {
        top_leaks: [leak("Schema markup missing", 7200, 15100, "seo")],
        chapters: [{ slug: "seo", what_its_costing: "The combined SEO gaps are priced at $3,000 - $6,300 per year." }],
      },
      rawFindings: htmlFindings,
    });
    const ch = (out.report.chapters as Array<Record<string, string>>)[0];
    expect(ch.what_its_costing).toContain("$3,000 - $6,300");
    expect(out.ok).toBe(true);
  });

  it("leaves a per-leak figure that is not a total alone", () => {
    const out = compileGoldenReport({
      report: {
        top_leaks: [leak("Schema markup missing", 1000, 2000, "seo")],
        chapters: [{ slug: "seo", what_its_costing: "This single gap costs $400 - $600 in wasted spend." }],
      },
      rawFindings: htmlFindings,
    });
    const ch = (out.report.chapters as Array<Record<string, string>>)[0];
    expect(ch.what_its_costing).toContain("$400 - $600");
  });

  it("persists a canonical overall_leakage built only from unique priced leaks", () => {
    const out = compileGoldenReport({
      report: { top_leaks: [leak("Schema missing", 100, 200, "seo"), leak("Structured data absent", 900, 900, "seo")] },
      rawFindings: htmlFindings,
    });
    expect(out.report.overall_leakage).toMatchObject({ annual_low: 100, annual_high: 200, currency: "USD" });
  });
});

describe("count consistency", () => {
  it("canonicalizes conflicting finding counts", () => {
    const out = compileGoldenReport({
      report: {
        executive_summary: "The scan flags 15 distinct gaps and 12 issues.",
        top_leaks: [leak("Schema markup missing", 100, 200, "seo")],
      },
      rawFindings: htmlFindings,
    });
    const summary = String(out.report.executive_summary);
    expect(summary).not.toContain("15 distinct gaps");
    expect(summary).toContain("detected findings");
    expect(out.violations.some((v) => v.code === "count_mismatch")).toBe(false);
  });

  it("reports deterministic counts", () => {
    const out = compileGoldenReport({
      report: { top_leaks: [leak("Schema markup missing", 100, 200, "seo"), leak("CTA hierarchy diluted", 300, 400, "cta")] },
      rawFindings: htmlFindings,
    });
    expect(out.consistency.uniquely_priced_leaks).toBe(2);
    expect(out.consistency.unique_root_causes).toBeGreaterThanOrEqual(2);
    expect(out.consistency.canonical_counts_sentence).toContain("uniquely priced leaks");
  });
});

describe("unsupported claims", () => {
  it("softens an absolute negative that markdown cannot verify", () => {
    const out = compileGoldenReport({
      report: {
        executive_summary: "The site has no schema markup and there are no case studies.",
        top_leaks: [leak("Schema markup missing", 100, 200, "seo")],
      },
      rawFindings: markdownOnlyFindings,
    });
    const s = String(out.report.executive_summary);
    expect(s).not.toMatch(/\bhas no schema\b/i);
    expect(s.toLowerCase()).toContain("crawled");
  });

  it("flags an unsupported quantified promise", () => {
    const v = validateCompiledReport({
      report: { executive_summary: "Expect a 40% lift in conversion within 30 days." },
      leakage: null,
      findings: [],
      root_causes: [],
      priced_leaks: [],
      ledger: [],
      consistency: {
        detected_findings: 0, verified_findings: 0, inferred_or_unverified_findings: 0,
        contradicted_findings: 0, unique_root_causes: 0, uniquely_priced_leaks: 0,
        unpriced_root_causes: 0, canonical_range_ascii: "", canonical_range_display: "",
        canonical_counts_sentence: "", compiler_version: 1, pricing_model_version: 1,
        compiled_at: "", site_type: "saas",
        evidence_quality: { verified: 0, inferred: 0, unverified: 0, contradicted: 0, total: 0, verified_pct: 0, inferred_pct: 0, unverified_pct: 0, contradicted_pct: 0 },
      },
    });
    expect(v.some((x) => x.code === "unsupported_quantified_claim")).toBe(true);
  });

  it("accepts a disclosed modelling assumption", () => {
    const out = compileGoldenReport({
      report: {
        top_leaks: [leak("Schema markup missing", 100, 200, "seo")],
        chapters: [{ slug: "seo", what_its_costing: "Assuming a 2% conversion rate, the gap costs $100 - $200." }],
      },
      rawFindings: htmlFindings,
    });
    expect(out.violations.some((v) => v.code === "unsupported_quantified_claim")).toBe(false);
    expect(out.ok).toBe(true);
  });

  it("labels an unmeasured promise as an assumption instead of asserting it", () => {
    const out = compileGoldenReport({
      report: {
        top_leaks: [leak("Schema markup missing", 100, 200, "seo")],
        chapters: [{ slug: "seo", what_its_costing: "This delivers 10X ROI." }],
      },
      rawFindings: htmlFindings,
    });
    const ch = (out.report.chapters as Array<Record<string, string>>)[0];
    expect(ch.what_its_costing).toContain("illustrative assumption");
    expect(out.ok).toBe(true);
  });

  it("softenNegativeProse produces limited wording", () => {
    expect(softenNegativeProse("The company has no phone")).toMatch(/detected on the pages successfully crawled/i);
  });
});

describe("site classification and recommendations", () => {
  it("classifies a SaaS company", () => {
    expect(classifySiteType("Our cloud platform offers a free trial and per user pricing for this SaaS ERP.")).toBe("saas");
  });

  it("classifies a local service company", () => {
    expect(classifySiteType("Licensed and insured. Call now. We serve the local business service area same-day.")).toBe("local_service");
  });

  it("rejects local-only tactics for a SaaS company", () => {
    expect(isRecommendationApplicable("Add LocalBusiness schema and city landing pages", "saas")).toBe(false);
    expect(isRecommendationApplicable("Add LocalBusiness schema", "local_service")).toBe(true);
    expect(isRecommendationApplicable("Publish two customer case studies", "saas")).toBe(true);
  });

  it("strips inapplicable recommendations during compilation", () => {
    const out = compileGoldenReport({
      report: {
        top_leaks: [leak("Schema markup missing", 100, 200, "seo")],
        chapters: [{
          slug: "seo",
          what_its_costing: "",
          what_to_do: { this_week: ["Add a sticky tap-to-call bar", "Publish a customer case study"] },
        }] as never,
      },
      rawFindings: markdownOnlyFindings,
      company: "Odoo cloud platform SaaS free trial subscription software",
    });
    const wtd = (out.report.chapters as Array<Record<string, { this_week: string[] }>>)[0].what_to_do;
    expect(wtd.this_week).toHaveLength(1);
    expect(wtd.this_week[0]).toMatch(/case study/i);
  });
});

describe("gate", () => {
  it("marks a clean report compiled", () => {
    const out = compileGoldenReport({
      report: { executive_summary: "Findings are documented below.", top_leaks: [leak("Schema markup missing", 100, 200, "seo")] },
      rawFindings: htmlFindings,
    });
    expect(out.ok).toBe(true);
    expect(out.state).toBe("compiled");
  });

  it("normalizes non-USD markers", () => {
    const out = compileGoldenReport({
      report: { executive_summary: "Exposure is €5,000 per year.", top_leaks: [leak("Schema markup missing", 100, 200, "seo")] },
      rawFindings: htmlFindings,
    });
    expect(String(out.report.executive_summary)).not.toMatch(/€/);
  });

  it("records contradicted status when two sources disagree on one fact", () => {
    const out = compileGoldenReport({
      report: {
        top_leaks: [leak("Schema markup missing", 100, 200, "seo")],
        chapters: [],
      },
      rawFindings: {
        firecrawl_scrape: { data: { html: "<html>".padEnd(400, "x") } },
        a: { gaps: [{ title: "Schema markup missing", description: "no JSON-LD found" }] },
        b: { gaps: [{ title: "Schema markup missing", description: "JSON-LD Organization present" }] },
      },
    });
    expect(out.evidence_ledger.some((c) => c.status === "contradicted")).toBe(true);
  });
});

describe("ledger hygiene", () => {
  it("redacts secrets, tokens and emails", () => {
    expect(scrubValue("api_key=abcdefghijklmnop")).toContain("[redacted-secret]");
    expect(scrubValue("eyJhbGciOi.eyJzdWIiOiJhYmMi.c2lnbmF0dXJl")).toContain("[redacted-token]");
    expect(scrubValue("write to owner@example.com now")).toContain("[redacted-email]");
  });

  it("strips query strings from source urls", () => {
    expect(scrubUrl("https://example.com/a?session=abc#x")).toBe("https://example.com/a");
  });

  it("bounds ledger values", () => {
    expect(scrubValue("x".repeat(5000)).length).toBeLessThanOrEqual(300);
  });

  it("gives every claim a locator and observation time", () => {
    const out = compileGoldenReport({
      report: { top_leaks: [leak("Schema markup missing", 100, 200, "seo")] },
      rawFindings: htmlFindings,
      url: "https://www.odoo.com/?utm=1",
    });
    for (const c of out.evidence_ledger) {
      expect(c.source_locator).toBeTruthy();
      expect(c.observed_at).toBeTruthy();
      expect(c.source_url).toBe("https://www.odoo.com/");
    }
  });
});

describe("universality", () => {
  it("produces different totals for different inputs with identical code paths", () => {
    const a = compileGoldenReport({ report: { top_leaks: [leak("Schema markup missing", 100, 200)] }, rawFindings: htmlFindings });
    const b = compileGoldenReport({ report: { top_leaks: [leak("Schema markup missing", 5000, 9000)] }, rawFindings: htmlFindings });
    expect(a.leakage?.high).toBe(200);
    expect(b.leakage?.high).toBe(9000);
  });

  it("is idempotent: recompiling a compiled report changes nothing material", () => {
    const first = compileGoldenReport({
      report: {
        executive_summary: "Total annual exposure is $17,900 - $38,100 across 15 distinct gaps.",
        top_leaks: [leak("Schema markup missing", 7200, 15100, "seo")],
      },
      rawFindings: htmlFindings,
    });
    const second = compileGoldenReport({ report: first.report, rawFindings: htmlFindings });
    expect(second.report.executive_summary).toBe(first.report.executive_summary);
    expect(second.consistency.canonical_range_ascii).toBe(first.consistency.canonical_range_ascii);
  });

  it("handles a report with no priced evidence without inventing numbers", () => {
    const out = compileGoldenReport({ report: { executive_summary: "Nothing priced." }, rawFindings: htmlFindings });
    expect(out.leakage).toBeNull();
    expect(out.report.overall_leakage ?? null).toBeNull();
  });
});
