import { describe, expect, it } from "vitest";
import {
  EXECUTIVE_MEETING_FLOW,
  answeredQuestionCount,
  buildStageHandoff,
  stageById,
  stageGateComplete,
  stageQuestionCount,
} from "./executiveMeetingFlow";

describe("Aetheris executive meeting flow", () => {
  it("keeps the required Dean -> Braden -> Joseph sequence", () => {
    expect(EXECUTIVE_MEETING_FLOW.map((stage) => stage.id)).toEqual(["dean", "braden", "joseph"]);
    expect(EXECUTIVE_MEETING_FLOW.map((stage) => stage.owner)).toEqual(["Dean", "Braden", "Joseph"]);
  });

  it("has unique question and gate ids across the full process", () => {
    const questionIds = EXECUTIVE_MEETING_FLOW.flatMap((stage) =>
      stage.sections.flatMap((section) => section.questions.map((question) => question.id)),
    );
    const gateIds = EXECUTIVE_MEETING_FLOW.flatMap((stage) =>
      stage.gates.map((gate) => `${stage.id}:${gate.id}`),
    );
    expect(new Set(questionIds).size).toBe(questionIds.length);
    expect(new Set(gateIds).size).toBe(gateIds.length);
  });

  it("requires meaningful stage gates before handoff", () => {
    for (const stage of EXECUTIVE_MEETING_FLOW) {
      expect(stage.gates.length).toBeGreaterThanOrEqual(4);
      expect(stageGateComplete(stage, {})).toBe(false);
      const completed = Object.fromEntries(stage.gates.map((gate) => [gate.id, true]));
      expect(stageGateComplete(stage, completed)).toBe(true);
    }
  });

  it("tracks question completion without requiring every question to advance", () => {
    const dean = stageById("dean");
    expect(stageQuestionCount(dean)).toBeGreaterThan(20);
    expect(answeredQuestionCount(dean, { d2: "Warm referral", d4: "Follow-up is inconsistent" })).toBe(2);
  });

  it("builds a handoff only from the important recorded answers", () => {
    const dean = stageById("dean");
    const handoff = buildStageHandoff(dean, "Northline Mechanical", "Alex Rivera", {
      d2: "Expansion exposed gaps in the lead handoff.",
      d4: "Sales and operations disagree on ownership.",
      d1: "This should not appear because it is not a handoff key.",
    });
    expect(handoff).toContain("AETHERIS HANDOFF");
    expect(handoff).toContain("Northline Mechanical");
    expect(handoff).toContain("Alex Rivera");
    expect(handoff).toContain("Expansion exposed gaps");
    expect(handoff).not.toContain("This should not appear");
  });
});
