/**
 * Core types for the Aetheris Business X-Ray.
 * Pure data — no React, no browser APIs. Safe to import anywhere (tests, SSR, future integrations).
 */

export type QuestionId =
  | "industry"
  | "teamSize"
  | "hourlyCost"
  | "primaryConcern"
  | "handoffsPerJob"
  | "handoffChasing"
  | "approvalsPerWeek"
  | "approvalWait"
  | "leadsPerMonth"
  | "followUpSpeed"
  | "leadTracking"
  | "avgDealValue"
  | "repetitiveHours"
  | "toolCount"
  | "toolsConnected"
  | "reworkFrequency"
  | "reworkHours"
  | "dataConfidence";

/** All answers are stored as strings (choice values or raw number text). "unknown" = user chose "not sure". */
export type Answers = Partial<Record<QuestionId, string>>;

export const UNKNOWN = "unknown";

/**
 * Evidence classification used everywhere in the report.
 * - SELF_REPORTED: what the customer told us.
 * - ESTIMATED: derived by the engine from self-reported inputs + explicit assumptions.
 * - VERIFIED: confirmed against records by a person. The free X-Ray never produces VERIFIED evidence.
 */
export type EvidenceKind = "SELF_REPORTED" | "ESTIMATED" | "VERIFIED";

export type Dimension = "people" | "process" | "systems";

export type StepNumber = 1 | 2 | 3;

export interface Range {
  low: number;
  base: number;
  high: number;
}

export interface EvidenceItem {
  kind: EvidenceKind;
  label: string;
  value: string;
  questionId?: QuestionId;
}

export type ComponentId = "approvals" | "handoffs" | "repetitive" | "rework" | "leads";

export type ComponentStatus = "estimated" | "not_applicable" | "insufficient";

export interface OpportunityComponent {
  id: ComponentId;
  label: string;
  dimension: Dimension;
  status: ComponentStatus;
  /** Annual friction hours counted (after overlap cap). Null for non-labour components. */
  hoursPerYear: number | null;
  /** Possible annual opportunity in currency units. Null unless status === "estimated". */
  range: Range | null;
  formula: string;
  inputs: EvidenceItem[];
  note: string;
}

export type ScoreBand = "low" | "moderate" | "high" | "insufficient";

export interface ScoreSignal {
  label: string;
  answer: string;
  score: number;
  questionId: QuestionId;
}

export interface DimensionScore {
  dimension: Dimension;
  /** 0–100 friction score (higher = more friction). Null when no usable signals. */
  score: number | null;
  band: ScoreBand;
  signals: ScoreSignal[];
  /** True when the score rests on fewer than two signals. */
  limited: boolean;
}

export type FindingEstimateStatus = "estimated" | "insufficient" | "not_estimated";

export interface Finding {
  id: string;
  rank: number;
  title: string;
  dimension: Dimension;
  summary: string;
  severity: number;
  evidence: EvidenceItem[];
  estimate: Range | null;
  estimateStatus: FindingEstimateStatus;
  estimateNote: string;
  verifyData: string[];
  firstAction: string;
}

export interface PlanWeek {
  week: 1 | 2 | 3 | 4;
  title: string;
  tasks: string[];
}

export type TotalStatus = "estimated" | "none_reported" | "insufficient";

export type Confidence = "low" | "moderate" | "insufficient";

export interface Assessment {
  engineVersion: string;
  answers: Answers;
  assumptions: import("./assumptions").Assumptions;
  hourlyCostSource: EvidenceKind;
  components: OpportunityComponent[];
  totals: {
    status: TotalStatus;
    range: Range | null;
    laborHoursPerYear: number;
    capApplied: boolean;
    capHoursPerYear: number | null;
  };
  scores: DimensionScore[];
  findings: Finding[];
  plan: PlanWeek[];
  confidence: Confidence;
  /** Always 0 in the free X-Ray. Present so the report can state it explicitly. */
  verifiedCount: 0;
  dataGaps: string[];
  notes: string[];
}