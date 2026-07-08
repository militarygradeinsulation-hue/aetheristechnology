// Single source of truth for rep commission tables.
// Prices in cents to avoid float math.
//
// TWO MODELS LIVE HERE — read this before touching anything:
//
// 1) TIERED COMMISSION (catalog tools + the 3 public bundles)
//    Tier 1, Entry ($29-$59):   Company 50% · Rep 30% · Partner 20%
//    Tier 2, Mid   ($79-$349):  Company 60% · Rep 25% · Partner 15%
//    Tier 3, High  ($599+):     Company 70% · Rep 20% · Partner 10%
//    The 3 bundles ($2,500 / $5,000 / $10,000) all land in Tier 3.
//
// 2) FLAGSHIP FIXED-DOLLAR (Diagnostic + Active Case ONLY)
//    21-Day Revenue Diagnostic ($18,500 one-time)
//      → Company $10,500 · Rep $5,000 · Partner $3,000
//    Active Case ($15,000/mo, paid every month client stays)
//      → Company $8,000  · Rep $4,000 · Partner $3,000
//    Enforced server-side in payments-webhook flagshipFixedSplit().
//
// Anything NOT on the public site (legacy à la carte tools) is kept here for
// rep-portal internal sales and back-compat only — marked `legacy: true`.

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
  /** True for products NOT on the public site (internal/rep-only sales). */
  legacy?: boolean;
  /** Marks one of the three sealed operator-led bundles. */
  bundle?: boolean;
  /** Marks a flagship offer with FIXED-DOLLAR commission split. */
  flagship?: 'diagnostic' | 'activeCase';
  /** What this product actually does. One sentence the rep can read aloud. */
  description?: string;
  /** Who the product is for / ICP language for the rep. */
  forWho?: string;
}

// Fixed-dollar splits for the two flagships. Source of truth for the UI; the
// webhook enforces the same numbers in flagshipFixedSplit().
export interface FixedSplitCents { company: number; rep: number; partner: number; }

export const FLAGSHIP_SPLITS: Record<'diagnostic' | 'activeCase', FixedSplitCents> = {
  // 21-Day Revenue Diagnostic — $18,500 one-time
  diagnostic: { company: 1_050_000, rep: 500_000, partner: 300_000 },
  // Active Case — $15,000/mo, paid every month client stays
  activeCase:   { company:   800_000, rep: 400_000, partner: 300_000 },
};

/** Returns the rep cut for a product — fixed-dollar for flagships, % for tiered. */
export const repCentsForProduct = (p: RepProduct) =>
  p.flagship ? FLAGSHIP_SPLITS[p.flagship].rep : Math.round(p.priceCents * TIER_RATES[p.tier].rep);

/** Returns the partner cut for a product — fixed-dollar for flagships, % for tiered. */
export const partnerCentsForProduct = (p: RepProduct) =>
  p.flagship ? FLAGSHIP_SPLITS[p.flagship].partner : Math.round(p.priceCents * TIER_RATES[p.tier].partner);

/** Company cut = price minus rep + partner. */
export const companyCentsForProduct = (p: RepProduct) =>
  p.priceCents - repCentsForProduct(p) - partnerCentsForProduct(p);

