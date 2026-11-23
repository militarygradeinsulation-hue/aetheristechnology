import { describe, expect, it } from "vitest";
import {
  normalizeReportDomain, companyMatchesReport, buildScopedCompanyPreview,
  type ScopedCompanyRecord,
} from "./goldenScopedCrm";

const company: ScopedCompanyRecord = {
  id: "c1",
  domain: "example.com",
  name: "Example Fabrication",
  industry: "Manufacturing",
  owner_id: "crm-owner-id",
  last_activity_date: "2026-11-10T12:10:00Z",
  synced_at: "2026-11-12T12:00:00Z",
};

describe("Golden Report signed-owner CRM company scoping", () => {
  it("requires an exact registrable company host, not a substring", () => {
    expect(companyMatchesReport("https://example.com/quotes", "example.com")).toBe(true);
    expect(companyMatchesReport("https://www.EXAMPLE.com/contact", "WWW.example.com")).toBe(true);
    expect(companyMatchesReport("https://customer.example.com", "example.com")).toBe(false);
    expect(companyMatchesReport("https://badexample.com", "example.com")).toBe(false);
    expect(companyMatchesReport("https://example.com.evil.io", "example.com")).toBe(false);
    expect(companyMatchesReport("https://example.com", "another.example.com")).toBe(false);
  });

  it("rejects non-HTTP, local and malformed credentials or query inputs", () => {
    const invalid = [
      "", "javascript:alert(1)", "ftp://example.com",
      "http://127.0.0.1", "http://localhost", "https://service.local",
      "https://username:password@example.com", "example.com:8080",
      "example.com,domain.ilike.evil.com", "example.com\nother.com",
    ];
    for (const value of invalid) expect(normalizeReportDomain(value)).toBeNull();
    expect(normalizeReportDomain("https://WWW.EXAMPLE.COM/path?q=1")).toBe("example.com");
  });

  it("keeps company-level observations separate from lead-response claims", () => {
    const preview = buildScopedCompanyPreview("https://example.com/quote", company);
    expect(preview?.report_domain).toBe("example.com");
    expect(preview?.company_record_id).toBe("c1");
    expect(preview?.company_owner_recorded).toBe(true);
    expect(preview?.last_company_activity).toBe("2026-11-10");
    expect(preview?.statement).toContain("does not establish contact response time");
    expect(preview?.statement).not.toMatch(/\$\d+|confirmed revenue loss/i);
    expect(preview?.limitations.some(x=>x.includes("No contact, deal"))).toBe(true);
  });

  it("never exposes another company's CRM record", () => {
    expect(buildScopedCompanyPreview("https://otherexample.com", company)).toBeNull();
  });

  it("treats absent or malformed CRM fields as unknown, not zero", () => {
    const preview = buildScopedCompanyPreview("https://example.com", {
      ...company, owner_id: null, last_activity_date: "not a date", synced_at: null,
      industry: null,
    });
    expect(preview?.company_owner_recorded).toBe(false);
    expect(preview?.last_company_activity).toBeNull();
    expect(preview?.last_company_sync).toBeNull();
    expect(preview?.industry_recorded).toBe(false);
    expect(preview?.statement).toContain("missing or unusable");
  });
});
