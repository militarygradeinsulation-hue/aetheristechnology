import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const read = (p: string) => readFileSync(resolve(process.cwd(), p), "utf8");

const activationSrc = read("src/components/network/MemberActivation.tsx");
const activationPageSrc = read("src/pages/MemberActivationPage.tsx");

describe("MemberActivation — connection-first activation (AC-2)", () => {
  it("CORE_STEPS are ordered: profile → privateGoals → ask → introduction", () => {
    const match = activationSrc.match(/CORE_STEPS[\s\S]*?=\s*\[([^\]]+)\]/);
    expect(match).not.toBeNull();
    const raw = match![1].replace(/["'\s]/g, "").split(",").filter(Boolean);
    expect(raw).toEqual(["profile", "privateGoals", "ask", "introduction"]);
  });

  it("OPTIONAL_STEPS are ordered: businessRoleVerification → notifications → calendarSetup", () => {
    const match = activationSrc.match(/OPTIONAL_STEPS[\s\S]*?=\s*\[([^\]]+)\]/);
    expect(match).not.toBeNull();
    const raw = match![1].replace(/["'\s]/g, "").split(",").filter(Boolean);
    expect(raw).toEqual(["businessRoleVerification", "notifications", "calendarSetup"]);
  });

  it("completion is derived from the stepStates prop, not from localStorage or sessionStorage", () => {
    expect(activationSrc).not.toMatch(/localStorage/);
    expect(activationSrc).not.toMatch(/sessionStorage/);
    expect(activationSrc).toMatch(/stepStates/);
    expect(activationSrc).toMatch(/completionMap/);
  });

  it("optional steps carry an 'optional' label in the rendered output", () => {
    expect(activationSrc).toMatch(/optional/);
    expect(activationSrc).toMatch(/OPTIONAL_STEPS\.map/);
  });

  it("MemberActivationPage fetches step states from the server, not from client storage", () => {
    expect(activationPageSrc).not.toMatch(/localStorage/);
    expect(activationPageSrc).not.toMatch(/sessionStorage/);
    expect(activationPageSrc).toMatch(/from\("member_activation_steps"\)/);
    expect(activationPageSrc).toMatch(/select\("step_id, completed"\)/);
    expect(activationPageSrc).toMatch(/\.eq\("user_id"/);
  });
});
