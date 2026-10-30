import type { Answers } from "./types";
import { parseNumber } from "./parse";

/**
 * Every number the engine uses that did NOT come from the customer lives here.
 * All are editable in the report UI and exported in the JSON.
 * Defaults are deliberately conservative.
 */
export interface Assumptions {
  /** Fully loaded labour cost per hour (wages + on-costs). Used when the customer is not sure. */
  hourlyCost: number;
  /** Working weeks per year. */
  weeksPerYear: number;
  /** Paid hours per person per week, used only for the overlap cap. */
  hoursPerPersonWeek: number;

  /** Share (%) of reported friction time that could realistically be recovered. */
  recoveryLow: number;
  recoveryBase: number;
  recoveryHigh: number;

  /** Staff minutes spent chasing / context-switching per approval item, by typical wait. */
  approvalMinSameDay: number;
  approvalMin1to2Days: number;
  approvalMin3to5Days: number;
  approvalMinOverWeek: number;

  /** Minutes per person per week lost to chasing handoffs, by reported chasing level (1 = never … 5 = constantly). */
  handoffMin1: number;
  handoffMin2: number;
  handoffMin3: number;
  handoffMin4: number;
  handoffMin5: number;

  /** Multiplier on handoff minutes by number of handoffs per job. */
  handoffFactor0to1: number;
  handoffFactor2to3: number;
  handoffFactor4to6: number;
  handoffFactor7plus: number;

  /** Extra enquiries (%) that might convert with faster follow-up, at the slowest reported speed. */
  leadUpliftLow: number;
  leadUpliftBase: number;
  leadUpliftHigh: number;

  /** Share of the slowest-speed uplift applied for each follow-up speed (0–1). */
  followFactorUnder1h: number;
  followFactorSameDay: number;
  followFactor1to3Days: number;
  followFactorLonger: number;

  /** Gross margin (%) applied to lead value so revenue is not presented as profit. */
  grossMarginPct: number;

  /** Max share (%) of total team hours that may be counted as recoverable friction (overlap guard). */
  capacityCapPct: number;
}

export const DEFAULT_ASSUMPTIONS: Assumptions = {
  hourlyCost: 35,
  weeksPerYear: 46,
  hoursPerPersonWeek: 38,

  recoveryLow: 15,
  recoveryBase: 30,
  recoveryHigh: 45,

  approvalMinSameDay: 5,
  approvalMin1to2Days: 10,
  approvalMin3to5Days: 20,
  approvalMinOverWeek: 30,

  handoffMin1: 0,
  handoffMin2: 10,
  handoffMin3: 20,
  handoffMin4: 40,
  handoffMin5: 60,

  handoffFactor0to1: 0.5,
  handoffFactor2to3: 1,
  handoffFactor4to6: 1.25,
  handoffFactor7plus: 1.5,

  leadUpliftLow: 1,
  leadUpliftBase: 2,
  leadUpliftHigh: 3,

  followFactorUnder1h: 0,
  followFactorSameDay: 0.25,
  followFactor1to3Days: 0.5,
  followFactorLonger: 1,

  grossMarginPct: 40,
  capacityCapPct: 20,
};

export type AssumptionKey = keyof Assumptions;

export interface AssumptionMeta {
  key: AssumptionKey;
  label: string;
  unit: string;
  min: number;
  max: number;
  step: number;
  why: string;
}

export interface AssumptionGroup {
  title: string;
  items: AssumptionMeta[];
}

