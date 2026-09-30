import { describe, expect, it } from "vitest";
import { buildBusinessXray } from "./businessXray";
import { buildXraySection } from "./generateForensicGoldenPdf";
import { resolveFinancialLedger } from "./goldenLeakage";
import { QA_FULL_REPORT } from "./goldenReportParity.fixture";

const structured = {
  evidence_ledger: [
    { claim_id: "c1", statement: "Meta description missing", status: "verified", confidence: 0.9, source_url: "https://x.com/" },
    { claim_id: "c2", statement: "No testimonials found", status: "inferred", confidence: 0.5 },
  ],
  root_causes: [{ root_cause_id: "rc_a", label: "Shared cause" }],
  compiled_findings: [
    { finding_id: "f1", category: "seo", statement: "Snippet weak", status: "verified", claim_ids: ["c1"], root_cause_id: "rc_a" },
    { finding_id: "f2", category: "proof", statement: "Proof thin", status: "inferred", claim_ids: ["c2"], root_cause_id: "rc_a" },
    { finding_id: "f3", category: "cta", statement: "CTA unclear", status: "unverified", claim_ids: ["missing"] },
  ],
  chapters: [{ slug: "seo-discoverability", what_to_do: { this_week: ["Rewrite the meta description"] } }],
};

const node = (x: ReturnType<typeof buildBusinessXray>, id: string) => x.nodes.find((n) => n.id === id)!;

describe("Business X-Ray", () => {
  it("links existing findings to steps with honest statuses", () => {
    const x = buildBusinessXray(structured);
    expect(node(x, "discovery").status).toBe("breakdown");
    expect(node(x, "trust").status).toBe("investigate");
    expect(node(x, "follow_up").status).toBe("unknown");
    expect(x.counts.corrected).toBe(0);
    expect(x.preliminary).toBe(true);
    expect(node(x, "discovery").recommended_action).toBe("Rewrite the meta description");
    expect(x.counts.linked_findings).toBe(3);
  });

  it("keeps evidence confidence separate from status and handles missing evidence", () => {
    const x = buildBusinessXray(structured);
    expect(node(x, "discovery").evidence_confidence).toBe("high");
    const inquiry = node(x, "inquiry");
    expect(inquiry.findings[0].evidence).toHaveLength(0);
    expect(inquiry.evidence_confidence).toBe("none");
    expect(inquiry.status).toBe("investigate");
  });

  it("never marks public-scan edges verified and keeps internal edges unknown", () => {
    const x = buildBusinessXray(structured);
    expect(x.edges.some((e) => e.basis === "verified")).toBe(false);
    expect(x.edges.find((e) => e.to === "follow_up")!.basis).toBe("unknown");
    expect(x.edges.find((e) => e.from === "discovery")!.basis).toBe("inferred");
  });

  it("green only with a saved baseline and current value", () => {
    const incomplete = buildBusinessXray({ ...structured, xray_corrections: [{ node_id: "discovery", metric: "CTR" }] });
    expect(node(incomplete, "discovery").status).toBe("breakdown");
    const full = buildBusinessXray({ ...structured, xray_corrections: [{ node_id: "discovery", metric: "CTR", baseline: "1%", current: "3%", verified_at: "2026-09-01" }] });
    expect(node(full, "discovery").status).toBe("corrected");
    expect(full.history_available).toBe(true);
  });

  it("legacy reports fall back to an all-unknown map", () => {
    const x = buildBusinessXray({ chapters: [], executive_summary: "old" });
    expect(x.legacy_fallback).toBe(true);
    expect(x.nodes.every((n) => n.status === "unknown")).toBe(true);
    expect(buildBusinessXray(null).nodes.length).toBeGreaterThan(0);
  });

  it("uses ledger exposure per root cause without new totals, flagging duplicates", () => {
    const x = buildBusinessXray(QA_FULL_REPORT);
    const ledger = resolveFinancialLedger(QA_FULL_REPORT as never);
    const ids = new Set(ledger.active.map((e) => e.leak_id));
    for (const n of x.nodes) for (const f of n.findings) if (f.exposure) expect(ids.has(f.exposure.leak_id)).toBe(true);
    expect(JSON.stringify(x)).not.toMatch(/total/i);
  });

  it("shared root cause across steps is reported once with a shared_with count", () => {
    const rep = {
      ...structured,
      financial_ledger: undefined,
      top_leaks: [{ rank: 1, name: "Shared cause", dollars_low: 1000, dollars_high: 2000, chapter_slug: "seo-discoverability" }],
    };
    const x = buildBusinessXray(rep);
    const exposures = x.nodes.flatMap((n) => n.findings).map((f) => f.exposure).filter(Boolean);
    for (const e of exposures) expect(e!.shared_with).toBeGreaterThanOrEqual(1);
  });

  it("PDF section is static, preliminary and additive", () => {
    const s = buildXraySection(structured)!;
    expect(s.id).toBe("business-xray");
    expect(s.indexed).toBe(false);
    expect(JSON.stringify(s)).toMatch(/Preliminary/);
    expect(buildXraySection({})).not.toBeNull();
  });
});
