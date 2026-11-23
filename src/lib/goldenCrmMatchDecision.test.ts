import {describe,expect,it} from "vitest";
import {decideMatchAction,requiresHumanReview,type GoldenCrmCandidate} from "./goldenCrmMatchDecision";
const record:GoldenCrmCandidate={
  scan_id:"report-a",company_id:"company-b",domain:"example.com",
  company_matches:1,verified:false,report_company_name:"Example",crm_company_name:"Example LLC",
};
describe("Golden Report CRM association safeguards",()=>{
  it("requires manual confirmation even with matching report and CRM labels",()=>{
    expect(decideMatchAction(record)).toBe("verify");
    expect(requiresHumanReview(record)).toBe(true);
  });
  it("blocks ambiguous and empty CRM matches",()=>{
    expect(decideMatchAction({...record,company_matches:2})).toBe("resolve_duplicates");
    expect(decideMatchAction({...record,company_matches:0})).toBe("unavailable");
    expect(decideMatchAction({...record,company_id:""})).toBe("unavailable");
    expect(decideMatchAction({...record,company_matches:NaN})).toBe("unavailable");
  });
  it("supports revocation when domain becomes ambiguous after verification",()=>{
    expect(decideMatchAction({...record,verified:true,company_matches:3})).toBe("revoke");
    expect(requiresHumanReview({...record,verified:true})).toBe(false);
  });
  it("never assumes matching company names establish ownership",()=>{
    expect(requiresHumanReview({...record,report_company_name:"Example",crm_company_name:"Example"})).toBe(true);
  });
});
