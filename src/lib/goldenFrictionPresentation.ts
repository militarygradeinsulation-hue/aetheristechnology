import type { FrictionLensId, FrictionOpportunity } from "../../supabase/functions/_shared/golden-friction-intelligence";

export type EvidenceStrength = "observed" | "linked" | "review";
export type InvestigationGroup = {
  id: string;
  primary: FrictionOpportunity;
  related: FrictionOpportunity[];
  lensIds: FrictionLensId[];
  strength: EvidenceStrength;
};

const verified = (status: string) =>
  ["verified", "source_verified", "observed_public_copy"].includes(status.toLowerCase());

export function evidenceStrength(item: FrictionOpportunity): EvidenceStrength {
  if (item.evidence.some(e => verified(e.status) && Boolean(e.sourceUrl || e.sourceLocator))) return "observed";
  if (item.evidence.some(e => e.status !== "audit_suggestion_not_verified" && Boolean(e.sourceUrl || e.sourceLocator))) return "linked";
  return "review";
}

function strengthRank(strength: EvidenceStrength): number {
  return strength === "observed" ? 3 : strength === "linked" ? 2 : 1;
}

export function observationHeadline(observation: string): string {
  // Ground the title in the report statement, not a generic repeated model label.
  // The full evidence remains visible inside the investigation.
  const normalized = observation.replace(/\s+/g, " ").trim();
  if (normalized.length <= 106) return normalized;
  const firstSentence = normalized.match(/^.{18,106}?[.!?](?=\s|$)/)?.[0];
  if (firstSentence) return firstSentence;
  const before = normalized.slice(0, 103);
  const boundary = before.lastIndexOf(" ");
  return before.slice(0, boundary > 55 ? boundary : 103).trimEnd() + "…";
}

const normalizedCause = (text: string) => text.toLowerCase()
  .replace(/\s+/g, " ").replace(/[^a-z0-9 ]/g, "").trim();

export function groupInvestigations(opportunities: FrictionOpportunity[]): InvestigationGroup[] {
  const grouped = new Map<string, InvestigationGroup>();
  for (const opportunity of opportunities) {
    const rootCause = opportunity.rootCauseId?.trim();
    const key = rootCause
      ? "cause:" + rootCause
      : "text:" + normalizedCause(opportunity.observation);
    const existing = grouped.get(key);
    if (!existing) {
      grouped.set(key, {
        id: key,
        primary: opportunity,
        related: [opportunity],
        lensIds: [opportunity.lens],
        strength: evidenceStrength(opportunity),
      });
      continue;
    }
    existing.related.push(opportunity);
    if (!existing.lensIds.includes(opportunity.lens)) existing.lensIds.push(opportunity.lens);
    if (strengthRank(evidenceStrength(opportunity)) > strengthRank(existing.strength)) {
      existing.primary = opportunity;
      existing.strength = evidenceStrength(opportunity);
    }
  }

  const groups = [...grouped.values()].sort((a, b) =>
    strengthRank(b.strength) - strengthRank(a.strength));
  // Start with different evidence-backed causes where possible so the first
  // screen never repeats several lead-capture cards before other disciplines.
  const diverse: InvestigationGroup[] = [];
  const used = new Set<InvestigationGroup>();
  const seenLenses = new Set<FrictionLensId>();
  for (const group of groups) {
    const uncovered = group.lensIds.some(lens => !seenLenses.has(lens));
    if (!uncovered) continue;
    diverse.push(group);
    used.add(group);
    for (const lens of group.lensIds) seenLenses.add(lens);
  }
  return [...diverse, ...groups.filter(g => !used.has(g))];
}

export const EVIDENCE_LABEL: Record<EvidenceStrength, string> = {
  observed: "Observed evidence",
  linked: "Source attached",
  review: "Needs validation",
};
