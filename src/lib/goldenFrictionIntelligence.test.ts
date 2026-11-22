import { describe, expect, it } from "vitest";
import { buildFrictionIntelligence } from "../../supabase/functions/_shared/golden-friction-intelligence";
import { buildGoldenReportModel, modelText } from "./goldenReportModel";

const saved = {
  evidence_ledger: [
    {
      claim_id: "cl-1", statement: "Quoted delivery terms were omitted from the documented proposal",
      status: "verified", source_url: "https://example.com/proposal", source_locator: "/proposal",
    },
    {
      claim_id: "cl-2", statement: "No response after the inquiry reached the sales team",
      status: "needs_review", source_locator: "CRM:lead-17",
    },
  ],
  compiled_findings: [
    {
      finding_id: "f-1", category: "proposal", chapter_slug: "brand consistency",
      statement: "Pricing and delivery reassurance are missing from the quote proposal.",
      status: "inferred", claim_ids: ["cl-1"],
    },
    {
      finding_id: "f-2", category: "sales", chapter_slug: "pipeline",
      statement: "Sales handoff delays leave the customer inquiry without a response.",
      status: "verified", claim_ids: ["cl-2"],
    },
    {
      finding_id: "f-3", category: "owner capacity", chapter_slug: "owner-capacity",
      statement: "Manager and staff decision ownership is unclear across operations.",
      claim_ids: [],
    },
  ],
  chapters: [],
};

describe("Golden Report four-lens friction intelligence", () => {
  it("always exposes four defined lenses in the intended order", () => {
    expect(buildFrictionIntelligence(saved).lenses.map(x => x.id)).toEqual([
      "operational", "perceptual", "human", "economic",
    ]);
  });

  it("links source-backed findings to the original claims without upgrading confidence", () => {
    const model = buildFrictionIntelligence(saved);
    const p = model.opportunities.find(x => x.observation.includes("delivery reassurance"));
    expect(p).toBeDefined();
    expect(p?.evidence[0].claimId).toBe("cl-1");
    expect(p?.evidence[0].status).toBe("verified");
    expect(p?.evidence[0].sourceUrl).toBe("https://example.com/proposal");
    expect(p?.hypothesis).toBeTruthy();
    expect(p?.test).toBeTruthy();
    expect(p?.metric).toBeTruthy();
  });

  it("does not manufacture actual psychological motives or price additional losses", () => {
    const model = buildFrictionIntelligence(saved);
    expect(JSON.stringify(model)).not.toMatch(/\$\s*[1-9][0-9]{2,}/);
    expect(model.preliminary).toBe(true);
    expect(model.notes.join(" ")).toMatch(/financial ledger/);
  });

  it("distinguishes unassessed lenses from a clean report", () => {
    const model = buildFrictionIntelligence({});
    expect(model.opportunities).toEqual([]);
    expect(model.lenses.every(l => l.status === "not_evaluated")).toBe(true);
  });

  it("uses chapter observations as clearly unverified fallback for historic reports", () => {
    const model = buildFrictionIntelligence({
      chapters: [{
        title: "Sales pipeline", slug: "pipeline-forensics",
        what_we_found: "Follow-up emails are delayed after a customer submits the form.",
        evidence: [{ label: "Captured page", value: "Form exists but no response evidence" }],
      }],
    });
    expect(model.opportunities.length).toBeGreaterThan(0);
    expect(model.opportunities[0].basis).toBe("report_statement");
    expect(model.lenses.find(l => l.id === "operational")?.status).toBe("review_required");
  });

  it("recognizes automation-versus-trust as a Doorman review pattern, not proven causation", () => {
    const model = buildFrictionIntelligence({
      compiled_findings: [{
        finding_id: "f-automation", category: "sales",
        statement: "Automated scripts removed the reassurance buyers previously received.",
      }],
    });
    expect(model.opportunities.some(o => o.pattern === "doorman_risk")).toBe(true);
    expect(model.opportunities.some(o => o.hypothesis.includes("might"))).toBe(true);
  });

  it("does not generate remote requests and leaves economic totals to the existing ledger", () => {
    const model = buildFrictionIntelligence({
      compiled_findings: [{
        finding_id: "f-margin", chapter_slug: "pipeline", category: "finance",
        statement: "Revenue and profit margin may be affected by lost repeat customer orders.",
      }],
    });
    expect(model.lenses.find(l => l.id === "economic")?.opportunities.length).toBeGreaterThan(0);
    expect(model.opportunities.every(o => !Object.keys(o).some(k => k.includes("annual_low")))).toBe(true);
  });

  it("creates the same four-lens section in complete and executive PDFs, excluding ledger appendix", () => {
    const build = (profile: "executive" | "complete" | "data_appendix") =>
      buildGoldenReportModel({
        report: saved, company: "Example LLC", url: "https://example.com",
        scanId: "test-f", profile,
      });
    for (const profile of ["executive", "complete"] as const) {
      const output = build(profile);
      expect(output.sections.some(s => s.id === "behavioral-friction-intelligence")).toBe(true);
      expect(modelText(output)).toContain("Behavioral Friction Intelligence");
      expect(modelText(output)).toContain("Four friction lenses");
    }
    expect(build("data_appendix").sections.some(s => s.id === "behavioral-friction-intelligence")).toBe(false);
  });
});
