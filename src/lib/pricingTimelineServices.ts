import { AETHERIS_TIERS, TIER_ORDER, type TierId } from "./aetherisTiers";
import {
  AUDIT_OPTIONS, quoteAuditSelection, type AuditOption,
} from "../../supabase/functions/_shared/company-audit-offers";

/**
 * Associate individual services with the tier where their subject matter
 * first becomes relevant. They are examples for a separate custom scope,
 * NOT promises that the individual SKU is included in a package fee.
 * Prices remain those of the commissions-backed AUDIT_OPTIONS catalog.
 *
 * The mapping is additive for visibility, not for billing the seven tiers:
 * tiers have independent prices and may switch between monthly/one-time.
 */
export const TIMELINE_SERVICE_STEPS: Record<TierId, readonly string[]> = {
  free: [],
  intelligence: ["digital-snapshot"],
  signal: ["friction", "brand", "landing"],
  revenue: ["follow-up", "sales-script"],
  suite: ["lead-nurture", "strategy-blueprint"],
  diagnostic: ["lead-flow", "crm-health", "crm-setup"],
  active: ["onboarding"],
};

export function individualServiceIdsAtTier(tierId: TierId): string[] {
  const last = TIER_ORDER.indexOf(tierId);
  if (last < 0) return [];
  return TIER_ORDER.slice(0, last + 1).flatMap(id => [...TIMELINE_SERVICE_STEPS[id]]);
}

export function individualServicesAtTier(tierId: TierId): AuditOption[] {
  const visible = new Set(individualServiceIdsAtTier(tierId));
  return AUDIT_OPTIONS.filter(option => visible.has(option.id));
}

/** Cents-only arithmetic; never add recurring and one-time invoices together. */
export function tierIndividualQuote(tierId: TierId) {
  return quoteAuditSelection(individualServiceIdsAtTier(tierId));
}

export function compareTierPrices(fromId: TierId, toId: TierId):
  | { comparable: true; differenceCents: number; cadence: "monthly" | "one-time" | "free" }
  | { comparable: false } {
  const from = AETHERIS_TIERS.find(tier => tier.id === fromId);
  const to = AETHERIS_TIERS.find(tier => tier.id === toId);
  if (!from || !to || from.cadence !== to.cadence) return { comparable: false };
  return { comparable: true, differenceCents: to.amountCents - from.amountCents, cadence: to.cadence };
}
