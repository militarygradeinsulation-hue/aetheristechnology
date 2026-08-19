// ============================================================================
// AETHERIS UNIVERSE TIER SYSTEM — SINGLE SOURCE OF TRUTH (2026)
// ----------------------------------------------------------------------------
// The 24 Aetheris tools are NOT standalone SKUs. They are instruments included
// inside progressively higher Aetheris service tiers. There are no public
// per-tool prices, no per-tool Stripe checkouts, and no tool-shop retail plans.
//
// Method progression:
//   DIAGNOSE (Signal) -> ARM (Revenue) -> OPERATE (Suite)
//   -> INVESTIGATE (Diagnostic) -> SUSTAIN (Active Case)
// ============================================================================

export type TierId = "free" | "intelligence" | "signal" | "revenue" | "suite" | "diagnostic" | "active";

/** Ordered ladder, lowest to highest. Index = entitlement rank. */
export const TIER_ORDER: TierId[] = ["free", "intelligence", "signal", "revenue", "suite", "diagnostic", "active"];

export type AetherisTier = {
  id: TierId;
  name: string;
  /** One-word method verb for this rung. */
  verb: string;
  /** Price in cents. 0 for free. */
  amountCents: number;
  cadence: "free" | "one-time" | "monthly";
  priceLabel: string;
  /** Delivery expectation, e.g. "about a week". */
  timeline: string;
  /** Short positioning line. Says what changed versus the rung below. */
  headline: string;
  /** Who this is for. */
  useCase: string;
  /** The closing line: what the buyer walks away holding. */
  outcome: string;
  /** Capabilities added AT this tier (not inherited). Outcomes, not product names. */
  adds: string[];
  /** Inheritance line, empty for the first two rungs. */
  inherits?: string;
  /** Credit note, stated once per tier where it applies. */
  credit?: string;
  flagship?: boolean;
  /** Cannot be bought cold. */
  qualificationOnly?: boolean;
  ctaLabel: string;
  ctaHref: string;
};

