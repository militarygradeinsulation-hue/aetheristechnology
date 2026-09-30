import { describe, expect, it } from "vitest";
import { buildBusinessXray, stageFromText } from "./businessXray";
import { buildXraySection } from "./generateForensicGoldenPdf";
import { resolveFinancialLedger } from "./goldenLeakage";
import { QA_FULL_REPORT } from "./goldenReportParity.fixture";
import { XRAY_REAL_REPORT } from "./businessXray.fixture";

const structured = {
  evidence_ledger: [
    { claim_id: "c1", statement: "Meta description missing", status: "verified", confidence: 0.9, source_url: "https://x.com/" },
    { claim_id: "c2", statement: "No testimonials found", status: "inferred", confidence: 0.5 },
  ],
  root_causes: [{ root_cause_id: "rc_a", label: "Shared cause", chapter_slugs: ["seo"] }],
  compiled_findings: [
    { finding_id: "f1", category: "seo", statement: "Snippet weak", status: "verified", claim_ids: ["c1"], root_cause_id: "rc_a" },
    { finding_id: "f2", category: "proof", statement: "Proof thin", status: "inferred", claim_ids: ["c2"], root_cause_id: "rc_a" },
    { finding_id: "f3", category: "cta", statement: "CTA unclear", status: "unverified", claim_ids: ["missing"] },
    // Production shape: generic category, free-text slug.
    { finding_id: "f4", category: "other", chapter_slug: "brand consistency", statement: "Tagline differs", status: "inferred" },
    { finding_id: "f5", category: "other", chapter_slug: "lead capture", statement: "No form", status: "inferred" },
    { finding_id: "f6", category: "other", chapter_slug: "zzz", statement: "Something unrelated qqq", status: "inferred" },
  ],
  chapters: [{ slug: "seo-discoverability", title: "SEO", verdict: "Meta tags are weak.", what_to_do: { this_week: ["Rewrite the meta description"] } }],
};

const node = (x: ReturnType<typeof buildBusinessXray>, id: string) => x.nodes.find((n) => n.id === id)!;

describe("Business X-Ray on a real production report", () => {
  const x = buildBusinessXray(XRAY_REAL_REPORT);
  const findings = XRAY_REAL_REPORT.compiled_findings as Array<{ finding_id: string }>;

  it("non-empty report produces populated stages", () => {
    const populated = x.nodes.filter((n) => n.findings.length > 0);
    expect(populated.length).toBeGreaterThanOrEqual(3);
    expect(x.ranked.length).toBeGreaterThan(0);
    expect(x.nodes.filter((n) => n.chapters.length > 0).length).toBeGreaterThanOrEqual(5);
  });

  it("every compiled finding is mapped or explicitly unmapped", () => {
    const mapped = x.nodes.flatMap((n) => n.findings.map((f) => f.finding_id));
    const un = x.unmapped.map((u) => u.finding_id);
    expect(mapped.length + un.length).toBe(findings.length);
    expect(new Set([...mapped, ...un]).size).toBe(findings.length);
  });

  it("canonical exposure is never double-counted", () => {
    const ledger = resolveFinancialLedger(XRAY_REAL_REPORT as never);
    const primaries = x.nodes.flatMap((n) => n.exposures.filter((e) => e.primary));
    const ids = primaries.map((p) => p.leak_id);
    expect(new Set(ids).size).toBe(ids.length);
    const active = new Map(ledger.active.map((e) => [e.leak_id, e]));
    for (const p of primaries) {
      expect(active.get(p.leak_id)!.annual_low).toBe(p.annual_low);
      expect(active.get(p.leak_id)!.annual_high).toBe(p.annual_high);
    }
  });
});

describe("Business X-Ray mapping rules", () => {
  it("normalizes aliases", () => {
    expect(stageFromText("seo_snippet_performance")).toBe("discovery");
    expect(stageFromText("brand_contradictions")).toBe("trust");
    expect(stageFromText("homepage-lead-capture")).toBe("inquiry");
    expect(stageFromText("pipeline-forensics")).toBe("follow_up");
    expect(stageFromText("owner capacity")).toBe("owner");
    expect(stageFromText("speed")).toBe("website");
  });

  it("maps generic 'other' findings by slug and buckets the rest", () => {
    const x = buildBusinessXray(structured);
    expect(node(x, "trust").findings.some((f) => f.finding_id === "f4")).toBe(true);
    expect(node(x, "inquiry").findings.some((f) => f.finding_id === "f5")).toBe(true);
    expect(x.unmapped.map((u) => u.finding_id)).toEqual(["f6"]);
  });

  it("statuses are honest and confidence stays separate", () => {
    const x = buildBusinessXray(structured);
    expect(node(x, "discovery").status).toBe("breakdown");
    expect(node(x, "discovery").evidence_confidence).toBe("high");
    expect(node(x, "trust").status).toBe("investigate");
    const inquiry = node(x, "inquiry");
    expect(inquiry.findings[0].evidence).toHaveLength(0);
    expect(inquiry.evidence_confidence).toBe("none");
    expect(node(x, "discovery").recommended_actions).toContain("Rewrite the meta description");
  });

  it("unknown never overwrites a stage that has evidence", () => {
    const x = buildBusinessXray(structured);
    for (const n of x.nodes) if (n.findings.length || n.exposures.length) expect(n.status).not.toBe("unknown");
    const chapterOnly = buildBusinessXray({ chapters: [{ slug: "pipeline-forensics", title: "Pipeline", verdict: "Leads wait two days for a reply.", what_we_found: "Contact form has no autoresponder." }] });
    expect(node(chapterOnly, "follow_up").status).toBe("investigate");
    expect(node(chapterOnly, "follow_up").summary).toMatch(/two days/);
  });

  it("a chapter saying 'no leaks detected' stays unknown but still shows its summary", () => {
    const x = buildBusinessXray({ chapters: [{ slug: "seo-discoverability", verdict: "No active SEO leaks detected." }] });
    expect(node(x, "discovery").status).toBe("unknown");
    expect(node(x, "discovery").summary).toMatch(/not proof/);
  });

  it("public scan edges are never verified", () => {
    const x = buildBusinessXray(structured);
    expect(x.edges.some((e) => e.basis === "verified")).toBe(false);
    expect(x.edges.find((e) => e.from === "discovery")!.basis).toBe("inferred");
  });

  it("green only with saved baseline and current value", () => {
    const partial = buildBusinessXray({ ...structured, xray_corrections: [{ node_id: "discovery", metric: "CTR" }] });
    expect(node(partial, "discovery").status).toBe("breakdown");
    const full = buildBusinessXray({ ...structured, xray_corrections: [{ node_id: "discovery", metric: "CTR", baseline: "1%", current: "3%", verified_at: "2026-09-01" }] });
    expect(node(full, "discovery").status).toBe("corrected");
  });

  it("legacy reports populate from chapters and ledger", () => {
    const x = buildBusinessXray(QA_FULL_REPORT);
    expect(x.nodes.some((n) => n.status !== "unknown")).toBe(true);
    expect(buildBusinessXray(null).nodes.length).toBe(6);
  });

  it("PDF section is static, preliminary and additive", () => {
    const s = buildXraySection(XRAY_REAL_REPORT)!;
    expect(s.id).toBe("business-xray");
    expect(s.indexed).toBe(false);
    expect(JSON.stringify(s)).toMatch(/Preliminary/);
    expect(buildXraySection({})).not.toBeNull();
  });
});
