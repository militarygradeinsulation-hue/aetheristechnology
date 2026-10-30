import type { Dimension, EvidenceKind, Range, ScoreBand } from "./types";

/** Round estimates for display so they never look more precise than they are. */
export function roundEstimate(n: number): number {
  const abs = Math.abs(n);
  const step = abs < 1000 ? 50 : abs < 10000 ? 100 : 500;
  return Math.round(n / step) * step;
}

export function money(n: number): string {
  return `$${roundEstimate(n).toLocaleString("en-US")}`;
}

export function rangeText(r: Range): string {
  return `${money(r.low)} – ${money(r.high)}`;
}

export const DIMENSION_LABEL: Record<Dimension, string> = {
  people: "People",
  process: "Process",
  systems: "Systems",
};

export const BAND_LABEL: Record<ScoreBand, string> = {
  low: "Low friction",
  moderate: "Moderate friction",
  high: "High friction",
  insufficient: "Insufficient information",
};

export const EVIDENCE_LABEL: Record<EvidenceKind, string> = {
  SELF_REPORTED: "Self-reported",
  ESTIMATED: "Estimated",
  VERIFIED: "Verified",
};