export const AETHERIS_TIERS: AetherisTier[] = [
  {
    id: "free",
    name: "Free Self-Scan",
    verb: "Demonstrate",
    amountCents: 0,
    cadence: "free",
    priceLabel: "$0",
    timeline: "about 6 minutes · no call",
    headline:
      "We scan one page of your site live and show you one thing that is costing you money.",
    useCase: "You want proof this is real before you talk to anyone.",
    outcome: "One specific problem you did not know you had.",
    adds: [
      "One live scan of one URL",
      "Your Revenue Score, 0 to 100",
      "One named leak, in plain language, with the evidence behind it",
      "A dollar range on that leak where the data supports it",
      "A PDF you can forward to your partner without explaining it first",
    ],
    ctaLabel: "Run the free scan",
    ctaHref: "/scan",
  },
  {
    id: "signal",
    name: "Signal Pack",
    verb: "Diagnose",
    amountCents: 750000,
    cadence: "one-time",
    priceLabel: "$7,500",
    timeline: "about a week",
    headline:
      "Three instruments run together to name what is actually wrong. Any one alone gives you a symptom. Together they give you a diagnosis.",
    useCase: "You know something is wrong but cannot name it, and you are tired of guessing.",
    outcome:
      "The problem named in writing, with evidence, from someone who has fixed it before.",
    adds: [
      "Full site scan — every structural leak across your public surface, not just one page",
      "Message conflict report — every place your site contradicts itself, your sales pitch, or your delivery promise",
      "Friction language audit — the exact words, forms, and buttons that make buyers hesitate or leave",
      "Written findings memo — a verdict you can hand to your team, not a checklist",
      "30-minute walkthrough with the operator who ran it",
    ],
    credit: "Full $7,500 credits toward any higher tier",
    ctaLabel: "Talk to an operator",
    ctaHref: "/book",
  },
  {
    id: "revenue",
    name: "Revenue Pack",
    verb: "Arm",
    amountCents: 1000000,
    cadence: "one-time",
    priceLabel: "$10,000",
    timeline: "about two weeks",
    headline:
      "Signal Pack tells you what is broken. Revenue Pack gives your team the words to fix it, built from your leaks and not from a template.",
    useCase: "You have a team but no system. Every sales call is improvised and every post is a guess.",
    outcome: "What your people say Monday morning, written down.",
    inherits: "Everything in Signal Pack",
    adds: [
      "Sales scripts — discovery through close, in real language, with objection handling built from the contradictions we found on your site",
      "Follow-up sequences — the cadence you are not running, aimed at the response-time gap that shows up in almost every audit",
      "Strategic question set — the questions that make unqualified buyers disqualify themselves before they waste your team's week",
      "30-day content calendar — built around your specific leaks, so marketing stops running on instinct",
      "Two 45-minute working sessions to install it with your team",
    ],
    ctaLabel: "Talk to an operator",
    ctaHref: "/book",
  },
  {
    id: "suite",
    name: "Operator Suite",
    verb: "Operate",
    amountCents: 1500000,
    cadence: "one-time",
    priceLabel: "$15,000",
    timeline: "about 3 weeks",
    headline:
      "You stop receiving reports and start running the instruments yourself. This is where you own the loop.",
    useCase: "You are paying five vendors for four tools that do not talk to each other.",
    outcome: "One system you operate yourself, replacing the stack you are currently renting.",
    inherits: "Everything in Revenue Pack",
    adds: [
      "Run the full forensic battery yourself, on demand — re-scan monthly and watch your score move",
      "Deep-dive any single surface when the broad scan flags something worth investigating",
      "Scan your competitors — run the same forensic pass on a rival and see their leaks priced out",
      "Content production stack — social, imagery, and long-form built to your voice without a separate agency",
      "12-month strategy blueprint, priced by leak, so you know the order to fix things in",
      "Lead-nurture automation installed, not just designed",
      "Full Aetheris Tech Suite access — the whole loop: diagnose, fix, re-scan, publish, measure",
    ],
    credit: "Credits 1:1 toward the Active Case Retainer",
    ctaLabel: "Talk to an operator",
    ctaHref: "/book",
  },
  {
    id: "diagnostic",
    name: "21-Day Diagnostic",
    verb: "Investigate",
    amountCents: 2350000,
    cadence: "one-time",
    priceLabel: "$23,500",
    timeline: "21 days · fit call required",
    headline:
      "Everything above analyzes your public surface. This is the only tier where an operator works inside your business, with your CRM, pipeline, and internal data connected. Estimated loss becomes measured loss.",
    useCase: "You need a board-ready number before you scale, hire, or raise.",
    outcome:
      "A signed, dated, defensible ledger of what your business is losing and exactly what it costs to stop.",
    inherits: "Everything in Operator Suite",
    adds: [
      "21 days of operator time inside your ops, sales, and marketing",
      "The Golden Report — the full case file, every leak named, evidenced, ranked, and priced. Never sold separately, because it is the synthesis of every other instrument's output",
      "Quantified leak ledger — a dollar figure next to every finding, ranked by exposure",
      "Account intelligence on your own pipeline — the forensic method pointed outward at your target accounts",
      "Automation readiness scoring — where AI actually pays, and where it is theater",
      "Operating playbooks your team runs after we leave",
      "Implementation plan handoff — do it yourself, or hand it back to us",
    ],
    flagship: true,
    ctaLabel: "Request a fit call",
    ctaHref: "/book",
  },
  {
    id: "active",
    name: "Active Case Retainer",
    verb: "Sustain",
    amountCents: 2000000,
    cadence: "monthly",
    priceLabel: "$20,000/mo",
    timeline: "3-month minimum · requires a completed Diagnostic",
    headline:
      "We stop advising and start running it. Every month we show you what got recovered and what is left.",
    useCase:
      "The Diagnostic named the leaks and you would rather we closed them than hand it to an already-overloaded team.",
    outcome:
      "Monthly proof of recovery, in dollars, against a baseline we established together.",
    inherits: "Everything in the 21-Day Diagnostic",
    adds: [
      "Weekly execution sprints across sales, content, ops, and tech",
      "Monthly re-scans tracking recovery against your original baseline",
      "Living Leak Register — dollars recovered versus dollars remaining, updated monthly",
      "Priority builds — when you need an instrument that does not exist yet, we build it",
      "Standing operator capacity and direct access, not an account manager",
      "Pause or cancel any month — no long lock-in",
    ],
    qualificationOnly: true,
    ctaLabel: "Diagnostic clients only",
    ctaHref: "/book",
  },
];


