import { describe, expect, it } from "vitest";
import { buildActiveFrictionSignals } from "../../supabase/functions/_shared/golden-friction-scan";
import { buildFrictionIntelligence } from "../../supabase/functions/_shared/golden-friction-intelligence";
import { buildGoldenReportModel } from "./goldenReportModel";

const url = "https://example.com";
const findings = {
  firecrawl_scrape: { data: { markdown: [
    "# Fabrication services",
    "We provide an automated quote process with personalized customer support and delivery updates.",
    "We offer three quote options and fast response times for urgent projects.",
    "Our team will explain your project requirements and schedule before you accept the order.",
    "We provide local manufacturing and engineering support on site.",
  ].join("\n") } },
  friction_audit: {
    flaggedPhrases: [
      { originalPhrase: "automated quote process with personalized customer support",
        category: "trust", issue: "Automation may remove useful reassurance" },
      { originalPhrase: "This sentence does not appear on the site",
        category: "vague", issue: "Audit suspects unclear messaging" },
    ],
    strongerCTAs: [
      { current: "We offer three quote options", whyBetter: "The choice could be easier to compare" },
    ],
  },
};

describe("cost-free active behavioral friction scanning", () => {
  it("only uses saved inputs and cites exact public-site text", () => {
    const out = buildActiveFrictionSignals(findings,url);
    expect(out.length).toBeGreaterThanOrEqual(2);
    expect(out.find(f => f.excerpt.startsWith("automated quote process"))?.evidence_status)
      .toBe("observed_public_copy");
    expect(out.find(f => f.excerpt.startsWith("This sentence does not appear"))?.evidence_status)
      .toBe("audit_suggestion");
    expect(out.every(f => f.source_url === url + "/")).toBe(true);
  });

  it("recognizes automated trust risk as a hypothesis, not a causal claim", () => {
    const out = buildActiveFrictionSignals(findings,url);
    expect(out.some(x => x.pattern === "doorman_risk")).toBe(true);
    expect(out.every(x => x.test.length > 8 && x.metric.length > 6)).toBe(true);
    expect(JSON.stringify(out)).not.toMatch(/annual_low|annual_high|conversion_lift/);
  });

  it("does not invent results when crawl and audit have no evidence", () => {
    expect(buildActiveFrictionSignals({},url)).toEqual([]);
    expect(buildActiveFrictionSignals({ friction_audit: { flaggedPhrases: [] } },url)).toEqual([]);
    expect(buildActiveFrictionSignals({ friction_audit: { flaggedPhrases: [
      { originalPhrase: "Trust me", category: "trust", issue: "Weak claim" },
    ] } },"javascript:alert(1)")).toEqual([]);
  });

  it("supports prior Golden Reports and fills the four lens analysis", () => {
    const signals = buildActiveFrictionSignals(findings,url);
    const model = buildFrictionIntelligence({ behavioral_friction_signals: signals });
    expect(model.lenses.length).toBe(4);
    expect(model.opportunities.some(o => o.evidence.some(e => e.status === "observed_public_copy"))).toBe(true);
    expect(model.lenses.find(l => l.id === "perceptual")?.status).toBeDefined();
  });

  it("does not create duplicate Additional Report Data or change canonical PDF sections", () => {
    const signals = buildActiveFrictionSignals(findings,url);
    const result = buildGoldenReportModel({
      report: { behavioral_friction_signals: signals, chapters: [] },
      company:"Example",url,scanId:"s",profile:"complete",
    });
    expect(result.sections.filter(s => s.id === "behavioral-friction-intelligence")).toHaveLength(1);
    expect(result.sections.filter(s => s.id === "additional-report-data")).toHaveLength(0);
  });

  it("keeps four category slots even when one category has many findings", () => {
    const report = {
      compiled_findings: [
        ...Array.from({length:8},(_,i)=>({
          finding_id: "f"+i, chapter_slug: "pipeline sales", category: "operations",
          statement: "CRM follow up handoff owner ambiguity at stage "+i,
        })),
        { finding_id:"e", category:"financial", chapter_slug:"profit", statement:"Revenue and margin were affected by lost renewal opportunities" },
      ],
    };
    const model = buildFrictionIntelligence(report);
    expect(model.lenses.find(l=>l.id==="economic")?.opportunities.length).toBeGreaterThan(0);
    expect(model.opportunities.some(f=>f.lens==="economic")).toBe(true);
  });
});
