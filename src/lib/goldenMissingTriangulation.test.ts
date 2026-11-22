import { describe, expect, it } from "vitest";
import { buildMissingTriangulation } from "../../supabase/functions/_shared/golden-missing-triangulation";
import { buildGoldenReportModel, modelText } from "./goldenReportModel";

const example = {
  report_consistency: { detected_findings: 0, uniquely_priced_leaks: 0 },
  evidence_ledger: [
    { claim_id: "a", statement: "The quote request form gives no visible confirmation after submitting.", category: "lead_capture",
      source_url: "https://example.com/contact", source_kind: "website", status: "verified" },
    { claim_id: "b", statement: "Pricing and proposal next steps are not explained at the request stage.",
      category: "proposal", source_url: "https://example.com/pricing", source_kind: "website", status: "verified" },
  ],
  compiled_findings: [
    { finding_id: "a-f", statement: "Quote form does not communicate a next step.", category: "lead_capture",
      chapter_slug: "lead capture", status: "inferred", claim_ids: ["a"] },
    { finding_id: "b-f", statement: "Pricing proposal creates questions about buying choices.",
      category: "pricing", chapter_slug: "buyer trust", status: "inferred", claim_ids: ["b"] },
  ],
  chapters: [{ slug: "pipeline-forensics", title: "Sales Pipeline",
    what_we_found: "Response time unknown because no CRM data was provided.",
    evidence: [] }],
};

describe("Golden Report missing-information triangulation", () => {
  it("keeps zero findings and zero priced leaks separate from hypotheses", () => {
    const output = buildMissingTriangulation(example);
    expect(output.zeroCaveats).toHaveLength(2);
    expect(output.hypothesisOnly).toBe(true);
    expect(output.hypotheses.some(h => h.question.includes("qualified buyer"))).toBe(true);
    expect(output.hypotheses.every(h => !!h.alternateExplanation && !!h.verification && !!h.disconfirmingResult)).toBe(true);
    expect(JSON.stringify(output)).not.toMatch(/annual_low|annual_high|\$\s*[1-9][0-9]+/);
    expect(output.unresolvedAreas.some(x => x.includes("Sales Pipeline"))).toBe(true);
  });

  it("counts different pages on one site as one independent source", () => {
    const report = buildMissingTriangulation(example);
    const lead = report.hypotheses.find(h => h.id === "lead-response");
    expect(lead).toBeDefined();
    expect(lead?.independentSources).toBe(1);
    expect(lead?.support).not.toBe("converging");
  });

  it("requires observed evidence from at least two different source families for converging support", () => {
    const report = buildMissingTriangulation({
      evidence_ledger: [
        {claim_id:"one",category:"lead_capture",statement:"Quote request form gives no clear response owner.",
          source_url:"https://example.com/contact",source_kind:"website",status:"verified"},
        {claim_id:"two",category:"operations",statement:"Sales lead follow up owner not assigned in CRM records.",
          source_locator:"CRM:234",source_kind:"crm",status:"observed"},
      ],
      compiled_findings: [
        {finding_id:"f1",category:"lead_capture",chapter_slug:"lead capture",
          statement:"Quote request has no clear next step.",claim_ids:["one"]},
        {finding_id:"f2",category:"operations",chapter_slug:"pipeline",
          statement:"CRM sales lead follow-up has no assigned owner.",claim_ids:["two"]},
      ],
    });
    const lead = report.hypotheses.find(x => x.id === "lead-response");
    expect(lead?.independentSources).toBe(2);
    expect(lead?.support).toBe("converging");
  });

  it("does not promote inferred website commentary to observed corroboration", () => {
    const output = buildMissingTriangulation({
      evidence_ledger: [{claim_id:"a",statement:"Lead requests may not be answered",
        source_url:"https://example.com",category:"lead_capture",status:"inferred"}],
      compiled_findings:[{finding_id:"f",statement:"A lead may not get follow up",
        category:"lead_capture",claim_ids:["a"]}],
    });
    const lead = output.hypotheses.find(h=>h.id==="lead-response");
    expect(lead?.support).toBe("tentative");
    expect(lead?.independentSources).toBe(0);
  });

  it("abstains from theorizing when a scan has zero evidence", () => {
    expect(buildMissingTriangulation({}).hypotheses).toEqual([]);
    const empty = buildMissingTriangulation({report_consistency:{detected_findings:0}});
    expect(empty.zeroCaveats).toHaveLength(1);
    expect(empty.hypotheses).toHaveLength(0);
  });

  it("supports historic chapter-only reports without treating them as verified", () => {
    const output = buildMissingTriangulation({chapters:[{
      slug:"lead-capture",title:"Lead Capture",
      what_we_found:"Follow up and quote response have not been measured.",
      evidence:[{label:"Public call to action",value:"Contact us to request a quote",source_url:"https://example.com/contact"}],
    }]});
    expect(output.hypotheses.length).toBeGreaterThan(0);
    expect(output.hypotheses[0].support).toBe("tentative");
    expect(output.hypotheses[0].clues[0].direct).toBe(false);
  });

  it("includes an explicit theory section in client PDFs, not in the machine appendix", () => {
    for(const profile of ["executive", "complete"] as const){
      const model=buildGoldenReportModel({report:example,company:"Example LLC",url:"https://example.com",scanId:"test",profile});
      expect(model.sections.filter(s=>s.id==="missing-information-triangulation")).toHaveLength(1);
      const txt=modelText(model);
      expect(txt).toContain("Missing Information Triangulation");
      expect(txt).toContain("Alternative explanation");
    }
    const appendix=buildGoldenReportModel({report:example,company:"Example LLC",url:"https://example.com",scanId:"test",profile:"data_appendix"});
    expect(appendix.sections.find(s=>s.id==="missing-information-triangulation")).toBeUndefined();
  });
});
