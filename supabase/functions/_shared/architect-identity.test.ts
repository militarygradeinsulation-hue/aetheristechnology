import { describe, expect, it } from "vitest";
import {
  THE_ARCHITECT_ID,
  THE_ARCHITECT_PROMPT,
  architectIdentityPrompt,
  buildArchitectIdentityPolicy,
} from "./architect-identity";
import personaSource from "./architect-persona-source.json";

describe("The Architect identity", () => {
  it("uses a stable id and an evidence disciplined operating prompt", () => {
    expect(THE_ARCHITECT_ID).toBe("the-architect");
    expect(THE_ARCHITECT_PROMPT).toContain("observe, connect, verify, prioritize, build, measure");
    expect(THE_ARCHITECT_PROMPT).toContain("Never invent results");
    expect(THE_ARCHITECT_PROMPT).toContain("one coherent system");
    for (const domain of ["Psychology", "Philosophy", "History", "Theology", "Artificial intelligence", "Coding", "Marketing"]) {
      expect(THE_ARCHITECT_PROMPT).toContain(domain);
    }
  });

  it("is opt in", () => {
    expect(architectIdentityPrompt("default")).toBe("");
    expect(architectIdentityPrompt(THE_ARCHITECT_ID)).toBe(THE_ARCHITECT_PROMPT);
    expect(architectIdentityPrompt("invented", "post")).toBe("");
  });

  it("builds bounded policies for Nexus and audience facing posts", () => {
    const nexus = buildArchitectIdentityPolicy("nexus");
    const post = buildArchitectIdentityPolicy("post");
    expect(nexus).toContain("NEXUS CONTEXT");
    expect(nexus).toContain("persistent memory");
    expect(nexus).toContain("Golden Report money locks");
    expect(post).toContain("POST GENERATION CONTEXT");
    expect(post).toContain("finished audience facing copy");
    expect(post).toContain("at most one strong analogy in a short post");
    expect(post).toContain("Never claim Joseph authored another business's lived experience");
    expect(post.length).toBeLessThan(9000);
  });

  it("defines an analogy as mapping with a limit and practical action", () => {
    const post = buildArchitectIdentityPolicy("post");
    expect(post).toContain("state the literal concept");
    expect(post).toContain("map only the useful parts");
    expect(post).toContain("state the relevant limit");
    expect(post).toContain("return to practical action");
  });

  it("preserves the complete model agnostic source specification server side", () => {
    expect(personaSource.schema_version).toBe("1.0.0");
    expect(personaSource.persona_id).toBe("joseph_toney_the_architect");
    expect(Object.keys(personaSource.knowledge_domains)).toHaveLength(7);
    expect(JSON.stringify(personaSource).length).toBeGreaterThan(30000);
  });
});