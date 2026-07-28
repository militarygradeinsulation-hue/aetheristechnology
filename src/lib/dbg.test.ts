import { it, expect } from "vitest";
import { compileGoldenReport } from "@/lib/goldenCompiler";
const leak = (name: string, low: number, high: number, slug = "seo") => ({ name, chapter_slug: slug, dollars_low: low, dollars_high: high, source_url: `https://www.example.com/${slug}`, evidence_quote: `Observed: "${name}"`, observed_evidence: "x", calculation_method: "m", evidence_class: "verified", confidence: 0.8 });
it("dbg", () => {
  const out = compileGoldenReport({ report: { top_leaks: [leak("Schema markup missing", 7200, 15100, "seo")], chapters: [{ slug: "seo", what_its_costing: "The combined SEO gaps are priced at $3,000 - $6,300 per year." }] }, rawFindings: { firecrawl_scrape: { data: { html: "<html>".padEnd(400, "x") } }, scan_website: { gaps: [{ title: "Meta description missing" }] } } });
  console.log(JSON.stringify(out.violations, null, 1), out.reportState);
  expect(1).toBe(1);
});