export const REP_PRODUCTS: RepProduct[] = [
  // ── FLAGSHIPS — FIXED-DOLLAR SPLIT (not tiered) ──
  {
    name: '21-Day Revenue Diagnostic',
    priceCents: 1_850_000,
    tier: 3,
    flagship: 'diagnostic',
    highlight: true,
    description: 'Operator-led 3-week forensic teardown of the client\'s revenue system. Ends with a written leak report, a 90-day remediation plan, and a redesigned funnel.',
    forWho: 'Owners doing $1M-$25M who know money is leaking but cannot pinpoint where. Pre-requisite to the Active Case.',
  },
  {
    name: 'Active Case',
    priceCents: 1_500_000,
    tier: 3,
    recurring: true,
    flagship: 'activeCase',
    highlight: true,
    description: 'Monthly embedded operator. We rebuild and run the systems the Diagnostic exposed — sales follow-up, CRM hygiene, content engine, dashboards.',
    forWho: 'Diagnostic graduates who want the operator to ship the fixes, not hand them a PDF.',
  },

  // ── PUBLIC OPERATOR-LED BUNDLES (the only things publicly for sale) ──
  {
    name: 'Signal Pack',
    priceCents: 250_000,
    tier: 3,
    bundle: true,
    highlight: true,
    description: 'One-day forensic snapshot: website scan, CRM data audit, top-of-funnel leak map. Operator walks the report with you.',
    forWho: 'Owners $500k-$3M who need a directional read before committing to a full Diagnostic.',
  },
  {
    name: 'Revenue Pack',
    priceCents: 500_000,
    tier: 3,
    bundle: true,
    highlight: true,
    description: 'Signal Pack + 2-week sales-cycle teardown. Includes call-recording review, deal-stage forensics, and 3 hands-on rebuilds.',
    forWho: 'Teams $1M-$10M with a sales motion that worked once and stopped scaling.',
  },
  {
    name: 'Operator Suite',
    priceCents: 1_000_000,
    tier: 3,
    bundle: true,
    highlight: true,
    description: 'Operator embeds for 3 weeks. Runs every tool against your live business, ships fixes, hands you a working revenue system.',
    forWho: 'Owners ready to install — not study — the full Aetheris operating system in their company.',
  },

  // ── LEAK ECOSYSTEM TOOL SHOP (public /tools-shop — lifetime tool unlocks) ──
  // Tiered commission applies (T1 / T2 / T3 by price band).
  { name: 'Tool Shop · Single Tool ($40 lifetime)', priceCents: 4000, tier: 1,
    description: 'Lifetime unlock for one Leak Ecosystem tool — unlimited runs + persistent memory attached to the buyer\'s code.',
    forWho: 'Curious operators who tried the 3 free runs and want one tool for life.' },
  { name: 'Tool Shop · 3-Tool Bundle ($100 lifetime)', priceCents: 10000, tier: 2,
    description: 'Mix-and-match any 3 Leak Ecosystem tools, lifetime access, memory attached. Best per-tool price short of All Access.',
    forWho: 'Owners who already know the 2-3 tools they will actually use every week.' },
  { name: 'Tool Shop · All Access ($1,000 lifetime)', priceCents: 100000, tier: 3,
    description: 'Every current + future Leak Ecosystem tool, unlimited runs, memory on all of them, one code for life.',
    forWho: 'Power users, agencies, and reps who want the full toolbox with zero per-tool math.' },




  // ── LEGACY À LA CARTE (rep-portal internal only — NOT on public site) ──
  // Kept for back-compat with existing Stripe products + rep-led direct sales.
  // Tier 1, Entry ($29-$59)
  { name: 'Playbook Unlock', priceCents: 2900, tier: 1, legacy: true,
    description: 'Unlocks the full playbook PDF library — 30+ tactical guides on sales, CRM, content, and ops.',
    forWho: 'Owners DIY-ing their growth who want operator-grade SOPs, not Medium articles.' },
  { name: 'Social Content Pack', priceCents: 3900, tier: 1, legacy: true,
    description: '30 days of LinkedIn + Instagram posts written in their voice with hooks, captions, and visuals.',
    forWho: 'Founders/owners who know they should post but never do.' },
  { name: 'Content Calendar', priceCents: 3900, tier: 1, legacy: true,
    description: '90-day content calendar mapped to their offer, audience, and sales cycle. Topics, formats, CTAs.',
    forWho: 'Solo marketers + small teams that need a publishing rhythm, not random posts.' },
  { name: 'Sales Script Pack', priceCents: 5900, tier: 1, legacy: true,
    description: 'Cold call, voicemail, discovery, and objection scripts customized to their offer.',
    forWho: 'Reps and SDRs who hate selling because they have nothing to read off.' },
  { name: 'Follow-Up Plan', priceCents: 5900, tier: 1, legacy: true,
    description: 'Multi-touch follow-up sequence — email + SMS + LinkedIn — for the 80% of leads that never close on first contact.',
    forWho: 'Anyone whose CRM is full of "ghosted" leads from 30+ days ago.' },
  { name: 'Full Website Report', priceCents: 5900, tier: 1, legacy: true,
    description: 'Deep website forensic report — SEO, conversion, speed, friction, missed CTAs. Includes prioritized fix list.',
    forWho: 'Owners whose site looks "fine" but does not convert.' },
  { name: 'CRM Health Check', priceCents: 7900, tier: 1, legacy: true,
    description: '90-min CRM audit — pipeline hygiene, automation gaps, reporting holes, dirty data — with a fix list.',
    forWho: 'HubSpot/Salesforce/Pipedrive owners who suspect their data is lying to them.' },
  // Tier 2, Mid ($79-$349)
  { name: 'Friction Vocabulary Audit', priceCents: 7900, tier: 2, legacy: true,
    description: 'Forensic copy audit that flags every fluff word, jargon term, and unclear phrase costing them conversions.',
    forWho: 'Brands whose copy "sounds professional" but does not sell.' },
  { name: 'Lead Flow Mapper', priceCents: 9900, tier: 2, legacy: true,
    description: 'End-to-end map of how leads enter, get qualified, get followed up, and convert (or die).',
    forWho: 'Owners who cannot draw their own funnel on a napkin.' },
  { name: 'Strategic Question Engine', priceCents: 9900, tier: 2, legacy: true,
    description: '25 sales-discovery questions custom-built to expose budget, authority, urgency, and the real pain.',
    forWho: 'Reps stuck with "tell me about your business" energy.' },
  { name: 'Brand Contradiction Finder', priceCents: 11900, tier: 2, legacy: true,
    description: 'Scans website + LinkedIn + sales decks for messaging contradictions that confuse buyers.',
    forWho: 'Companies whose pitch changes depending on which page or person you ask.' },
  { name: 'Digital Snapshot', priceCents: 14900, tier: 2, legacy: true,
    description: 'One-day digital presence audit — site, SEO, social, reviews, ads — with leak scoring.',
    forWho: 'Operators who want a baseline number before they spend on growth.' },
  { name: 'Competitor Landing Page Analysis', priceCents: 14900, tier: 2, legacy: true,
    description: 'Reverse-engineers 3 top competitors\' landing pages — copy, structure, offer, CTAs — vs theirs.',
    forWho: 'Anyone losing deals to a competitor whose product is identical.' },
  { name: 'Email Series Bundle', priceCents: 14900, tier: 2, legacy: true,
    description: '5-email welcome + 7-email nurture + 5-email reactivation sequence, ready to load.',
    forWho: 'Lists with 500+ subscribers being totally ignored.' },
  { name: 'Sales Team Onboarding', priceCents: 29900, tier: 2, legacy: true,
    description: 'New-rep ramp kit — playbook, scripts, objection handling, week-by-week plan to first close.',
    forWho: 'Founders hiring their first 1-3 sales reps.' },
  { name: 'Prospecting List Builder', priceCents: 29900, tier: 2, legacy: true,
    description: 'Custom ICP list (250-1,000 verified contacts) scraped + enriched, ready for outreach.',
    forWho: 'Outbound teams burning hours on LinkedIn instead of selling.' },
  { name: 'Lead Nurture Automation', priceCents: 29900, tier: 2, recurring: true, legacy: true,
    description: 'Fully built + managed lead-nurture sequences across email/SMS, optimized monthly.',
    forWho: 'Operators who want done-for-you nurture, not "another tool to learn".' },
  { name: 'Landing Page Blueprint', priceCents: 34900, tier: 2, legacy: true,
    description: 'Conversion-engineered landing page wireframe + copy + CTA strategy, ready for dev or no-code.',
    forWho: 'Anyone running ads to a homepage and wondering why CPL is brutal.' },
  { name: 'Strategy Blueprint', priceCents: 34900, tier: 2, legacy: true,
    description: '90-day growth blueprint — channels, offers, KPIs, weekly cadence — built around their actual constraints.',
    forWho: 'Owners stuck "doing everything" without a written plan.' },
  { name: 'CRM Setup & Optimization', priceCents: 39900, tier: 2, legacy: true,
    description: 'Full CRM setup or rebuild — pipelines, automations, dashboards, integrations — in HubSpot or Pipedrive.',
    forWho: 'Teams who bought a CRM and never actually used it.' },
  { name: 'Sales Coaching Active Case', priceCents: 49900, tier: 2, recurring: true, legacy: true,
    description: 'Weekly 1:1 coaching for the rep or sales leader — calls, deals, pipeline, deal review.',
    forWho: 'Founders selling solo or first-time sales managers.' },
  // Tier 3, High-Ticket ($599+) — pre-bundle catalog
  { name: 'Website Evaluation', priceCents: 59900, tier: 3, legacy: true,
    description: 'Full operator-led website teardown with screen-share session and prioritized 60-day fix roadmap.',
    forWho: 'Companies whose site is the #1 lead source AND the #1 leak.' },
  { name: 'Strategic Discovery Audit', priceCents: 59900, tier: 3, legacy: true,
    description: 'Half-day deep-dive into business model, offer, ICP, and growth motion. Walks away with a directional decision.',
    forWho: 'Owners considering a pivot, a new market, or a major hire.' },
  { name: '30-Day Lead Gen Sprint', priceCents: 99900, tier: 3, legacy: true,
    description: '30-day operator-led campaign — list, sequences, content, follow-up — to hit a measurable lead target.',
    forWho: 'Teams that need leads NOW, not a marketing plan.' },
  { name: 'Marketing-to-Sales Alignment', priceCents: 129900, tier: 3, legacy: true,
    description: 'Rebuilds the handoff between marketing and sales — SLA, lead scoring, routing, closed-loop reporting.',
    forWho: 'Companies where marketing and sales blame each other instead of closing deals.' },
  { name: 'Sales Process Redesign', priceCents: 149900, tier: 3, legacy: true,
    description: 'Tear-down and rebuild of the entire sales process — stages, exit criteria, automation, forecasting.',
    forWho: '5-25 person sales teams whose pipeline is a mystery to the CEO.' },
];

// Resolve tier from raw price (used by webhook where we may only have a price in cents).
export const tierForPriceCents = (priceCents: number): CommissionTier => {
  if (priceCents <= 5900) return 1;
  if (priceCents <= 34900) return 2;
  return 3;
};

// Convenience selectors for the new bundle-first UI.
export const PUBLIC_BUNDLES = REP_PRODUCTS.filter(p => p.bundle);
export const LEGACY_PRODUCTS = REP_PRODUCTS.filter(p => p.legacy);

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

// (repCentsForProduct, partnerCentsForProduct, companyCentsForProduct are
//  defined at the top of the file so they can apply flagship fixed-dollar splits.)

// Legacy fixed-rate helpers (still imported by some panels).
export const partnerCents = (priceCents: number) =>
  Math.round(priceCents * PARTNER_RATE);

export const companyCents = (priceCents: number, repRate: number) =>
  priceCents - commissionCents(priceCents, repRate) - partnerCents(priceCents);
