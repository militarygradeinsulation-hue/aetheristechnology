// ============================================================================
// AETHERIS PUBLIC ENGAGEMENT MODEL — single source of truth for public copy
// ----------------------------------------------------------------------------
// The public website does not publish prices. It publishes the relationship:
// we meet, we investigate, we prove the cause, we fix the highest-value problem
// first, and only then do we talk about what a continuing partnership is worth.
// Anything price-shaped belongs in a conversation, a proposal, or the internal
// tooling — never on a public marketing surface.
// ============================================================================

/** The central customer-facing promise. */
export const CORE_PROMISE = "You're losing revenue. We find why\u2014and fix it.";

export const HERO_SUPPORT =
  "Aetheris investigates the gaps between your website, sales process, follow-up, systems, and customer experience\u2014then helps correct the problems costing you money.";

/** Consistent, human CTA wording used everywhere a visitor can act. */
export const CTA = {
  primary: "Find Where Revenue Is Leaking",
  secondary: "See How It Works",
  talk: "Talk With Aetheris",
  session: "Schedule a Working Session",
  show: "Show Me What I'm Losing",
} as const;

export type EngagementStage = {
  n: string;
  title: string;
  line: string;
};

/** Meet. Investigate. Fix. Recover. Earn the Partnership. */
export const ENGAGEMENT_STAGES: EngagementStage[] = [
  {
    n: "01",
    title: "Meet",
    line: "We sit down with you and learn how the business actually works, in your words.",
  },
  {
    n: "02",
    title: "Investigate",
    line: "We look for where revenue, opportunity, trust, time, or follow-through is being lost.",
  },
  {
    n: "03",
    title: "Fix",
    line: "We prove the cause with evidence you can check, then address the highest-value problem first.",
  },
  {
    n: "04",
    title: "Recover",
    line: "We work to recover the value already being lost, and show you what moved.",
  },
  {
    n: "05",
    title: "Earn the Partnership",
    line: "If the work is worth continuing, you invite us to keep going and we agree openly on what is fair to both sides.",
  },
];

export const ENGAGEMENT_STAGES_HEADLINE =
  "Meet. Investigate. Fix. Recover. Earn the Partnership.";

export const ENGAGEMENT_STAGES_INTRO =
  "There is no plan to pick and no cart to fill. We earn the right to keep working with you through results you can see.";

/** Founder voice trust block. */
export const FOUNDER_TRUST = {
  quote:
    "I would rather answer your questions honestly than sell you work you do not need. If we find a real loss, I will show you the evidence and the path to recover it. If we earn the right to keep working together, we will agree on a relationship that reflects the value, the work, and what is fair.",
  short:
    "You will not be charged simply for asking questions. Whether or not we work together, I will answer honestly and help you understand what I see. If there is no clear case for Aetheris to create value, there is no pressure to manufacture one.",
  punch: "No pressure. No mystery invoice. No paid relationship until there is a clear reason for one.",
  attribution: "Dean \u00b7 Founder, Aetheris Technology",
} as const;

/** Calm expectation note to place near conversion points. */
export const EXPECTATION_NOTE =
  "The initial conversation is not a promise of free implementation or guaranteed recovery. Any paid work, scope, and terms are agreed before work begins.";
