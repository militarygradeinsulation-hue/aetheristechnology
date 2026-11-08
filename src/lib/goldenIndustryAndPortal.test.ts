import { describe, expect, it } from "vitest";
import { classifyIndustryHeuristic } from "../../supabase/functions/_shared/industry-intelligence";

describe("Golden Report industry-aware search", () => {
  it("recognizes architecture firms from names and domains", () => {
    const found = classifyIndustryHeuristic({ companyName: "Hamida Architects", domain: "hamida-architects.com" });
    expect(found.industry).toBe("Architecture & Design");
    expect(found.confidence).toBeGreaterThanOrEqual(0.73);
  });
  it("recognizes manufacturing words including word endings", () => {
    expect(classifyIndustryHeuristic({ companyName: "Acme Manufacturing" }).industry)
      .toBe("Manufacturing & Industrial");
    expect(classifyIndustryHeuristic({ companyName: "Precision Machining CNC" }).industry)
      .toBe("Manufacturing & Industrial");
  });
  it("recognizes engineering firms", () => {
    expect(classifyIndustryHeuristic({ companyName: "Structural Engineering Services" }).industry)
      .toBe("Engineering & Technical Services");
  });
  it("does not fabricate an industry without evidence", () => {
    expect(classifyIndustryHeuristic({ companyName: "Generic Holdings", domain: "generic-holdings.com" }).industry).toBeNull();
  });
});
