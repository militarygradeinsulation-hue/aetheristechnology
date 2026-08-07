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

export type TierId = "free" | "signal" | "revenue" | "suite" | "diagnostic" | "active";

/** Ordered ladder, lowest to highest. Index = entitlement rank. */
export const TIER_ORDER: TierId[] = ["free", "signal", "revenue", "suite", "diagnostic", "active"];

export type AetherisTier = {
  id: TierId;
  name: string;
  /** One-word method verb for this rung. */
  verb: string;
  /** Price in cents. 0 for free. */
  amountCents: number;
  cadence: "free" | "one-time" | "monthly";
  priceLabel: string;
  /** Short positioning line. */
  headline: string;
  /** Who this is for. */
  useCase: string;
  /** Capabilities added AT this tier (not inherited). */
  adds: string[];
  /** Inheritance line, empty for the first two rungs. */
  inherits?: string;
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
    headline: "One live scan of one URL. A directional Revenue Score and one real named leak.",
    useCase: "You want proof this is real before you talk to anyone.",
    adds: [
      "Website Leak Scanner, limited pass",
      "Directional Revenue Score",
      "One real named leak you can share internally",
      "Directional dollar range where the scan data supports it",
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
    headline: "The diagnosis triangle. You know something is wrong. This names it.",
    useCase: "Owner knows something is wrong but cannot name it.",
    adds: [
      "Website Leak Scanner, full pass — structural leaks and what is broken in the machine",
      "Brand Contradictions — where your messaging fights itself",
      "Friction Audit — the exact language and CTA friction costing you deals",
      "Leak findings memo plus an operator walkthrough",
    ],
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
    headline: "Diagnosis plus the words and cadence your team uses Monday morning.",
    useCase: "Founder with a team but no consistent sales or content system.",
    inherits: "Everything in Signal Pack",
    adds: [
      "Strategic Questions",
      "Sales Scripts",
      "Follow-Up Sequences",
      "Content Calendar",
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
    headline: "You stop receiving outputs and start running the instruments yourself.",
    useCase: "Business consolidating multiple vendors and disconnected tools into one operating system.",
    inherits: "Everything in Revenue Pack",
    adds: [
      "Detective Mode",
      "Forensic Scan (All)",
      "Head-to-Head Report",
      "Social Content Studio",
      "Image Studio",
      "Content Engine",
      "All-In-One Content",
      "Easy Mode",
      "Full Aetheris Tech Suite access — diagnose, fix, re-scan, publish, measure",
    ],
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
    headline:
      "An operator runs the systems inside your business for 21 days with CRM, pipeline, and internal data connected. Modeled loss becomes measured loss.",
    useCase: "Business needing a board-ready quantified leak ledger before scaling, hiring, or raising.",
    inherits: "Everything in Operator Suite",
    adds: [
      "Golden Report — the synthesis case file, never sold separately",
      "Nexus IQ",
      "Reciprocation Gift",
      "AI Readiness Checklist",
      "Playbook Generator",
      "Every remaining Aetheris Universe instrument",
      "21 days of operator time inside your business",
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
    headline:
      "Everything, continuously, plus priority builds. Monthly rescans track recovery and the Leak Register becomes a living document of dollars recovered versus remaining.",
    useCase: "Post-Diagnostic businesses that want recovery execution and ongoing measurement.",
    inherits: "Everything in the 21-Day Diagnostic",
    adds: [
      "Monthly rescans and recovery tracking",
      "Living Leak Register — recovered versus remaining",
      "Priority builds via Tool Generator and the Aetheris build stack",
      "Standing operator capacity",
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
