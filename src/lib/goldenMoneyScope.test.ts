// Scope invariants for Golden Report money.
//
// The arithmetic is already covered by goldenLedger / goldenCompiler tests.
// This suite covers the READING rules that arithmetic alone cannot enforce:
// a value that is canonical SOMEWHERE in the ledger is still wrong in the
// wrong place, chat output is validated like report prose, redaction must
// leave grammatical sentences behind, and the whole pipeline is deterministic.

import { describe, it, expect } from "vitest";
import { compileGoldenReport } from "./goldenCompiler";
import {
  chapterAllowedValues,
  guardChatMoney,
  resolveFinancialLedger,
  sanitizedGoldenReport,
} from "./goldenMoneySanitizer";
import { annotateMoneyProse, classifyMoneyAt } from "./goldenMoneyTaxonomy";

const htmlFindings = {
  firecrawl_scrape: { data: { html: "<html>".padEnd(400, "x") } },
  scan_website: { gaps: [{ title: "Meta description missing" }] },
};

const leak = (name: string, low: number, high: number, slug = "seo") => ({
  name,
  chapter_slug: slug,
  dollars_low: low,
  dollars_high: high,
  source_url: `https://www.example.com/${slug}`,
  evidence_quote: `Crawl of https://www.example.com/${slug} found "${name}" on 12 of 34 indexed pages.`,
  observed_evidence: `https://www.example.com/${slug}/contact returned 3 forms and "${name}" on 12 pages.`,
  calculation_method: "12 affected pages x 34 monthly sessions x observed 2% conversion delta",
  evidence_class: "verified",
  confidence: 0.8,
});

/** Two priced chapters, so the report total differs from every chapter. */
function twoChapterReport(extra: Record<string, unknown> = {}) {
  return {
    executive_summary: "Findings across the funnel.",
    top_leaks: [
      leak("Schema markup missing", 10_000, 20_000, "seo"),
      leak("No lead response process", 30_000, 40_000, "conversion"),
    ],
    chapters: [
      { no: 1, slug: "seo", title: "Search", what_its_costing: "Costing detail." },
      { no: 2, slug: "conversion", title: "Conversion", what_its_costing: "Costing detail." },
    ],
    ...extra,
  };
}

describe("chapter money scope", () => {
  it("does not allow the report-wide total inside a priceable chapter", () => {
    const out = compileGoldenReport({ report: twoChapterReport(), rawFindings: htmlFindings });
    const ledger = resolveFinancialLedger(out.report as never);
    const allowed = chapterAllowedValues(ledger, "seo");

    // its own allocation is allowed
    const alloc = ledger.chapters.find((c) => c.chapter === "seo");
    expect(alloc).toBeTruthy();
    expect(allowed.has(Math.round(alloc!.annual_high))).toBe(true);

    // the report total is NOT, even though it is canonical elsewhere
    expect(allowed.has(Math.round(ledger.overall!.annual_high))).toBe(false);
    // nor is the sibling chapter's allocation
    const other = ledger.chapters.find((c) => c.chapter === "conversion");
    if (other && Math.round(other.annual_high) !== Math.round(alloc!.annual_high)) {
      expect(allowed.has(Math.round(other.annual_high))).toBe(false);
    }
  });

  it("never rewrites chapter prose with the report-wide total", () => {
    const out = compileGoldenReport({
      report: twoChapterReport({
        chapters: [
          { no: 1, slug: "seo", title: "Search", what_its_costing: "This is costing $9,000 - $12,000 per year." },
          { no: 2, slug: "conversion", title: "Conversion", what_its_costing: "This is costing $9,000 - $12,000 per year." },
        ],
      }),
      rawFindings: htmlFindings,
    });
    const ledger = resolveFinancialLedger(out.report as never);
    const totalHigh = Math.round(ledger.overall!.annual_high).toLocaleString("en-US");
    const chapters = out.report.chapters as Array<Record<string, string>>;
    for (const ch of chapters) {
      const prose = String(ch.what_its_costing || "");
      expect(prose).not.toContain("$9,000");
      expect(prose).not.toContain(`$${totalHigh}`);
    }
  });

  it("leaves no total_mismatch violation after compiling", () => {
    const out = compileGoldenReport({
      report: twoChapterReport({
        chapters: [
          { no: 1, slug: "seo", title: "Search", what_its_costing: "Costing $9,000 - $12,000 a year." },
          { no: 2, slug: "conversion", title: "Conversion", what_its_costing: "Costing $1,100 - $2,200 a year." },
        ],
      }),
      rawFindings: htmlFindings,
    });
    expect(out.violations.filter((v) => v.code === "total_mismatch")).toHaveLength(0);
  });
});

