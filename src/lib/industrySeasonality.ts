// Industry seasonality + revenue intelligence.
// Curated from publicly known Google Trends + industry research data.
// Used to surface "best industries to attack right now" in the lead pool and
// to enrich each scraped lead with a season + revenue context badge.
//
// Months are 1-12 (Jan=1). `peak` = highest spend / demand months. `slow` = the
// dip when owners are most open to investing in growth tools.

export type SeasonRating = 'peak' | 'ramp' | 'steady' | 'slow';

export interface IndustrySeasonality {
  /** Internal slug used for lookups. */
  slug: string;
  /** Display label. */
  label: string;
  /** Free-text aliases the AI/scraper may return that map back to this slug. */
  aliases: string[];
  /** Months 1-12 that drive the bulk of yearly revenue. */
  peakMonths: number[];
  /** Months when owners are bored, anxious, and most receptive to outreach. */
  slowMonths: number[];
  /** Plain-English average ticket / customer LTV band. */
  avgTicket: string;
  /** Approximate annual revenue band for a healthy single-location operator. */
  avgAnnualRevenue: string;
  /** One-sentence "why hit them now" pitch when they're in slow months. */
  slowPitch: string;
  /** One-sentence "why hit them now" pitch when they're in peak months. */
  peakPitch: string;
  /** Always-true pitch the rep can lean on regardless of season. */
  alwaysPitch: string;
  /** Tag used by the scraper prompt to bias the query. */
  scrapeQueryHint: string;
}

