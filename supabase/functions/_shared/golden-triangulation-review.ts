/**
 * Private evidence review for Golden Report missing-information theories.
 * Recorded evidence is OPERATOR-REVIEWED, not independently proven.
 * Never modifies the original Golden Report, its financial ledger, or its PDF.
 */
export const REVIEW_HYPOTHESIS_IDS = [
  "lead-response","buyer-reassurance","choice-friction","internal-handoff",
  "mobile-conversion","channel-attribution","verified-financial-impact",
] as const;
export type ReviewHypothesisId = typeof REVIEW_HYPOTHESIS_IDS[number];
export type EvidenceDirection = "supports" | "challenges";
export type EvidenceKind = "crm" | "operations" | "analytics" | "calls" | "customer_feedback" | "other";
export type ReviewStatus = "unreviewed" | "needs_corroboration" | "provisionally_supported" | "challenged" | "mixed";
export interface ReviewEvidence {
  id: string;
  hypothesis_id: ReviewHypothesisId;
  direction: EvidenceDirection;
  evidence_kind: EvidenceKind;
  source_reference: string;
  observation: string;
  created_at: string;
  reviewed_by?: string;
}
export interface TheoryReview {
  status: ReviewStatus;
  supportingRecords: number;
  challengingRecords: number;
  supportingFamilies: number;
  challengingFamilies: number;
  reviewedRecords: number;
  explanation: string;
}
const kinds: EvidenceKind[] = ["crm","operations","analytics","calls","customer_feedback","other"];
export const VALID_EVIDENCE_KINDS = new Set<string>(kinds);
export const VALID_DIRECTIONS = new Set<string>(["supports","challenges"]);
export const VALID_HYPOTHESES = new Set<string>(REVIEW_HYPOTHESIS_IDS);
const clean = (s: unknown) => typeof s === "string" ? s.trim() : "";
export function sourceFamily(e: ReviewEvidence): string {
  // Many CRM rows, duplicate emails, or different URLs from a single app never
  // count as separate independently corroborating data systems.
  return kinds.includes(e.evidence_kind) ? e.evidence_kind : "other";
}
export function reviewTheoryEvidence(hypothesisId: string, records: ReviewEvidence[]): TheoryReview {
  const matching = records.filter(r =>
    r.hypothesis_id === hypothesisId &&
    VALID_HYPOTHESES.has(r.hypothesis_id) &&
    VALID_DIRECTIONS.has(r.direction) &&
    VALID_EVIDENCE_KINDS.has(r.evidence_kind) &&
    clean(r.observation).length >= 16 &&
    clean(r.source_reference).length >= 3
  );
  const unique = new Map<string, ReviewEvidence>();
  for (const row of matching) {
    const key = [
      row.direction, sourceFamily(row),
      clean(row.source_reference).toLowerCase().replace(/\s+/g," "),
    ].join("|");
    if (!unique.has(key)) unique.set(key, row);
  }
  const evidence = [...unique.values()];
  const supporting = evidence.filter(r => r.direction === "supports");
  const challenging = evidence.filter(r => r.direction === "challenges");
  const supportingFamilies = new Set(supporting.map(sourceFamily)).size;
  const challengingFamilies = new Set(challenging.map(sourceFamily)).size;
  let status: ReviewStatus = "unreviewed";
  if (supporting.length && challenging.length) status = "mixed";
  else if (challenging.length) status = "challenged";
  else if (supportingFamilies >= 2) status = "provisionally_supported";
  else if (supporting.length) status = "needs_corroboration";
  const explanations: Record<ReviewStatus,string> = {
    unreviewed: "No first-party source records have been reviewed for this theory.",
    needs_corroboration: "An operator has entered supporting evidence, but independent corroboration remains missing.",
    provisionally_supported: "Operator-reviewed records from at least two different data-system families support this theory. Validate the underlying records before treating this as a business finding.",
    challenged: "Operator-reviewed material challenges this theory. Investigate the alternative explanation before taking action.",
    mixed: "Reviewed evidence both supports and challenges the theory. Do not select only favorable clues.",
  };
  return {
    status, supportingRecords: supporting.length, challengingRecords: challenging.length,
    supportingFamilies, challengingFamilies, reviewedRecords: evidence.length,
    explanation: explanations[status],
  };
}
