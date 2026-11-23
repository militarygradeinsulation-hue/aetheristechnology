import {describe,expect,it} from "vitest";
import {analyzeCrmCsv,previewCrmTheory,MAX_CRM_CSV_BYTES} from "./goldenCrmReconciliation";

const csv=[
  "Record ID,Create date,First Response Date,HubSpot Owner,Original Source,Deal Stage,Email,Notes",
  '1001,2026-11-01T12:00:00Z,2026-11-01T12:30:00Z,Sales Lead,Social,closedwon,private@example.com,"Do not expose this note"',
  '1002,2026-11-01T12:00:00Z,2026-11-03T12:00:00Z,,Paid search,closedlost,other@example.com,"Private note with a comma, and newline\ncontinued"',
  "1003,2026-11-01T12:00:00Z,,Sales Rep,,open,third@example.com,Unanswered?",
  "1003,2026-11-01T12:00:00Z,,Sales Rep,,open,third@example.com,duplicate",
].join("\n");

describe("client-only CRM reconciliation",()=>{
  it("reads quoted multiline exports and removes duplicate record IDs",()=>{
    const result=analyzeCrmCsv(csv);
    expect(result.totalRows).toBe(3);
    expect(result.duplicateIds).toBe(1);
    expect(result.comparableResponses).toBe(2);
    expect(result.responsesWithin24Hours).toBe(1);
    expect(result.responsesOver24Hours).toBe(1);
    expect(result.medianResponseHours).toBe(24.3);
    expect(result.assignedOwners).toBe(2);
    expect(result.missingOwners).toBe(1);
    expect(result.recordsWithSources).toBe(2);
    expect(result.recordsMissingSources).toBe(1);
    expect(result.closedWon).toBe(1);
    expect(result.closedLost).toBe(1);
  });
  it("never includes personal data from export rows in summaries",()=>{
    const result=analyzeCrmCsv(csv);
    const summary=previewCrmTheory("lead-response",result);
    expect(summary.available).toBe(true);
    expect(summary.summary).toMatch(/median observed response/i);
    expect(JSON.stringify(result)+JSON.stringify(summary)).not.toMatch(/private@example.com|other@example.com|Private note/);
  });
  it("explicitly returns unavailable when a field is absent, not zero",()=>{
    const s=analyzeCrmCsv("Record ID,Deal Stage\n11,closedwon\n12,closedlost");
    expect(s.assignedOwners).toBeNull();
    expect(s.recordsMissingSources).toBeNull();
    expect(previewCrmTheory("lead-response",s).available).toBe(false);
    expect(previewCrmTheory("internal-handoff",s).available).toBe(false);
    expect(previewCrmTheory("channel-attribution",s).available).toBe(false);
    expect(previewCrmTheory("verified-financial-impact",s).summary).toMatch(/closed-won/);
  });
  it("does not infer follow-up timing from date-only fields",()=>{
    const s=analyzeCrmCsv("Create date,First Response Date\n2026-11-01,2026-11-02\n2026-11-03,2026-11-03");
    expect(s.comparableResponses).toBe(0);
    expect(previewCrmTheory("lead-response",s).available).toBe(false);
  });
  it("rejects malformed, huge and unrecognized exports",()=>{
    expect(()=>analyzeCrmCsv("Record ID,Create date\n\"abc,2026-11-01")).toThrow(/unclosed quoted/);
    expect(()=>analyzeCrmCsv("Random,Email\na,secret@example.com")).toThrow(/No recognized CRM fields/);
    expect(()=>analyzeCrmCsv("x".repeat(MAX_CRM_CSV_BYTES+1))).toThrow(/too large/);
  });
  it("does not claim causality or calculate revenue from a CRM summary",()=>{
    const stats=analyzeCrmCsv(csv);
    const outcome=previewCrmTheory("verified-financial-impact",stats);
    expect(outcome.caveat).toMatch(/cannot calculate revenue leakage/);
    expect(outcome.summary).not.toMatch(/\$\s*[0-9]/);
  });
  it("marks capped analysis as a sample instead of silently suggesting completeness",()=>{
    const content="Record ID,Lead Source\n"+Array.from({length:2502},(_,i)=>String(i+1)+",Web").join("\n");
    const stats=analyzeCrmCsv(content);
    expect(stats.truncated).toBe(true);
    expect(stats.totalRows).toBeLessThanOrEqual(2500);
  });
});
