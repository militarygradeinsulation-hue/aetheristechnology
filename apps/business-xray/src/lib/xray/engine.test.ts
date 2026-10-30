import { describe, expect, it } from "vitest";
import { computeAssessment, computeScores } from "./engine";
import { DEFAULT_ASSUMPTIONS, initialAssumptions, sanitizeAssumptions } from "./assumptions";
import { SAMPLE_ANSWERS } from "./sample";
import { validateAll, validateStep } from "./validation";
import { pruneHidden } from "./questions";
import type { Answers } from "./types";

const A = DEFAULT_ASSUMPTIONS;

/** Minimal valid answer set with every friction source switched off. */
const QUIET: Answers = {
  industry: "professional",
  teamSize: "5",
  hourlyCost: "40",
  primaryConcern: "unsure",
  handoffsPerJob: "0_1",
  handoffChasing: "1",
  approvalsPerWeek: "0",
  leadsPerMonth: "0",
  repetitiveHours: "0",
  toolCount: "1_3",
  toolsConnected: "mostly",
  reworkFrequency: "rarely",
  dataConfidence: "reasonable",
};

describe("computeAssessment — determinism", () => {
  it("returns identical output for identical input", () => {
    const a1 = computeAssessment(SAMPLE_ANSWERS, initialAssumptions(SAMPLE_ANSWERS));
    const a2 = computeAssessment(SAMPLE_ANSWERS, initialAssumptions(SAMPLE_ANSWERS));
    expect(a1).toEqual(a2);
  });

  it("never produces verified evidence", () => {
    const a = computeAssessment(SAMPLE_ANSWERS, initialAssumptions(SAMPLE_ANSWERS));
    expect(a.verifiedCount).toBe(0);
    const kinds = [...a.components.flatMap((c) => c.inputs), ...a.findings.flatMap((f) => f.evidence)].map((e) => e.kind);
    expect(kinds).not.toContain("VERIFIED");
  });
});

describe("labour components", () => {
  it("prices repetitive entry as hours × weeks × cost × recovery%", () => {
    const a = computeAssessment({ ...QUIET, repetitiveHours: "10" }, initialAssumptions(QUIET));
    const rep = a.components.find((c) => c.id === "repetitive")!;
    // 10 h/wk × 46 wks = 460 h; × $40 = $18,400; × 15/30/45 %
    expect(rep.hoursPerYear).toBe(460);
    expect(rep.range).toEqual({ low: 2760, base: 5520, high: 8280 });
  });

  it("prices approvals using the chasing minutes for the reported wait", () => {
    const answers = { ...QUIET, approvalsPerWeek: "12", approvalWait: "3_5_days" };
    const a = computeAssessment(answers, initialAssumptions(answers));
    const ap = a.components.find((c) => c.id === "approvals")!;
    // 12 × 20 min = 4 h/wk → 184 h/yr → × $40 × 30% = $2,208
    expect(ap.hoursPerYear).toBe(184);
    expect(ap.range?.base).toBe(2208);
  });

  it("orders low ≤ base ≤ high", () => {
    const a = computeAssessment(SAMPLE_ANSWERS, initialAssumptions(SAMPLE_ANSWERS));
    const r = a.totals.range!;
    expect(r.low).toBeLessThanOrEqual(r.base);
    expect(r.base).toBeLessThanOrEqual(r.high);
  });

  it("total equals the sum of estimated components (no double counting)", () => {
    const a = computeAssessment(SAMPLE_ANSWERS, initialAssumptions(SAMPLE_ANSWERS));
    const sum = a.components.filter((c) => c.status === "estimated").reduce((s, c) => s + c.range!.base, 0);
    expect(a.totals.range!.base).toBe(sum);
  });
});

describe("overlap cap (boundary)", () => {
  it("scales labour hours down to the cap when reported time is implausible", () => {
    // 2 people × 38 h × 46 wks × 20% = 699.2 h cap; 100 h/wk reported = 4,600 h
    const answers = { ...QUIET, teamSize: "2", repetitiveHours: "100" };
    const a = computeAssessment(answers, initialAssumptions(answers));
    expect(a.totals.capApplied).toBe(true);
    expect(a.totals.laborHoursPerYear).toBeLessThanOrEqual(700);
  });

  it("does not apply the cap for modest figures", () => {
    const answers = { ...QUIET, repetitiveHours: "2" };
    const a = computeAssessment(answers, initialAssumptions(answers));
    expect(a.totals.capApplied).toBe(false);
  });
});

