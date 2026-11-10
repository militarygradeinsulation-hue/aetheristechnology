import { describe, expect, it } from "vitest";
import { contactNameList, enrichedLeadIssues, indexedReportIssue, normalizedIssue, safeDirectoryPage, safeDirectorySearch, safePublicUrl, scanCompanyName, websiteScanIssues } from "./scanned-leads-directory.ts";

describe("read-only scanned leads directory", () => {
  it("keeps page numbers bounded and searchable text free from PostgREST control characters", () => {
    expect(safeDirectoryPage(-1)).toBe(0);
    expect(safeDirectoryPage("3")).toBe(3);
    expect(safeDirectoryPage(999999)).toBe(2500);
    expect(safeDirectorySearch("Acme,or(1=1)%")).not.toMatch(/[,()%]/);
    expect(safeDirectorySearch("John Doe")).toBe("John Doe");
  });
  it("keeps the website scan's actual issues and evidence intact", () => {
    const gaps = { companyName: "Gaia Group", gaps: [{
      title: "Search Snippet Is Underperforming", category: "SEO",
      severity: "warning", description: "Missing specific description",
      recommendedFix: "Write a stronger description", annualCost: "$600 - $1,300",
    }] };
    const result = websiteScanIssues(gaps);
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      title: "Search Snippet Is Underperforming", evidence: "unverified",
      recommendation: "Write a stronger description", estimatedAnnualCost: "$600 - $1,300",
    });
  });
  it("merges saved enrichment issues without duplicate titles", () => {
    const issues = enrichedLeadIssues({
      scan: { gaps: [{title:"No clear CTA", description:"A finding"}] },
      weak_points: ["No clear CTA", "Unclear contact path"],
    });
    expect(issues.map(issue=>issue.title)).toEqual(["No clear CTA", "Unclear contact path"]);
  });
  it("does not invent a contact or company name when missing", () => {
    expect(contactNameList(null)).toEqual([]);
    expect(scanCompanyName("https://example.com/", null)).toBe("example.com");
    expect(normalizedIssue({ evidence_grade: "verified" })).toBeNull();
  });
  it("preserves finding evidence grade and reported annual range", () => {
    const issue=indexedReportIssue({
      title:"No visible proof",category:"proof",evidence_grade:"inferred",
      annual_low:100,annual_high:500,
    });
    expect(issue?.evidence).toBe("inferred");
    expect(issue?.estimatedAnnualCost).toBe("$100 to $500");
  });
  it("rejects untrusted outbound links", () => {
    expect(safePublicUrl("javascript:alert(1)")).toBeNull();
    expect(safePublicUrl("https://user:pass@example.com")).toBeNull();
    expect(safePublicUrl("https://example.com")).toBe("https://example.com/");
  });
});