export const INDUSTRIES: IndustrySeasonality[] = [
  {
    slug: 'medspa',
    label: 'Medspas / Aesthetics',
    aliases: ['medspa', 'med spa', 'medical spa', 'aesthetics', 'botox', 'dermatology clinic', 'skin clinic'],
    peakMonths: [4, 5, 6, 10, 11],
    slowMonths: [1, 2, 7, 8],
    avgTicket: '$350-$1,200 per visit · $4k-$15k LTV',
    avgAnnualRevenue: '$600k-$2.4M per location',
    slowPitch: 'July/August dip and post-holiday January slump = perfect time to install a follow-up engine before spring rebookings.',
    peakPitch: 'They are slammed and leaking. No-shows, missed rebooks, and unreturned leads cost real money during peak demand.',
    alwaysPitch: 'Most medspas have zero lead-nurture. Every form-fill goes cold within 48 hrs.',
    scrapeQueryHint: 'medspa OR "med spa" OR "medical spa" OR aesthetics clinic OR botox OR injectables',
  },
  {
    slug: 'auto-mechanic',
    label: 'Auto Mechanics / Repair Shops',
    aliases: ['mechanic', 'auto repair', 'auto shop', 'car repair', 'transmission', 'collision', 'tire shop'],
    peakMonths: [3, 4, 5, 9, 10, 11],
    slowMonths: [1, 2, 7],
    avgTicket: '$420 average RO · $1,800 LTV',
    avgAnnualRevenue: '$650k-$1.8M per bay-count',
    slowPitch: 'Winter slow weeks = time to set up review automation and rebooking texts before spring tire season hits.',
    peakPitch: 'They cannot answer the phone. Missed calls = lost ROs. A simple AI receptionist pays for itself in a week.',
    alwaysPitch: 'Most shops never text customers back. The shop that does owns the zip code.',
    scrapeQueryHint: 'auto repair OR mechanic OR "tire shop" OR "transmission repair" OR "collision center"',
  },
  {
    slug: 'dental',
    label: 'Dental Practices',
    aliases: ['dental', 'dentist', 'orthodontist', 'oral surgery'],
    peakMonths: [1, 8, 9, 10, 11, 12],
    slowMonths: [6, 7],
    avgTicket: '$280 hygiene · $1,600 restorative · $7k+ LTV',
    avgAnnualRevenue: '$800k-$2.5M per dentist',
    slowPitch: 'Summer slowdown = perfect time to set up insurance-benefits-remaining outreach for the Q4 rush.',
    peakPitch: 'End-of-year benefits push is leaking. Most practices never text reminders to "use it or lose it" patients.',
    alwaysPitch: 'Recall systems are the #1 leak. 30% of patients fall off the recall list and never come back.',
    scrapeQueryHint: 'dental practice OR dentist OR orthodontist',
  },
  {
    slug: 'roofing',
    label: 'Roofing Contractors',
    aliases: ['roofing', 'roofer', 'roof repair', 'roof replacement'],
    peakMonths: [3, 4, 5, 6, 7, 8, 9, 10],
    slowMonths: [12, 1, 2],
    avgTicket: '$12k average job · $14k LTV',
    avgAnnualRevenue: '$1.5M-$6M',
    slowPitch: 'Winter is when smart roofers build pipeline for spring. Most are reactive and lose the head-start.',
    peakPitch: 'Storm-season demand outpaces their ability to follow up. Quotes sit unsent for days.',
    alwaysPitch: 'Quote-to-close lag is the killer. Industry average is 9 days. Operators win at 24 hours.',
    scrapeQueryHint: 'roofing contractor OR roofer OR roof replacement',
  },
  {
    slug: 'hvac',
    label: 'HVAC / Plumbing',
    aliases: ['hvac', 'heating', 'cooling', 'plumber', 'plumbing', 'air conditioning'],
    peakMonths: [6, 7, 8, 12, 1, 2],
    slowMonths: [3, 4, 9, 10],
    avgTicket: '$580 service · $9k install · $4k LTV',
    avgAnnualRevenue: '$1.2M-$8M',
    slowPitch: 'Shoulder months = perfect time to install maintenance-plan automation before the next extreme-weather wave.',
    peakPitch: 'They are turning away calls. After-hours leads die in voicemail. Capture them or competitors will.',
    alwaysPitch: 'Maintenance-plan upsell is the highest-ROI lever. Most shops never offer it at the bench.',
    scrapeQueryHint: 'HVAC OR plumbing OR "air conditioning" OR heating contractor',
  },
  {
    slug: 'law-firm',
    label: 'Law Firms (Small/Mid)',
    aliases: ['law firm', 'attorney', 'lawyer', 'legal'],
    peakMonths: [1, 2, 9, 10, 11],
    slowMonths: [6, 7, 8, 12],
    avgTicket: '$3.5k-$12k matter · $18k LTV',
    avgAnnualRevenue: '$900k-$5M per attorney',
    slowPitch: 'Summer/holiday slowdown = perfect timing for intake-system overhaul before the new-year filing surge.',
    peakPitch: 'Intake is leaking calls. 42% of legal calls go to voicemail and never get returned.',
    alwaysPitch: 'Intake response time decides everything. A 5-minute lead is 21x more likely to convert than a 30-minute lead.',
    scrapeQueryHint: 'law firm OR attorney OR personal injury OR family law',
  },
  {
    slug: 'real-estate',
    label: 'Real Estate Brokerages',
    aliases: ['real estate', 'realtor', 'brokerage', 'mortgage'],
    peakMonths: [3, 4, 5, 6, 7, 8],
    slowMonths: [11, 12, 1, 2],
    avgTicket: '$8k commission · $24k LTV (per side)',
    avgAnnualRevenue: '$1M-$10M brokerage',
    slowPitch: 'Q4/Q1 quiet stretch = the only time agents have to install CRM + nurture before spring buying season.',
    peakPitch: 'They are juggling 30+ leads with no system. Hot buyers get dropped. Pipeline visibility is zero.',
    alwaysPitch: 'Sphere-of-influence drip is the missing system. 80% of agents never follow up past day 14.',
    scrapeQueryHint: 'real estate brokerage OR realtor OR "real estate agent"',
  },
  {
    slug: 'chiropractor',
    label: 'Chiropractors',
    aliases: ['chiropractor', 'chiropractic', 'wellness clinic'],
    peakMonths: [1, 2, 9, 10],
    slowMonths: [6, 7, 12],
    avgTicket: '$65-$110 visit · $1,800 LTV',
    avgAnnualRevenue: '$400k-$900k',
    slowPitch: 'Summer dip = install reactivation campaigns for lapsed patients before fall back-pain season.',
    peakPitch: 'New-year resolution flood overwhelms their front desk. Most never run reactivation at all.',
    alwaysPitch: 'Patient reactivation is free money. 60% of dropped patients will come back when texted.',
    scrapeQueryHint: 'chiropractor OR chiropractic OR wellness center',
  },
  {
    slug: 'insurance',
    label: 'Insurance Legacy shops',
    aliases: ['insurance', 'operator', 'broker'],
    peakMonths: [10, 11, 12, 1],
    slowMonths: [5, 6, 7],
    avgTicket: '$1.1k commission · $8k LTV',
    avgAnnualRevenue: '$500k-$3M',
    slowPitch: 'Summer slowdown = perfect runway to install cross-sell automation before open enrollment chaos.',
    peakPitch: 'Open enrollment is leaking. Quotes go unsent. Cross-sell never happens. Each missed bundle = $400 GAAP.',
    alwaysPitch: 'Cross-sell ratio is the lever. The average operator owns 1.4 policies per client. Operators push to 2.8.',
    scrapeQueryHint: 'insurance operator OR insurance broker OR independent operator',
  },
  {
    slug: 'accounting',
    label: 'Accounting / CPA Firms',
    aliases: ['accounting', 'cpa', 'bookkeeping', 'tax'],
    peakMonths: [1, 2, 3, 4, 9, 10],
    slowMonths: [6, 7, 8, 11, 12],
    avgTicket: '$1.8k return · $4.5k LTV',
    avgAnnualRevenue: '$600k-$2.5M',
    slowPitch: 'Post-tax-season is the only window. They have cash, time, and pain still fresh. Install year-round advisory.',
    peakPitch: 'They are drowning. The deal: pitch the off-season setup now, contract starts May 1.',
    alwaysPitch: 'Most CPAs only touch clients once a year. The ones who advise monthly 3x their book.',
    scrapeQueryHint: '"accounting firm" OR CPA OR bookkeeping',
  },
  {
    slug: 'marketing-operator',
    label: 'Marketing / Creative Legacy shops',
    aliases: ['marketing operator', 'creative operator', 'digital operator', 'ad operator'],
    peakMonths: [1, 2, 9, 10, 11],
    slowMonths: [6, 7, 12],
    avgTicket: '$4k-$12k/mo active case · $50k+ LTV',
    avgAnnualRevenue: '$700k-$4M',
    slowPitch: 'Summer creative slump = time to bolt forensics tools onto their service stack as a margin booster.',
    peakPitch: 'They are scaling delivery without scaling ops. AI tooling is the only way to keep margins from collapsing.',
    alwaysPitch: 'Legacy shops that white-label our forensic tools add $4k-$8k MRR per client. Operator-led add-on.',
    scrapeQueryHint: 'marketing operator OR digital operator OR creative operator',
  },
  {
    slug: 'saas',
    label: 'B2B SaaS',
    aliases: ['saas', 'software', 'b2b software', 'tech startup'],
    peakMonths: [1, 2, 3, 9, 10, 11],
    slowMonths: [7, 8, 12],
    avgTicket: '$500-$5k MRR per logo',
    avgAnnualRevenue: '$1M-$20M ARR',
    slowPitch: 'Summer slowdown is when smart founders rebuild the funnel. Q4 board pressure makes Q3 the buy window.',
    peakPitch: 'Pipeline is hot but conversion is bleeding. Demo-to-close < 18% means there is leak.',
    alwaysPitch: 'Activation + onboarding are the leaks no founder owns. Fix them = 30% lift in net revenue retention.',
    scrapeQueryHint: 'B2B SaaS OR software company OR "vertical SaaS"',
  },
  {
    slug: 'ecommerce',
    label: 'E-commerce / DTC',
    aliases: ['ecommerce', 'e-commerce', 'shopify', 'dtc', 'direct-to-consumer'],
    peakMonths: [10, 11, 12, 1],
    slowMonths: [2, 3, 6, 7],
    avgTicket: '$65 AOV · $180 LTV',
    avgAnnualRevenue: '$500k-$10M',
    slowPitch: 'Post-Q4 lull = install retention + win-back flows before the next holiday push.',
    peakPitch: 'BFCM is leaking. Abandoned-cart recovery is 90% of brands\' biggest miss. Fix the flow, capture the cash.',
    alwaysPitch: 'Email + SMS lifecycle drives 30% of revenue for healthy brands. Most do less than 10%.',
    scrapeQueryHint: 'ecommerce brand OR Shopify store OR DTC brand',
  },
  {
    slug: 'home-services',
    label: 'General Home Services',
    aliases: ['home services', 'cleaning', 'lawn', 'landscaping', 'pest control', 'pool service'],
    peakMonths: [3, 4, 5, 6, 7, 8, 9],
    slowMonths: [11, 12, 1, 2],
    avgTicket: '$180 service · $1,400 LTV',
    avgAnnualRevenue: '$400k-$2M',
    slowPitch: 'Winter is when smart operators install booking automation before spring demand spikes.',
    peakPitch: 'They are turning away jobs because scheduling is manual. AI booking captures the overflow.',
    alwaysPitch: 'Recurring service plans 3x customer LTV. Most never even offer one at checkout.',
    scrapeQueryHint: 'home services OR landscaping OR pest control OR cleaning service',
  },
  {
    slug: 'restaurant',
    label: 'Restaurants (Multi-Unit)',
    aliases: ['restaurant', 'food service', 'hospitality', 'bar'],
    peakMonths: [5, 6, 7, 11, 12],
    slowMonths: [1, 2, 8, 9],
    avgTicket: '$32 ticket · $400 LTV (regulars)',
    avgAnnualRevenue: '$1M-$3M per location',
    slowPitch: 'January/February is the only window. Off-peak = time to install loyalty + reactivation before summer.',
    peakPitch: 'They are too busy to think. The right call: pitch the audit now, install in their slow month.',
    alwaysPitch: 'Most restaurants never collect customer data. The ones who do double their birthday-month revenue.',
    scrapeQueryHint: 'restaurant group OR multi-unit restaurant OR hospitality group',
  },
];