describe("enquiry component", () => {
  const leadBase = { ...QUIET, leadsPerMonth: "20", followUpSpeed: "longer", leadTracking: "inbox" };

  it("is 'insufficient' without a sale value rather than guessing", () => {
    const a = computeAssessment(leadBase, initialAssumptions(leadBase));
    expect(a.components.find((c) => c.id === "leads")!.status).toBe("insufficient");
  });

  it("uses gross margin, not revenue", () => {
    const answers = { ...leadBase, avgDealValue: "1000" };
    const a = computeAssessment(answers, initialAssumptions(answers));
    // 240 enquiries × 2% × 1.0 × $1,000 × 40% = $1,920
    expect(a.components.find((c) => c.id === "leads")!.range?.base).toBe(1920);
  });

  it("assumes no uplift when replies already happen within an hour", () => {
    const answers = { ...leadBase, followUpSpeed: "under_1h", avgDealValue: "1000" };
    const a = computeAssessment(answers, initialAssumptions(answers));
    expect(a.components.find((c) => c.id === "leads")!.status).toBe("not_applicable");
  });
});

describe("zero-data and no-friction cases", () => {
  it("empty answers → insufficient information, no fabricated numbers", () => {
    const a = computeAssessment({}, DEFAULT_ASSUMPTIONS);
    expect(a.totals.status).toBe("insufficient");
    expect(a.totals.range).toBeNull();
    expect(a.confidence).toBe("insufficient");
    expect(a.scores.every((s) => s.score === null && s.band === "insufficient")).toBe(true);
    expect(a.findings).toHaveLength(0);
  });

  it("all-zero friction → 'none reported', not a fake $0 saving", () => {
    const a = computeAssessment(QUIET, initialAssumptions(QUIET));
    expect(a.totals.status).toBe("none_reported");
    expect(a.totals.range).toBeNull();
    expect(a.findings).toHaveLength(0);
  });
});

describe("conditional branches", () => {
  it("ignores answers to hidden questions", () => {
    const stale = { ...QUIET, approvalsPerWeek: "0", approvalWait: "over_week" };
    expect(pruneHidden(stale).approvalWait).toBeUndefined();
    const a = computeAssessment(stale, initialAssumptions(stale));
    expect(a.components.find((c) => c.id === "approvals")!.status).toBe("not_applicable");
  });

  it("requires the follow-up questions only when enquiries > 0", () => {
    expect(validateStep(2, { ...QUIET, leadsPerMonth: "0" }).followUpSpeed).toBeUndefined();
    expect(validateStep(2, { ...QUIET, leadsPerMonth: "5" }).followUpSpeed).toBeDefined();
  });
});

describe("validation", () => {
  it("rejects out-of-range team size", () => {
    expect(validateStep(1, { ...QUIET, teamSize: "0" }).teamSize).toBeDefined();
    expect(validateStep(1, { ...QUIET, teamSize: "501" }).teamSize).toBeDefined();
    expect(validateStep(1, { ...QUIET, teamSize: "500" }).teamSize).toBeUndefined();
  });

  it("accepts 'not sure' for hourly cost and falls back to the estimated default", () => {
    const answers = { ...QUIET, hourlyCost: "unknown", repetitiveHours: "5" };
    expect(validateAll(answers)).toEqual({});
    const a = computeAssessment(answers, initialAssumptions(answers));
    expect(a.assumptions.hourlyCost).toBe(35);
    expect(a.hourlyCostSource).toBe("ESTIMATED");
  });

  it("the sample answers are complete and valid", () => {
    expect(validateAll(SAMPLE_ANSWERS)).toEqual({});
  });
});

describe("assumptions", () => {
  it("clamps and orders edited values", () => {
    const s = sanitizeAssumptions({ ...A, recoveryLow: 80, recoveryHigh: 10, hourlyCost: -5 });
    expect(s.hourlyCost).toBe(0);
    expect(s.recoveryLow).toBeLessThanOrEqual(s.recoveryBase);
    expect(s.recoveryBase).toBeLessThanOrEqual(s.recoveryHigh);
  });
});

describe("scores and findings", () => {
  it("returns at most three ranked findings for the sample", () => {
    const a = computeAssessment(SAMPLE_ANSWERS, initialAssumptions(SAMPLE_ANSWERS));
    expect(a.findings.length).toBe(3);
    expect(a.findings.map((f) => f.rank)).toEqual([1, 2, 3]);
    expect(a.findings.every((f) => f.verifyData.length > 0)).toBe(true);
  });

  it("marks a dimension as limited when it rests on fewer than two signals", () => {
    const process = computeScores({ reworkFrequency: "daily" }).find((s) => s.dimension === "process")!;
    expect(process.score).toBe(100);
    expect(process.limited).toBe(true);
  });
});