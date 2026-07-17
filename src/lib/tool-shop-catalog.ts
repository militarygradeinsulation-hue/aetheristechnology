// Central catalog for the Aetheris Tool Shop.
//
// Pricing model (Nov 2025 reprice):
//  - 7 client-facing tools are premium-priced: $250 each, Detective $500,
//    Forensic Scan (All) $1,500.
//  - Golden Report ($3,500) is NEVER sold standalone — it appears only as a
//    value-stack line inside the $18,500 Full Leak Investigation.
//  - Operator-only tools (Content, Sales, internal Reports) are flagged
//    `internalOnly: true` and hidden from every public shop surface. They
//    remain reachable via direct rep POS in `repProducts.ts` for legacy /
//    internal use.
//  - Evidence Kit bundle ($2,500) unlocks all client-facing tools at once.

export type ShopTool = {
  id: string;
  name: string;
  tagline: string;
  category: "diagnostics" | "content" | "reports" | "sales";
  route: string;
  /** Standalone lifetime price in cents. `null` = never sold standalone (Golden Report). */
  priceCents: number | null;
  /** Human-readable Stripe lookup key for this tool. `null` when not sold. */
  priceId: string | null;
  /** Operator tool — hidden from public shop, buy bars, mind-map chips, etc. */
  internalOnly?: boolean;
};

export const SHOP_TOOLS: ShopTool[] = [
  // ── Client-facing diagnostics ──────────────────────────────────────────
  { id: "website-scanner",      name: "Website Leak Scanner",       tagline: "Live scan for revenue leaks on any URL.",               category: "diagnostics", route: "/leak-audit",            priceCents:  25000, priceId: "tool_website_scanner_lifetime" },
  { id: "brand-contradictions", name: "Brand Contradictions",       tagline: "Where your brand says one thing and does another.",    category: "diagnostics", route: "/brand-contradictions",  priceCents:  25000, priceId: "tool_brand_contradictions_lifetime" },
  { id: "friction-audit",       name: "Friction Audit",             tagline: "Every buyer step that quietly costs you deals.",       category: "diagnostics", route: "/friction-audit",        priceCents:  25000, priceId: "tool_friction_audit_lifetime" },
  { id: "strategic-questions",  name: "Strategic Questions",        tagline: "AI-generated boardroom questions you're avoiding.",    category: "diagnostics", route: "/strategic-questions",   priceCents:  25000, priceId: "tool_strategic_questions_lifetime" },
  { id: "detective-mode",       name: "Detective Mode",             tagline: "Deep forensic sweep on a single business surface.",    category: "diagnostics", route: "/detective",             priceCents:  50000, priceId: "tool_detective_mode_lifetime" },
  { id: "forensic-scan-all",    name: "Forensic Scan (All)",        tagline: "Runs every diagnostic in one shot.",                   category: "diagnostics", route: "/try/forensic-scan-all", priceCents: 150000, priceId: "tool_forensic_scan_all_lifetime" },

  // ── Client-facing report ───────────────────────────────────────────────
  { id: "ai-checklist",         name: "AI Readiness Checklist",     tagline: "Score a business on AI-readiness in one pass.",        category: "reports",     route: "/ai-checklist",          priceCents:  25000, priceId: "tool_ai_checklist_lifetime" },

  // ── Golden Report — never sold standalone ──────────────────────────────
  { id: "golden-report",        name: "Golden Report",              tagline: "$3,500 deliverable — included in the $18,500 Full Leak Investigation.", category: "reports", route: "/golden-report", priceCents: null, priceId: null, internalOnly: true },

  // ── Operator-only Reports (hidden from public shop) ────────────────────
  { id: "head-to-head",         name: "Head-to-Head Report",        tagline: "Side-by-side competitor comparison, evidence-backed.", category: "reports",     route: "/head-to-head",          priceCents: null, priceId: null, internalOnly: true },
  { id: "resume-forensics",     name: "Resume Forensics",           tagline: "Rewrites resumes to beat ATS filters.",                category: "reports",     route: "/resume-forensics",      priceCents: null, priceId: null, internalOnly: true },
  { id: "reciprocation",        name: "Reciprocation Gift",         tagline: "Free custom door-opener report.",                      category: "reports",     route: "/reciprocation",         priceCents: null, priceId: null, internalOnly: true },
  { id: "nexus-iq",             name: "Prospect Intel · Nexus IQ",  tagline: "Full pre-meeting dossier on any target company.",      category: "reports",     route: "/nexus-iq",              priceCents: null, priceId: null, internalOnly: true },

  // ── Operator-only Sales enablement (hidden from public shop) ───────────
  { id: "sales-scripts",        name: "Sales Scripts",              tagline: "Cold, warm, and follow-up scripts.",                   category: "sales",       route: "/sales-scripts",         priceCents: null, priceId: null, internalOnly: true },
  { id: "follow-up-plan",       name: "Follow-Up Sequences",        tagline: "Post-meeting email plays.",                            category: "sales",       route: "/follow-up-plan",        priceCents: null, priceId: null, internalOnly: true },
  { id: "linkedin-playbook",    name: "LinkedIn Playbook",          tagline: "Profile-to-lead-machine system.",                      category: "sales",       route: "/playbook/linkedin",     priceCents: null, priceId: null, internalOnly: true },

  // ── Operator-only Content engine (hidden from public shop) ─────────────
  { id: "all-in-one",           name: "All-In-One Content",         tagline: "Blog + social + email from one prompt.",               category: "content",     route: "/try/all-in-one",        priceCents: null, priceId: null, internalOnly: true },
  { id: "content-calendar",     name: "Content Calendar Builder",   tagline: "30 days of aligned content.",                          category: "content",     route: "/content-calendar",      priceCents: null, priceId: null, internalOnly: true },
  { id: "playbook-generator",   name: "Playbook Generator",         tagline: "Custom operating playbooks.",                          category: "content",     route: "/try/playbook-generator",priceCents: null, priceId: null, internalOnly: true },
  { id: "social-content",       name: "Social Content Studio",      tagline: "Voice-locked social posts.",                           category: "content",     route: "/try/social-content",    priceCents: null, priceId: null, internalOnly: true },
  { id: "content-engine",       name: "Content Engine",             tagline: "Long-form + short-form pipeline.",                     category: "content",     route: "/try/content-engine",    priceCents: null, priceId: null, internalOnly: true },
  { id: "image-studio",         name: "Image Studio",               tagline: "On-brand imagery + watermarks.",                       category: "content",     route: "/try/image-studio",      priceCents: null, priceId: null, internalOnly: true },
  { id: "creation-studio",      name: "Creation Studio",            tagline: "Mixed-media asset generator.",                         category: "content",     route: "/try/creation-studio",   priceCents: null, priceId: null, internalOnly: true },
  { id: "easy-mode",            name: "Easy Mode",                  tagline: "Plain-English paste-ready copy.",                      category: "content",     route: "/try/easy-mode",         priceCents: null, priceId: null, internalOnly: true },
  { id: "tool-generator",       name: "Tool Generator",             tagline: "Build a mini-tool from a brief.",                      category: "content",     route: "/try/tool-generator",    priceCents: null, priceId: null, internalOnly: true },
];

