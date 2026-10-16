// ============================================================================
// AETHERIS PUBLIC ENGAGEMENT MODEL — single source of truth for public copy
// ----------------------------------------------------------------------------
// The public website makes the buying path and pricing logic clear without
// forcing a visitor to diagnose themselves. We meet, investigate, prove the
// cause, correct the highest-value problem first, and expand only when the
// evidence justifies it. The first meeting is complimentary; standalone
// consulting after that is $100/hour unless included in a written scope.
// ============================================================================

/** The central customer-facing promise. */
export const CORE_PROMISE = "Find what's costing your company money. Know what to fix first.";

export const HERO_SUPPORT =
  "Aetheris examines how your people, processes, and systems work together, identifies where value is being lost, and builds a practical plan to correct it.";

/** Consistent, human CTA wording used everywhere a visitor can act. */
export const CTA = {
  primary: "Find My Business Gaps",
  secondary: "See a Sample Golden Report",
  talk: "Talk With Aetheris",
  session: "Schedule the Complimentary First Meeting",
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
    "The first meeting is complimentary. We use it to understand the business, decide whether there is something worth investigating, and tell you what the sensible next step is. After that, standalone consulting is $100 per hour unless the time is already included in a scoped engagement.",
  punch: "The first conversation is on us. Paid work begins only after the scope and terms are clear.",
  attribution: "Joseph \u00b7 Founder, Aetheris Technology",
} as const;

/** Calm expectation note to place near conversion points. */
export const EXPECTATION_NOTE =
  "Your first meeting is complimentary. Additional standalone consulting is $100/hour unless included in a scoped engagement. Implementation, fixed-fee work, and any recovery-based terms are agreed in writing before work begins; no recovered revenue is guaranteed.";