const NOW_MONTH = () => new Date().getMonth() + 1; // 1-12

export function ratingForMonth(ind: IndustrySeasonality, month = NOW_MONTH()): SeasonRating {
  if (ind.peakMonths.includes(month)) return 'peak';
  if (ind.slowMonths.includes(month)) return 'slow';
  const next = month === 12 ? 1 : month + 1;
  if (ind.peakMonths.includes(next)) return 'ramp';
  return 'steady';
}

export function pitchForRating(ind: IndustrySeasonality, rating: SeasonRating): string {
  switch (rating) {
    case 'peak': return ind.peakPitch;
    case 'slow': return ind.slowPitch;
    case 'ramp': return `Demand ramps next month — get in BEFORE the rush. ${ind.alwaysPitch}`;
    default: return ind.alwaysPitch;
  }
}

const NORMALIZE = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '');

/** Best-effort fuzzy match of a free-text industry string against our catalog. */
export function findIndustry(industryText: string | null | undefined): IndustrySeasonality | null {
  if (!industryText) return null;
  const n = NORMALIZE(industryText);
  if (!n) return null;
  for (const ind of INDUSTRIES) {
    if (ind.aliases.some(a => n.includes(NORMALIZE(a)))) return ind;
  }
  return null;
}

/** Ranked "what to attack THIS month" — peak first, then ramp, then slow. */
export function hotIndustriesForMonth(month = NOW_MONTH()) {
  const peak = INDUSTRIES.filter(i => i.peakMonths.includes(month));
  const ramp = INDUSTRIES.filter(i => !i.peakMonths.includes(month) && i.peakMonths.includes(month === 12 ? 1 : month + 1));
  const slow = INDUSTRIES.filter(i => i.slowMonths.includes(month));
  return { peak, ramp, slow };
}

export const MONTH_NAMES = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December',
];

export const RATING_LABEL: Record<SeasonRating, string> = {
  peak: 'PEAK SEASON',
  ramp: 'RAMP-UP',
  steady: 'STEADY',
  slow: 'SLOW MONTH',
};

export const RATING_COLOR: Record<SeasonRating, string> = {
  peak: 'text-amber border-amber/50 bg-amber/10',
  ramp: 'text-amber/80 border-amber/30 bg-amber/5',
  steady: 'text-muted-foreground border-border/50 bg-card/30',
  slow: 'text-red-400 border-red-400/40 bg-red-400/5',
};
