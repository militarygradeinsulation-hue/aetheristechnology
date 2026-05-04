// Single source of truth for rep commission tables.
// Prices in cents to avoid float math.
//
// TIERED COMMISSION MODEL (replaces the old flat 70/15/15 split).
// Tier 1 — Entry ($29–$59):   Company 50% · Rep 30% · Partner 20%
// Tier 2 — Mid   ($79–$349):  Company 60% · Rep 25% · Partner 15%
// Tier 3 — High  ($599+):     Company 70% · Rep 20% · Partner 10%

export type CommissionTier = 1 | 2 | 3;

export interface TierRates {
  company: number;
  rep: number;
  partner: number;
}

export const TIER_RATES: Record<CommissionTier, TierRates> = {
  1: { company: 0.50, rep: 0.30, partner: 0.20 },
  2: { company: 0.60, rep: 0.25, partner: 0.15 },
  3: { company: 0.70, rep: 0.20, partner: 0.10 },
};

export const TIER_LABEL: Record<CommissionTier, string> = {
  1: 'Tier 1 · Entry',
  2: 'Tier 2 · Mid',
  3: 'Tier 3 · High-Ticket',
};

export interface RepProduct {
  name: string;
  priceCents: number;
  tier: CommissionTier;
  recurring?: boolean;
  highlight?: boolean;
}

export const REP_PRODUCTS: RepProduct[] = [
  // Tier 1 — Entry ($29–$59)
  { name: 'Playbook Unlock', priceCents: 2900, tier: 1 },
  { name: 'Social Content Pack', priceCents: 3900, tier: 1 },
  { name: 'Content Calendar', priceCents: 3900, tier: 1 },
  { name: 'Sales Script Pack', priceCents: 5900, tier: 1 },
  { name: 'Follow-Up Plan', priceCents: 5900, tier: 1 },
  { name: 'Full Website Report', priceCents: 5900, tier: 1 },
  // Tier 2 — Mid ($79–$349)
  { name: 'Friction Vocabulary Audit', priceCents: 7900, tier: 2 },
  { name: 'Strategic Question Engine', priceCents: 9900, tier: 2 },
  { name: 'Brand Contradiction Finder', priceCents: 11900, tier: 2 },
  { name: 'Digital Snapshot', priceCents: 14900, tier: 2 },
  { name: 'Strategy Blueprint', priceCents: 34900, tier: 2 },
  // Tier 3 — High-Ticket ($599+)
  { name: 'Website Evaluation', priceCents: 59900, tier: 3 },
  { name: 'Strategic Discovery Audit', priceCents: 59900, tier: 3 },
  { name: '14-Day Forensic Diagnostic', priceCents: 290000, tier: 3, highlight: true },
  { name: 'Fractional CTO/CMO', priceCents: 590000, tier: 3, recurring: true, highlight: true },
];

// Resolve tier from raw price (used by webhook where we may only have a price in cents).
export const tierForPriceCents = (priceCents: number): CommissionTier => {
  if (priceCents <= 5900) return 1;
  if (priceCents <= 34900) return 2;
  return 3;
};

// Back-compat default rates (kept for any legacy importers). Prefer TIER_RATES.
export const REP_RATE = TIER_RATES[2].rep;
export const PARTNER_RATE = TIER_RATES[2].partner;
export const COMPANY_RATE = TIER_RATES[2].company;

export const fmtUsd = (cents: number) =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: cents % 100 === 0 ? 0 : 2,
  }).format(cents / 100);

export const repRateForTier = (tier: CommissionTier) => TIER_RATES[tier].rep;
export const partnerRateForTier = (tier: CommissionTier) => TIER_RATES[tier].partner;
export const companyRateForTier = (tier: CommissionTier) => TIER_RATES[tier].company;

export const commissionCents = (priceCents: number, rate: number) =>
  Math.round(priceCents * rate);

export const repCentsForProduct = (p: RepProduct) =>
  Math.round(p.priceCents * TIER_RATES[p.tier].rep);

export const partnerCentsForProduct = (p: RepProduct) =>
  Math.round(p.priceCents * TIER_RATES[p.tier].partner);

export const companyCentsForProduct = (p: RepProduct) =>
  p.priceCents - repCentsForProduct(p) - partnerCentsForProduct(p);

// Legacy fixed-rate helpers (still imported by some panels). Now they just
// return the math against whatever rate is passed in.
export const partnerCents = (priceCents: number) =>
  Math.round(priceCents * PARTNER_RATE);

export const companyCents = (priceCents: number, repRate: number) =>
  priceCents - commissionCents(priceCents, repRate) - partnerCents(priceCents);