describe("chat output guard", () => {
  const compiled = compileGoldenReport({ report: twoChapterReport(), rawFindings: htmlFindings });
  const report = sanitizedGoldenReport(compiled.report as never);
  const ledger = resolveFinancialLedger(report as never);
  const canonical = `$${Math.round(ledger.overall!.annual_low).toLocaleString("en-US")} – $${Math.round(ledger.overall!.annual_high).toLocaleString("en-US")}`;

  it("keeps a canonical figure the model quotes back", () => {
    const r = guardChatMoney(`Your annual revenue loss is ${canonical} per year.`, report as never);
    expect(r.text).toContain(canonical.split(" – ")[1]);
    expect(r.removed).toHaveLength(0);
  });

  it("redacts a figure the model invented", () => {
    const r = guardChatMoney("You are leaking $812,345 - $999,111 per year.", report as never);
    expect(r.text).not.toContain("$812,345");
    expect(r.removed.length).toBeGreaterThan(0);
  });

  it("leaves source evidence amounts alone", () => {
    const r = guardChatMoney("Your average job value is $18,400 based on the pricing page.", report as never);
    expect(r.text).toContain("$18,400");
  });

  it("is a no-op on money-free answers", () => {
    const text = "Call the twelve stalled leads before you scan anything else.";
    expect(guardChatMoney(text, report as never).text).toBe(text);
  });
});

describe("redaction grammar", () => {
  it("replaces unclassifiable money with a whole grammatical sentence", () => {
    const r = annotateMoneyProse("The number here is $4,000 and nothing else.", { where: "test" });
    expect(r.text).not.toContain("$4,000");
    expect(r.text.trim()).not.toMatch(/\b(is|of|the|and)\s*[.]?$/i);
    expect(r.omitted.length).toBeGreaterThan(0);
  });

  it("classifies planning money away from leak money", () => {
    const text = "Recovery upside is $50,000 if you fix it.";
    expect(classifyMoneyAt(text, text.indexOf("$50,000"), 7)).toBe("recovery_scenario");
  });

  it("is idempotent — annotating twice adds nothing", () => {
    const once = annotateMoneyProse("Implementation investment of $12,000 to build the intake system.", {});
    const twice = annotateMoneyProse(once.text, {});
    expect(twice.text).toBe(once.text);
  });
});

describe("determinism", () => {
  it("produces byte-identical output for identical input", () => {
    const a = compileGoldenReport({ report: twoChapterReport(), rawFindings: htmlFindings });
    const b = compileGoldenReport({ report: twoChapterReport(), rawFindings: htmlFindings });
    expect(JSON.stringify(a.report)).toBe(JSON.stringify(b.report));
  });

  it("keeps the chapter allocations within the report total", () => {
    const out = compileGoldenReport({ report: twoChapterReport(), rawFindings: htmlFindings });
    const ledger = resolveFinancialLedger(out.report as never);
    const sumHigh = ledger.chapters.reduce((n, c) => n + c.annual_high, 0);
    expect(Math.round(sumHigh)).toBeLessThanOrEqual(Math.round(ledger.overall!.annual_high) + 1);
  });
});
