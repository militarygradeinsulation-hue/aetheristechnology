// Reps/accounts that are never rate-limited or quota-capped anywhere in the
// Aetheris stack (Nexus chat, sandbox tools, studios).
// Dean Young (482917) has unlimited access by agreement.
export const UNLIMITED_REP_CODES = new Set(["ADMIN", "STAFF", "482917"]);

export function isUnlimitedRep(code: unknown): boolean {
  if (typeof code !== "string") return false;
  return UNLIMITED_REP_CODES.has(code.trim().toUpperCase());
}
