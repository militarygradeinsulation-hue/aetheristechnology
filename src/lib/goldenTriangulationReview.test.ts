import { describe,expect,it } from "vitest";
import {
  reviewTheoryEvidence,sourceFamily,type ReviewEvidence,
} from "../../supabase/functions/_shared/golden-triangulation-review";
import { buildMissingTriangulation } from "../../supabase/functions/_shared/golden-missing-triangulation";

const row=(id:string,kind:ReviewEvidence["evidence_kind"],direction:ReviewEvidence["direction"],ref:string):ReviewEvidence=>({
  id,hypothesis_id:"lead-response",direction,evidence_kind:kind,
  source_reference:ref,observation:"The reviewed record demonstrates a documented process outcome.",
  created_at:"2026-11-22T00:00:00Z",
});
describe("missing-information review of new first-party evidence",()=>{
  it("does not guess when there are no reviewed records",()=>{
    expect(reviewTheoryEvidence("lead-response",[]).status).toBe("unreviewed");
  });
  it("does not count many CRM records as independent data systems",()=>{
    const review=reviewTheoryEvidence("lead-response",[
      row("1","crm","supports","CRM 18"),
      row("2","crm","supports","CRM 19"),
      row("3","crm","supports","CRM 19"),
    ]);
    expect(review.status).toBe("needs_corroboration");
    expect(review.supportingRecords).toBe(2);
    expect(review.supportingFamilies).toBe(1);
    expect(sourceFamily(row("1","crm","supports","CRM 18"))).toBe("crm");
  });
  it("promotes to only provisional support after two independent data types",()=>{
    const review=reviewTheoryEvidence("lead-response",[
      row("1","crm","supports","CRM 18"),
      row("2","customer_feedback","supports","Interview summary 4"),
    ]);
    expect(review.status).toBe("provisionally_supported");
    expect(review.supportingFamilies).toBe(2);
    expect(review.explanation).toMatch(/Validate the underlying records/i);
  });
  it("prioritizes disconfirming records and preserves contradictions",()=>{
    const challenged=reviewTheoryEvidence("lead-response",[row("1","calls","challenges","Call record 3")]);
    expect(challenged.status).toBe("challenged");
    const mixed=reviewTheoryEvidence("lead-response",[
      row("1","calls","challenges","Call record 3"),
      row("2","crm","supports","CRM case 1"),
    ]);
    expect(mixed.status).toBe("mixed");
    expect(mixed.challengingRecords).toBe(1);
  });
  it("ignores mismatched theory IDs and missing provenance",()=>{
    const bad={...row("x","crm","supports","CRM 1"),source_reference:"",observation:"Unclear"};
    expect(reviewTheoryEvidence("lead-response",[bad,row("a","other","supports","Doc 2")]).supportingRecords).toBe(1);
    expect(reviewTheoryEvidence("buyer-reassurance",[row("a","crm","supports","CRM 2")]).status).toBe("unreviewed");
  });
  it("keeps original report and canonical financial data unchanged",()=>{
    const report={report_consistency:{detected_findings:0,uniquely_priced_leaks:0},overall_leakage:{annual_low:0,annual_high:0}};
    const snapshot=JSON.stringify(report);
    const hypotheses=buildMissingTriangulation(report);
    reviewTheoryEvidence("lead-response",[row("a","crm","supports","CRM 1")]);
    expect(JSON.stringify(report)).toBe(snapshot);
    expect(hypotheses.zeroCaveats).toHaveLength(2);
  });
});