/** Human-readable documentation for every assumption. Drives the editor and the printed table. */
export const ASSUMPTION_GROUPS: AssumptionGroup[] = [
  {
    title: "Labour & time",
    items: [
      { key: "hourlyCost", label: "Loaded labour cost", unit: "$/hr", min: 0, max: 500, step: 1, why: "Wages plus on-costs. Uses your answer if you gave one." },
      { key: "weeksPerYear", label: "Working weeks per year", unit: "weeks", min: 1, max: 52, step: 1, why: "Excludes leave and public holidays." },
      { key: "hoursPerPersonWeek", label: "Paid hours per person", unit: "hrs/wk", min: 1, max: 80, step: 1, why: "Only used for the overlap cap." },
      { key: "capacityCapPct", label: "Overlap cap", unit: "% of team hours", min: 1, max: 100, step: 1, why: "Stops friction time from different questions adding up to an implausible share of the week." },
    ],
  },
  {
    title: "Recoverable share",
    items: [
      { key: "recoveryLow", label: "Recovery — low", unit: "%", min: 0, max: 100, step: 1, why: "Share of friction time realistically recoverable with process fixes." },
      { key: "recoveryBase", label: "Recovery — base", unit: "%", min: 0, max: 100, step: 1, why: "Middle case." },
      { key: "recoveryHigh", label: "Recovery — high", unit: "%", min: 0, max: 100, step: 1, why: "Optimistic but plausible case." },
    ],
  },
  {
    title: "Approval chasing",
    items: [
      { key: "approvalMinSameDay", label: "Same-day approvals", unit: "min/item", min: 0, max: 240, step: 1, why: "Staff time spent chasing or re-reading per item. Delay cost itself is not counted." },
      { key: "approvalMin1to2Days", label: "1–2 day wait", unit: "min/item", min: 0, max: 240, step: 1, why: "" },
      { key: "approvalMin3to5Days", label: "3–5 day wait", unit: "min/item", min: 0, max: 240, step: 1, why: "" },
      { key: "approvalMinOverWeek", label: "Over a week", unit: "min/item", min: 0, max: 240, step: 1, why: "" },
    ],
  },
  {
    title: "Handoff chasing",
    items: [
      { key: "handoffMin1", label: "Chasing: never", unit: "min/person/wk", min: 0, max: 600, step: 1, why: "" },
      { key: "handoffMin2", label: "Chasing: rarely", unit: "min/person/wk", min: 0, max: 600, step: 1, why: "" },
      { key: "handoffMin3", label: "Chasing: sometimes", unit: "min/person/wk", min: 0, max: 600, step: 1, why: "" },
      { key: "handoffMin4", label: "Chasing: often", unit: "min/person/wk", min: 0, max: 600, step: 1, why: "" },
      { key: "handoffMin5", label: "Chasing: constantly", unit: "min/person/wk", min: 0, max: 600, step: 1, why: "" },
      { key: "handoffFactor0to1", label: "0–1 handoffs per job", unit: "×", min: 0, max: 5, step: 0.05, why: "More handoffs = more places for work to stall." },
      { key: "handoffFactor2to3", label: "2–3 handoffs per job", unit: "×", min: 0, max: 5, step: 0.05, why: "" },
      { key: "handoffFactor4to6", label: "4–6 handoffs per job", unit: "×", min: 0, max: 5, step: 0.05, why: "" },
      { key: "handoffFactor7plus", label: "7+ handoffs per job", unit: "×", min: 0, max: 5, step: 0.05, why: "" },
    ],
  },
  {
    title: "Enquiry follow-up",
    items: [
      { key: "leadUpliftLow", label: "Extra conversions — low", unit: "% of enquiries", min: 0, max: 50, step: 0.1, why: "At the slowest follow-up speed. Scaled down for faster speeds." },
      { key: "leadUpliftBase", label: "Extra conversions — base", unit: "% of enquiries", min: 0, max: 50, step: 0.1, why: "" },
      { key: "leadUpliftHigh", label: "Extra conversions — high", unit: "% of enquiries", min: 0, max: 50, step: 0.1, why: "" },
      { key: "followFactorUnder1h", label: "Speed factor: within 1 hour", unit: "×", min: 0, max: 1, step: 0.05, why: "Already fast — no uplift assumed." },
      { key: "followFactorSameDay", label: "Speed factor: same day", unit: "×", min: 0, max: 1, step: 0.05, why: "" },
      { key: "followFactor1to3Days", label: "Speed factor: 1–3 days", unit: "×", min: 0, max: 1, step: 0.05, why: "" },
      { key: "followFactorLonger", label: "Speed factor: longer / inconsistent", unit: "×", min: 0, max: 1, step: 0.05, why: "" },
      { key: "grossMarginPct", label: "Gross margin", unit: "%", min: 0, max: 100, step: 1, why: "Converts sale value to gross profit so revenue is not shown as savings." },
    ],
  },
];

/** Start from defaults, using the customer's own labour cost when they gave one. */
export function initialAssumptions(answers: Answers): Assumptions {
  const cost = parseNumber(answers.hourlyCost);
  return { ...DEFAULT_ASSUMPTIONS, hourlyCost: cost !== null && cost > 0 ? cost : DEFAULT_ASSUMPTIONS.hourlyCost };
}

/** Clamp edited values into their documented bounds. Non-finite values fall back to defaults. */
export function sanitizeAssumptions(input: Partial<Assumptions>): Assumptions {
  const out = { ...DEFAULT_ASSUMPTIONS };
  for (const group of ASSUMPTION_GROUPS) {
    for (const meta of group.items) {
      const raw = input[meta.key];
      if (typeof raw === "number" && Number.isFinite(raw)) {
        out[meta.key] = Math.min(meta.max, Math.max(meta.min, raw));
      }
    }
  }
  // Keep recovery scenarios ordered so low ≤ base ≤ high.
  const rec = [out.recoveryLow, out.recoveryBase, out.recoveryHigh].sort((a, b) => a - b) as [number, number, number];
  [out.recoveryLow, out.recoveryBase, out.recoveryHigh] = rec;
  const up = [out.leadUpliftLow, out.leadUpliftBase, out.leadUpliftHigh].sort((a, b) => a - b) as [number, number, number];
  [out.leadUpliftLow, out.leadUpliftBase, out.leadUpliftHigh] = up;
  return out;
}