/**
 * Legacy plan shape — still consumed by BuyToolDialog. `single` now resolves
 * per-tool at checkout time (the ShopTool's own priceId + priceCents wins over
 * these defaults). `bundle` = Evidence Kit (every client-facing tool, $2,500).
 * `triple` is retained for type compatibility only and is not surfaced in UI.
 */
export const SHOP_PRICES = {
  single: {
    priceId: "tool_website_scanner_lifetime",
    label: "1 Tool",
    amount: 25000,
    subtitle: "Lifetime access, memory attached",
  },
  triple: {
    priceId: "tool_evidence_kit_bundle",
    label: "Evidence Kit",
    amount: 250000,
    subtitle: "All 7 client-facing tools, lifetime",
  },
  unlimited: {
    priceId: "tool_evidence_kit_bundle",
    label: "Evidence Kit — All Client-Facing Tools",
    amount: 250000,
    subtitle: "Every diagnostic + AI Readiness Checklist. Lifetime. Persistent memory.",
  },
} as const;

export type ShopPlan = keyof typeof SHOP_PRICES;

export const FREE_RUNS_PER_TOOL = 3;

export function findTool(id: string) {
  return SHOP_TOOLS.find(t => t.id === id);
}

/** Tools visible in the public shop, buy bars, and mind-map chips. */
export function publicShopTools(): ShopTool[] {
  return SHOP_TOOLS.filter(t => !t.internalOnly);
}

/** Client-facing tools that are actually for sale (excludes Golden Report). */
export function sellableShopTools(): ShopTool[] {
  return SHOP_TOOLS.filter(t => !t.internalOnly && t.priceCents != null && t.priceId);
}

/** Format a tool's price for display, or a fallback string if unpriced. */
export function formatToolPrice(tool: ShopTool | undefined): string {
  if (!tool || tool.priceCents == null) return "";
  return `$${(tool.priceCents / 100).toLocaleString()}`;
}
