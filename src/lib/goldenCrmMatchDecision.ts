/** UI guards for human verification of a CRM company/report association.
 * Server-side ownership and exact-domain checks remain authoritative.
 */
export type MatchAction = "verify" | "revoke" | "resolve_duplicates" | "unavailable";
export interface GoldenCrmCandidate {
  scan_id: string;
  company_id: string;
  domain: string;
  company_matches: number;
  verified: boolean;
  report_company_name?: string | null;
  crm_company_name?: string | null;
}
export function decideMatchAction(candidate: GoldenCrmCandidate): MatchAction {
  if (!candidate.scan_id || !candidate.company_id || !candidate.domain) return "unavailable";
  // An existing verified association must be revocable even if another CRM
  // company was subsequently added with the same domain.
  if (candidate.verified) return "revoke";
  if (!Number.isInteger(candidate.company_matches) || candidate.company_matches < 1) return "unavailable";
  if (candidate.company_matches > 1) return "resolve_duplicates";
  return "verify";
}
export function requiresHumanReview(candidate: GoldenCrmCandidate): boolean {
  return decideMatchAction(candidate) === "verify";
}