export function tier(id: TierId): AetherisTier {
  return AETHERIS_TIERS.find(t => t.id === id) ?? AETHERIS_TIERS[0];
}

export function tierRank(id: TierId): number {
  const i = TIER_ORDER.indexOf(id);
  return i < 0 ? 0 : i;
}

/**
 * Tool -> lowest tier that unlocks it. Higher tiers inherit everything below.
 * Every tool in the catalog must appear here.
 */
export const TOOL_TIER: Record<string, TierId> = {
  // Free demonstration (limited pass of the scanner)
  "website-scanner": "signal", // full pass at Signal; limited pass is free

  // Signal — the diagnosis triangle
  "brand-contradictions": "signal",
  "friction-audit": "signal",

  // Revenue — arm the team
  "strategic-questions": "revenue",
  "sales-scripts": "revenue",
  "follow-up-plan": "revenue",
  "content-calendar": "revenue",

  // Operator Suite — run the instruments
  "detective-mode": "suite",
  "forensic-scan-all": "suite",
  "head-to-head": "suite",
  "social-content": "suite",
  "image-studio": "suite",
  "content-engine": "suite",
  "all-in-one": "suite",
  "easy-mode": "suite",

  // Diagnostic — the full investigation
  "golden-report": "diagnostic",
  "nexus-iq": "diagnostic",
  reciprocation: "diagnostic",
  "ai-checklist": "diagnostic",
  "playbook-generator": "diagnostic",
  "resume-forensics": "diagnostic",
  "linkedin-playbook": "diagnostic",
  "creation-studio": "diagnostic",
  "tool-generator": "diagnostic",
};

/** Tools that only ever run inside a full investigation, never standalone. */
export const DIAGNOSTIC_ONLY_TOOLS = ["golden-report"];

export function tierForTool(toolId: string): TierId {
  return TOOL_TIER[toolId] ?? "diagnostic";
}

/** Badge copy for a tool card, e.g. "Included in Operator Suite". */
export function tierBadgeForTool(toolId: string): string {
  const id = tierForTool(toolId);
  if (DIAGNOSTIC_ONLY_TOOLS.includes(toolId)) return "Diagnostic only";
  if (id === "free") return "Free Self-Scan";
  return `Included in ${tier(id).name}`;
}

/** Short badge for tight layouts, e.g. "Operator Suite". */
export function tierShortBadge(toolId: string): string {
  const id = tierForTool(toolId);
  if (DIAGNOSTIC_ONLY_TOOLS.includes(toolId)) return "Diagnostic only";
  return tier(id).name;
}

/**
 * Entitlement check. Access is granted by the client's purchased tier, never
 * by individual tool ownership.
 */
export function tierUnlocksTool(clientTier: TierId | null | undefined, toolId: string): boolean {
  if (!clientTier) return false;
  return tierRank(clientTier) >= tierRank(tierForTool(toolId));
}

/** Every tool included at a given tier (inherited included). */
export function toolsForTier(clientTier: TierId): string[] {
  return Object.keys(TOOL_TIER).filter(id => tierUnlocksTool(clientTier, id));
}

/** Tailwind accent class per tier, kept inside the forensic palette. */
export const TIER_ACCENT: Record<TierId, string> = {
  free: "text-muted-foreground border-border/60",
  signal: "text-amber border-amber/40",
  revenue: "text-amber border-amber/50",
  suite: "text-amber border-amber/60",
  diagnostic: "text-crimson border-crimson/50",
  active: "text-crimson border-crimson/60",
};
