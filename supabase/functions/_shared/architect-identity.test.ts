import { describe, expect, it } from "vitest";
import { THE_ARCHITECT_ID, THE_ARCHITECT_PROMPT, architectIdentityPrompt } from "./architect-identity";

describe("The Architect identity", () => {
  it("uses a stable id and an evidence disciplined operating prompt", () => {
    expect(THE_ARCHITECT_ID).toBe("the-architect");
    expect(THE_ARCHITECT_PROMPT).toContain("observe, connect, verify, prioritize, build, measure");
    expect(THE_ARCHITECT_PROMPT).toContain("Never invent customer results");
    expect(THE_ARCHITECT_PROMPT).toContain("one coherent system");
  });

  it("is opt in", () => {
    expect(architectIdentityPrompt("default")).toBe("");
    expect(architectIdentityPrompt(THE_ARCHITECT_ID)).toBe(THE_ARCHITECT_PROMPT);
  });
});