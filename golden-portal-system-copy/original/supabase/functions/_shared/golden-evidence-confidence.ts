// Shared Evidence Confidence formatter.
//
// ONE implementation of the client-facing Evidence Confidence wording and
// metrics. The website report view, the portal history view and the PDF export
// all read this file, so the copy and the numbers cannot drift apart.
//
// Nothing here recalculates anything: every value is READ off the saved report.

export type EvidenceConfidenceMetric = {
  key: "claims" | "findings" | "priced" | "contradictions";
  value: number;
  label: string;
};

export type MethodologyRow = { label: string; value: number };

export type EvidenceConfidence = {
  title: string;
  lead: string;
  metrics: EvidenceConfidenceMetric[];
  explanation: string;
  methodologyNote: string;
  methodologyRows: MethodologyRow[];
};

export const EVIDENCE_CONFIDENCE_TITLE = "Evidence Confidence";

export const EVIDENCE_CONFIDENCE_EXPLANATION =
  "Findings combine directly observed evidence with evidence-supported patterns. Connecting CRM, sales, pipeline, and operational data can validate the findings further and sharpen the financial ranges.";

export const CLAIMS_VS_FINDINGS_NOTE =
  "Claims and findings are counted separately. A claim is a single evidence-backed statement drawn from the scan. A finding is a diagnosed issue, and one finding can be supported by more than one claim, so the claim count is normally higher than the finding count.";

export const METHODOLOGY_LABELS = {
  verified: "Directly observed",
  inferred: "Evidence-supported pattern",
  unverified: "Requires internal validation",
  contradicted: "Contradiction found",
} as const;

type ConsistencyShape = {
  detected_findings?: unknown;
  unique_root_causes?: unknown;
  uniquely_priced_leaks?: unknown;
  evidence_quality?: Record<string, unknown>;
};

function num(v: unknown): number | null {
  return typeof v === "number" && Number.isFinite(v) ? v : null;
}

/** Joins clause fragments into readable prose without using dashes. */
function joinList(parts: string[]): string {
  if (parts.length === 0) return "";
  if (parts.length === 1) return parts[0];
  if (parts.length === 2) return `${parts[0]} and ${parts[1]}`;
  return `${parts.slice(0, -1).join(", ")}, and ${parts[parts.length - 1]}`;
}

const plural = (n: number, one: string, many: string) => (n === 1 ? one : many);

/**
 * Builds the client-facing Evidence Confidence block for a saved report.
 * Returns null when the report carries no consistency data at all.
 * Any individual count that is missing is omitted rather than invented.
 */
export function buildEvidenceConfidence(report: unknown): EvidenceConfidence | null {
  const c = (report as { report_consistency?: ConsistencyShape } | null)?.report_consistency;
  if (!c || typeof c !== "object") return null;

  const q = (c.evidence_quality || {}) as Record<string, unknown>;
  const claims = num(q.total);
  const findings = num(c.detected_findings);
  const rootCauses = num(c.unique_root_causes);
  const priced = num(c.uniquely_priced_leaks);
  const contradicted = num(q.contradicted);

  // Lead sentence, assembled only from counts that actually exist.
  const scopeParts: string[] = [];
  if (findings != null) scopeParts.push(`${findings} ${plural(findings, "finding", "findings")}`);
  if (rootCauses != null) scopeParts.push(`${rootCauses} root ${plural(rootCauses, "cause", "causes")}`);

  const sentences: string[] = [];
  if (claims != null) {
    const base = `This report evaluated ${claims} evidence-based ${plural(claims, "claim", "claims")}`;
    sentences.push(scopeParts.length ? `${base} across ${joinList(scopeParts)}.` : `${base}.`);
  } else if (scopeParts.length) {
    sentences.push(`This report documents ${joinList(scopeParts)}.`);
  }

  if (contradicted != null) {
    sentences.push(
      contradicted === 0
        ? "No contradictions were detected."
        : `${contradicted} ${plural(contradicted, "contradiction was", "contradictions were")} detected and flagged.`,
    );
  }

  if (priced != null) {
    sentences.push(
      `${priced} revenue ${plural(priced, "leak", "leaks")} had sufficient evidence to receive financial ${plural(priced, "estimate", "estimates")}.`,
    );
  }

  const metrics: EvidenceConfidenceMetric[] = [];
  if (claims != null) metrics.push({ key: "claims", value: claims, label: "Claims Evaluated" });
  if (findings != null) metrics.push({ key: "findings", value: findings, label: "Findings Detected" });
  if (priced != null) metrics.push({ key: "priced", value: priced, label: "Financially Modeled Leaks" });
  if (contradicted != null) metrics.push({ key: "contradictions", value: contradicted, label: "Contradictions Found" });

  const methodologyRows: MethodologyRow[] = [];
  for (const key of ["verified", "inferred", "unverified", "contradicted"] as const) {
    const v = num(q[key]);
    if (v != null) methodologyRows.push({ label: METHODOLOGY_LABELS[key], value: v });
  }

  return {
    title: EVIDENCE_CONFIDENCE_TITLE,
    lead: sentences.join(" "),
    metrics,
    explanation: EVIDENCE_CONFIDENCE_EXPLANATION,
    methodologyNote: CLAIMS_VS_FINDINGS_NOTE,
    methodologyRows,
  };
}
