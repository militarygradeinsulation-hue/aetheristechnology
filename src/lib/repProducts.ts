// Single source of truth for rep commission tables.
// Prices in cents to avoid float math.

export interface RepProduct {
  name: string;
  priceCents: number;
  recurring?: boolean;
  highlight?: boolean;
}

export const REP_PRODUCTS: RepProduct[] = [
  { name: 'Playbook Unlock', priceCents: 2900 },
  { name: 'Social Content Pack', priceCents: 3900 },
  { name: 'Content Calendar', priceCents: 3900 },
  { name: 'Sales Script Pack', priceCents: 5900 },
  { name: 'Follow-Up Plan', priceCents: 5900 },
  { name: 'Full Website Report', priceCents: 5900 },
  { name: 'Friction Vocabulary Audit', priceCents: 7900 },
  { name: 'Strategic Question Engine', priceCents: 9900 },
  { name: 'Brand Contradiction Finder', priceCents: 11900 },
  { name: 'Digital Snapshot', priceCents: 14900 },
  { name: 'Strategy Blueprint', priceCents: 34900 },
  { name: 'Website Evaluation', priceCents: 59900 },
  { name: 'Strategic Discovery Audit', priceCents: 59900 },
  { name: '14-Day Forensic Diagnostic', priceCents: 290000, highlight: true },
  { name: 'Fractional CTO/CMO', priceCents: 590000, recurring: true, highlight: true },
];

export const fmtUsd = (cents: number) =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: cents % 100 === 0 ? 0 : 2,
  }).format(cents / 100);

export const commissionCents = (priceCents: number, rate: number) =>
  Math.round(priceCents * rate);
