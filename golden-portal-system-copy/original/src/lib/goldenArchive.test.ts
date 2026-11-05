import { describe, it, expect } from "vitest";
import {
  normalizeDomain,
  normalizeBusinessName,
  looksLikePersonName,
  businessNameFromDomain,
  resolveBusinessIdentity,
  buildArchiveSummary,
  buildFindingRows,
  reportHash,
  isBlueprintEligible,
} from "./goldenArchive";
import { computeGoldenLeakage } from "./goldenLeakage";

describe("normalizeDomain", () => {
  it("strips protocol, www and path", () => {
    expect(normalizeDomain("https://www.Acme-Roofing.com/contact?x=1")).toBe("acme-roofing.com");
    expect(normalizeDomain("acme-roofing.com")).toBe("acme-roofing.com");
  });
  it("rejects unusable hosts", () => {
    expect(normalizeDomain("")).toBeNull();
    expect(normalizeDomain("localhost")).toBeNull();
    expect(normalizeDomain("http://127.0.0.1")).toBeNull();
    expect(normalizeDomain("https://facebook.com/somebiz")).toBeNull();
  });
  it("keeps subdomained platform sites distinct", () => {
    expect(normalizeDomain("https://joes.wixsite.com/site")).toBe("joes.wixsite.com");
  });
});

describe("normalizeBusinessName", () => {
  it("drops legal suffixes and punctuation", () => {
    expect(normalizeBusinessName("Acme Roofing, LLC")).toBe("acme roofing");
    expect(normalizeBusinessName("Acme Roofing Inc.")).toBe("acme roofing");
    expect(normalizeBusinessName("Smith & Sons Co")).toBe("smith and sons");
  });
});

describe("looksLikePersonName", () => {
  it("detects contact names", () => {
    expect(looksLikePersonName("Joseph Toney")).toBe(true);
    expect(looksLikePersonName("Dr. Dean Young")).toBe(true);
  });
  it("does not flag businesses", () => {
    expect(looksLikePersonName("Acme Roofing LLC")).toBe(false);
    expect(looksLikePersonName("Smith Plumbing")).toBe(false);
    expect(looksLikePersonName("Guggenheim Commercial Real Estate Group")).toBe(false);
    expect(looksLikePersonName("Aetheris")).toBe(false);
  });
});

describe("resolveBusinessIdentity", () => {
  it("prefers the domain when company_name is a person", () => {
    const id = resolveBusinessIdentity({
      target_url: "https://www.acme-roofing.com",
      company_name: "Joseph Toney",
    });
    expect(id.display_name).toBe("Acme Roofing");
    expect(id.primary_domain).toBe("acme-roofing.com");
    expect(id.contact_name).toBe("Joseph Toney");
    expect(id.name_source).toBe("domain");
  });

  it("keeps a real business company_name", () => {
    const id = resolveBusinessIdentity({
      target_url: "https://acme-roofing.com",
      company_name: "Acme Roofing LLC",
    });
    expect(id.display_name).toBe("Acme Roofing LLC");
    expect(id.normalized_name).toBe("acme roofing");
    expect(id.contact_name).toBeNull();
  });

  it("uses report evidence over a weak domain label", () => {
    const id = resolveBusinessIdentity({
      target_url: "https://abc123.com",
      company_name: "Jane Doe",
      raw_findings: { site: { og_site_name: "Northside Dental Group" } },
    });
    expect(id.display_name).toBe("Northside Dental Group");
    expect(id.name_source).toBe("report_evidence");
  });

  it("falls back to company_name when there is no domain", () => {
    const id = resolveBusinessIdentity({ target_url: null, company_name: "Bob Miller" });
    expect(id.display_name).toBe("Bob Miller");
    expect(id.primary_domain).toBeNull();
  });
});

describe("businessNameFromDomain", () => {
  it("title-cases the label", () => {
    expect(businessNameFromDomain("north-side-dental.com")).toBe("North Side Dental");
  });
});

const REPORT = {
  report_state: "compiled",
  compiler: { state: "compiled" },
  executive_summary: "Kent Campus scan returned a 73-point B-grade site.",
  compiled_findings: [
    { finding_id: "fnd_001", statement: "Search Snippet Is Underperforming", category: "seo", chapter_slug: "seo", root_cause_id: "rc_seo_meta", status: "unverified" },
    { finding_id: "fnd_002", statement: "Proof Assets Missing", category: "content", chapter_slug: "content", root_cause_id: "rc_proof", status: "unverified" },
  ],
  root_causes: [
    { root_cause_id: "rc_seo_meta", label: "Search snippet and metadata gaps" },
    { root_cause_id: "rc_proof", label: "Proof is not doing enough work" },
  ],
  top_leaks: [{ name: "Proof Assets Missing", dollars_low: 1000, dollars_high: 2200, chapter_slug: "content" }],
  financial_ledger: {
    overall: { annual_low: 304340, annual_high: 410321 },
    entries: [
      { entry_id: "e1", root_cause_id: "rc_proof", status: "active", annual_low: 1000, annual_high: 2200, title: "Proof Assets Missing" },
    ],
  },
  report_consistency: { compiler_version: 2, detected_findings: 2, unique_root_causes: 2 },
};

describe("buildArchiveSummary", () => {
  const summary = buildArchiveSummary({
    id: "s1",
    target_url: "https://acme-roofing.com",
    company_name: "Acme Roofing LLC",
    report: REPORT,
    report_state: "compiled",
    completed_at: "2026-08-16T00:00:00Z",
  });

  it("reads money from the canonical resolver, never from prose", () => {
    const canonical = computeGoldenLeakage(REPORT as never);
    expect(summary.annual_low).toBe(canonical!.low);
    expect(summary.annual_high).toBe(canonical!.high);
    expect(summary.currency).toBe("USD");
  });

  it("captures counts and validity", () => {
    expect(summary.finding_count).toBe(2);
    expect(summary.root_cause_count).toBe(2);
    expect(summary.is_valid).toBe(true);
  });

  it("marks regeneration_required reports invalid", () => {
    const bad = buildArchiveSummary({
      id: "s2",
      report: { ...REPORT, report_state: "regeneration_required" },
      report_state: "regeneration_required",
    });
    expect(bad.is_valid).toBe(false);
    expect(isBlueprintEligible(bad, "regeneration_required")).toBe(false);
  });
});

describe("buildFindingRows", () => {
  const rows = buildFindingRows({ id: "s1", report: REPORT });
  it("emits one row per unique finding", () => {
    expect(rows).toHaveLength(2);
    expect(new Set(rows.map((r) => r.finding_key)).size).toBe(2);
  });
  it("only attaches dollars supplied by the ledger", () => {
    expect(rows.find((r) => r.root_cause_id === "rc_seo_meta")?.annual_low).toBeNull();
    expect(rows.find((r) => r.root_cause_id === "rc_proof")?.annual_low).toBe(1000);
  });
});

describe("reportHash", () => {
  it("is stable regardless of key order", () => {
    expect(reportHash({ a: 1, b: [1, 2] })).toBe(reportHash({ b: [1, 2], a: 1 }));
  });
  it("changes when content changes", () => {
    expect(reportHash({ a: 1 })).not.toBe(reportHash({ a: 2 }));
  });
});
