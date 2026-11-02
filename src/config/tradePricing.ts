// Trades & contractors pricing ladder (Packaging in the conversion diamond).
//
// Model: finding the problems is free. Solutions, consultation,
// implementation, and ongoing monitoring are paid. Everything is delivered
// remotely; there are no site visits and no required sales calls.
//
// Market anchors used to set these numbers (researched 2026-11):
// - Contractor CRM / automation services: roughly $99-$450/month; flat
//   missed-call text-back products around $297/month; simple setup $0-$500,
//   custom or voice-AI builds several thousand dollars.
// - Field service software: Jobber ~$39-$349/mo, Housecall Pro $59-$299 per
//   user/mo, ServiceTitan ~$250-$498 per tech/mo plus $5k-$50k implementation.
// - Fractional operations consulting: ~$150-$225/hr middle band.
// Aetheris prices sit at or below those anchors because the scan is free and
// the work is scoped to leaks the scan has already found.
//
// The Fix Plan reuses the existing $599 Correction Roadmap checkout offer so
// the price shown here and the price charged stay the same.

export type TradeTierCadence = 'free' | 'one-time' | 'hourly' | 'monthly';
export type TradeTierStage = 'Find' | 'Plan' | 'Advise' | 'Fix' | 'Watch';

export interface TradeTier {
  id: string;
  stage: TradeTierStage;
  name: string;
  /** Price shown on the card, e.g. "$599" or "From $1,500". */
  price: string;
  /** Lowest charge in whole dollars, used for ordering and tests. */
  fromDollars: number;
  cadence: TradeTierCadence;
  /** One line on who it is for. */
  forWho: string;
  includes: string[];
  /** CTA label and destination. Destinations never trigger report generation. */
  cta: { label: string; href: string };
  highlight?: boolean;
}

export const TRADE_TIERS: TradeTier[] = [
  {
    id: 'scan',
    stage: 'Find',
    name: 'Free Leak Scan',
    price: 'Free',
    fromDollars: 0,
    cadence: 'free',
    forWho: 'See what is broken before you spend a dollar.',
    includes: [
      'Scan of your website and lead flow',
      'The problems it finds, in plain language',
      'Yours to keep, whether or not you hire me',
    ],
    cta: { label: 'Run the free scan', href: '/leak-audit/self-scan' },
  },
  {
    id: 'fix-plan',
    stage: 'Plan',
    name: 'Fix Plan',
    price: '$599',
    fromDollars: 599,
    cadence: 'one-time',
    forWho: 'Know exactly what to fix, in what order, and what each fix is worth.',
    includes: [
      'Human-reviewed findings from your scan',
      'Step-by-step fix plan, ordered by money at stake',
      'Fee credited toward implementation within 60 days',
    ],
    cta: { label: 'Get the Fix Plan', href: '/business-xray/checkout?offer=roadmap' },
    highlight: true,
  },
  {
    id: 'consult',
    stage: 'Advise',
    name: 'Consultation',
    price: '$150',
    fromDollars: 150,
    cadence: 'hourly',
    forWho: 'Talk it through on a video call, from the truck or after hours.',
    includes: [
      '60-minute remote session, booked online',
      'Walk through your plan, tools, or a specific problem',
      'Credited toward implementation within 60 days',
    ],
    cta: { label: 'Book a consultation', href: '/book' },
  },
  {
    id: 'implement',
    stage: 'Fix',
    name: 'Implementation',
    price: 'From $1,500',
    fromDollars: 1500,
    cadence: 'one-time',
    forWho: 'I build the fixes into the tools you already use.',
    includes: [
      'Quick Fix ($1,500): up to 3 fixes, e.g. missed-call text-back, quote follow-up, review requests',
      'Office Rebuild ($4,500): up to 7 fixes, including scheduling, invoicing, and integrations',
      'Fixed price agreed before work starts, done remotely',
    ],
    cta: { label: 'Start implementation', href: '/book' },
  },
  {
    id: 'monitor',
    stage: 'Watch',
    name: 'Monitoring',
    price: 'From $197/mo',
    fromDollars: 197,
    cadence: 'monthly',
    forWho: 'Keep it fixed while you stay in the field.',
    includes: [
      'Watch ($197/mo): monthly re-scan, alerts when something breaks, plain-English report',
      'Managed ($497/mo): Watch plus ongoing tweaks, small new fixes, and a monthly call',
      'Month to month, cancel anytime',
    ],
    cta: { label: 'Add monitoring', href: '/book' },
  },
];

/** Risk reversal shown with the pricing. Keep wording in sync with /lander. */
export const TRADE_GUARANTEE = [
  'I guarantee I can help you save money in less than 30 days.',
  'The free scan is yours to keep, whether or not you hire me.',
  'Fix Plan and consultation fees are credited toward implementation within 60 days.',
  'Monitoring is month to month. Cancel anytime.',
];

/** What the usual alternatives cost, for the positioning comparison. */
export const TRADE_ALTERNATIVES = [
  {
    option: 'Field service software',
    cost: '$39-$498 per user/month, plus setup',
    problem: 'You still have to learn it, set it up, and run it yourself.',
  },
  {
    option: 'Marketing agency',
    cost: 'Monthly retainer',
    problem: 'Sends more leads into the same office leaks.',
  },
  {
    option: 'Operations consultant',
    cost: '$150-$225/hour',
    problem: 'Usually hands you a report and leaves you to fix it.',
  },
  {
    option: 'Hiring an office person',
    cost: 'A full-time salary',
    problem: 'Still manual, and stops when they are out sick.',
  },
];

/** Shared objection-handling FAQs about cost and remote delivery. */
export const PRICING_FAQS = [
  {
    question: 'Do you need to come out to my business?',
    answer: 'No. The scan, the Fix Plan, consultations, implementation, and monitoring are all done remotely.',
  },
  {
    question: 'What does it cost?',
    answer:
      'The scan is free. The Fix Plan is $599, consultations are $150 an hour, implementation starts at $1,500, and monitoring starts at $197 a month. Plan and consultation fees are credited toward implementation within 60 days.',
  },
  {
    question: 'Am I locked into a contract?',
    answer: 'No. Implementation is a fixed price agreed up front, and monitoring is month to month.',
  },
];
