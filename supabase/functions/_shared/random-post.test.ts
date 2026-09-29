import { describe, expect, it } from "vitest";
import { randomPostUserPrompt, validateRandomPost } from "./random-post";

const base = {
  platform: "linkedin",
  mode: "brand",
  preset: "social",
};

describe("random post writing identity", () => {
  it("applies The Architect only when selected", () => {
    const architect = validateRandomPost({ ...base, identity: "the-architect" });
    const standard = validateRandomPost({ ...base, identity: "default" });
    expect(randomPostUserPrompt(architect, false)).toContain("THE ARCHITECT");
    expect(randomPostUserPrompt(architect, false)).toContain("observe, connect, verify, prioritize, build, measure");
    expect(randomPostUserPrompt(standard, false)).not.toContain("THE ARCHITECT");
  });

  it("rejects unknown identity values by returning the legacy default", () => {
    expect(validateRandomPost({ ...base, identity: "invented" }).identity).toBe("default");
  });
});