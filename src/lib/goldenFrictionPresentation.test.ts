import { describe, expect, it } from "vitest";
import type { FrictionOpportunity } from "../../supabase/functions/_shared/golden-friction-intelligence";
import {
  EVIDENCE_LABEL, evidenceStrength, groupInvestigations, observationHeadline,
} from "./goldenFrictionPresentation";

const opportunity = (
  id: string,
  observation: string,
  lens: FrictionOpportunity["lens"],
  rootCauseId?: string,
  evidenceStatus = "verified",
): FrictionOpportunity => ({
  id, observation, lens, rootCauseId, chapter: "Quote follow up",
  pattern: "handoff_gap", patternLabel: "Operational handoff: inspect the break between steps",
  basis: "linked_claim",
  evidence: evidenceStatus === "none" ? [] : [{
    claimId: id + "-c1", statement: "A source excerpt", status: evidenceStatus,
    sourceUrl: "https://example.com/source", sourceLocator: null,
  }],
  hypothesis: "The handoff may be slowing buyers", test: "Compare two procedures",
  metric: "Follow up rate",
});

describe("Golden Report investigation presentation", () => {
  it("uses specific observed problems rather than repeated generic model labels", () => {
    const title = observationHeadline(
      "The quote process takes buyers through unnecessary choices before their project is accepted.",
    );
    expect(title).toContain("quote process");
    expect(title).not.toContain("Operational handoff");
    expect(observationHeadline("The page is not clear. It may hide delivery timelines."))
      .toBe("The page is not clear. It may hide delivery timelines.");
  });

  it("groups the same source root cause across lenses without dropping evidence", () => {
    const one = opportunity("f-1:operational", "Leads are not followed up after a quote.", "operational", "root-A");
    const two = opportunity("f-2:economic", "Unanswered quotes may reduce gross profit.", "economic", "root-A");
    const result = groupInvestigations([one,two]);
    expect(result).toHaveLength(1);
    expect(result[0].related).toHaveLength(2);
    expect(result[0].lensIds).toEqual(["operational","economic"]);
  });

  it("keeps genuinely different observations separate even when pattern is repeated", () => {
    const one = opportunity("x", "Lead capture form does not show confirmation.", "operational");
    const two = opportunity("y", "The quote process has a three-day response delay.", "operational");
    const result = groupInvestigations([one,two]);
    expect(result).toHaveLength(2);
    expect(result[0].primary.observation).not.toBe(result[1].primary.observation);
  });

  it("labels evidence according to source status without upgrading suggestions", () => {
    expect(evidenceStrength(opportunity("a","A problem", "operational"))).toBe("observed");
    expect(evidenceStrength(opportunity("b","A problem", "perceptual", undefined,"needs_review"))).toBe("linked");
    expect(evidenceStrength(opportunity("c","A problem", "perceptual", undefined,"audit_suggestion_not_verified"))).toBe("review");
    expect(evidenceStrength(opportunity("d","A problem", "human", undefined,"none"))).toBe("review");
    expect(EVIDENCE_LABEL.review).toBe("Needs validation");
  });

  it("prioritizes different disciplines and verified evidence in the visible queue", () => {
    const entries = [
      opportunity("one","Quote follow up is missing in the CRM.", "operational",undefined,"verified"),
      opportunity("two","Lead capture has no assigned sales owner.", "operational",undefined,"verified"),
      opportunity("three","Price choices are not explained clearly.", "perceptual",undefined,"verified"),
      opportunity("four","Delivery commitments could change margin exposure.", "economic",undefined,"needs_review"),
    ];
    const grouped = groupInvestigations(entries);
    expect(grouped).toHaveLength(4);
    expect(grouped[0].primary.lens).toBe("operational");
    expect(grouped[1].primary.lens).toBe("perceptual");
    expect(grouped[2].primary.lens).toBe("economic");
  });

  it("keeps titles compact on narrow screens without deleting the full finding", () => {
    const statement = "Customer experience improves if we " + "observe every process carefully ".repeat(12);
    const headline = observationHeadline(statement);
    expect(headline.length).toBeLessThanOrEqual(107);
    expect(headline.endsWith("…")).toBe(true);
    const group = groupInvestigations([opportunity("x",statement,"human")])[0];
    expect(group.primary.observation).toBe(statement);
  });
});
