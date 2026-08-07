// Central catalog for the Aetheris instrument set.
//
// PRICING MODEL (2026 Aetheris Universe tier system):
//  - Tools are NOT standalone SKUs. They are instruments included inside
//    progressively higher Aetheris service tiers. See `src/lib/aetherisTiers.ts`
//    for the single source of truth on tiers, prices and entitlement.
//  - There are no public per-tool prices, no per-tool Stripe checkouts, and no
//    single / triple / all-access retail plans. `priceCents` and `priceId` are
//    retained as `null` for backward compatibility only.
//  - Access is checked from the client's purchased tier entitlement
//    (`tierUnlocksTool`), never from individual tool ownership.
//  - `internalOnly` still marks true operator-only instruments that are hidden
//    from public browsing surfaces.

import { type TierId, tierForTool, tierBadgeForTool } from "@/lib/aetherisTiers";

export type ShopTool = {
  id: string;
  name: string;
  tagline: string;
  category: "diagnostics" | "content" | "reports" | "sales";
  route: string;
  /** Lowest tier that unlocks this instrument. */
  tierAccess: TierId;
  /** @deprecated Tools are no longer sold standalone. Always null. */
  priceCents: number | null;
  /** @deprecated Legacy Stripe identifier. Never surfaced publicly. Always null. */
  priceId: string | null;
  /** Operator tool — hidden from public browsing surfaces. */
  internalOnly?: boolean;
};

export const SHOP_TOOLS: ShopTool[] = [
  // ── Diagnostics ────────────────────────────────────────────────────────
  { id: "website-scanner",      name: "Website Leak Scanner",       tagline: "Live scan for revenue leaks on any URL.",               category: "diagnostics", route: "/scan",                  tierAccess: "signal",     priceCents: null, priceId: null },
  { id: "brand-contradictions", name: "Brand Contradictions",       tagline: "Where your brand says one thing and does another.",    category: "diagnostics", route: "/brand-contradictions",  tierAccess: "signal",     priceCents: null, priceId: null },
  { id: "friction-audit",       name: "Friction Audit",             tagline: "Every buyer step that quietly costs you deals.",       category: "diagnostics", route: "/friction-audit",        tierAccess: "signal",     priceCents: null, priceId: null },
  { id: "strategic-questions",  name: "Strategic Questions",        tagline: "AI-generated boardroom questions you're avoiding.",    category: "diagnostics", route: "/strategic-questions",   tierAccess: "revenue",    priceCents: null, priceId: null },
  { id: "detective-mode",       name: "Detective Mode",             tagline: "Deep forensic sweep on a single business surface.",    category: "diagnostics", route: "/detective",             tierAccess: "suite",      priceCents: null, priceId: null },
  { id: "forensic-scan-all",    name: "Forensic Scan (All)",        tagline: "Runs every diagnostic in one shot.",                   category: "diagnostics", route: "/try/forensic-scan-all", tierAccess: "suite",      priceCents: null, priceId: null },

  // ── Reports ────────────────────────────────────────────────────────────
  { id: "ai-checklist",         name: "AI Readiness Checklist",     tagline: "Score a business on AI-readiness in one pass.",        category: "reports",     route: "/ai-checklist",          tierAccess: "diagnostic", priceCents: null, priceId: null },
  { id: "golden-report",        name: "Golden Report",              tagline: "The synthesis case file. Only ever produced inside the 21-Day Diagnostic.", category: "reports", route: "/golden-report", tierAccess: "diagnostic", priceCents: null, priceId: null, internalOnly: true },
  { id: "head-to-head",         name: "Head-to-Head Report",        tagline: "Side-by-side competitor comparison, evidence-backed.", category: "reports",     route: "/head-to-head",          tierAccess: "suite",      priceCents: null, priceId: null, internalOnly: true },
  { id: "resume-forensics",     name: "Resume Forensics",           tagline: "Rewrites resumes to beat ATS filters.",                category: "reports",     route: "/resume-forensics",      tierAccess: "diagnostic", priceCents: null, priceId: null, internalOnly: true },
  { id: "reciprocation",        name: "Reciprocation Gift",         tagline: "Free custom door-opener report.",                      category: "reports",     route: "/reciprocation",         tierAccess: "diagnostic", priceCents: null, priceId: null, internalOnly: true },
  { id: "nexus-iq",             name: "Prospect Intel · Nexus IQ",  tagline: "Full pre-meeting dossier on any target company.",      category: "reports",     route: "/nexus-iq",              tierAccess: "diagnostic", priceCents: null, priceId: null, internalOnly: true },

  // ── Sales enablement ───────────────────────────────────────────────────
  { id: "sales-scripts",        name: "Sales Scripts",              tagline: "Cold, warm, and follow-up scripts.",                   category: "sales",       route: "/sales-scripts",         tierAccess: "revenue",    priceCents: null, priceId: null, internalOnly: true },
  { id: "follow-up-plan",       name: "Follow-Up Sequences",        tagline: "Post-meeting email plays.",                            category: "sales",       route: "/follow-up-plan",        tierAccess: "revenue",    priceCents: null, priceId: null, internalOnly: true },
  { id: "linkedin-playbook",    name: "LinkedIn Playbook",          tagline: "Profile-to-lead-machine system.",                      category: "sales",       route: "/playbook/linkedin",     tierAccess: "diagnostic", priceCents: null, priceId: null, internalOnly: true },

  // ── Content engine ─────────────────────────────────────────────────────
  { id: "all-in-one",           name: "All-In-One Content",         tagline: "Blog + social + email from one prompt.",               category: "content",     route: "/try/all-in-one",        tierAccess: "suite",      priceCents: null, priceId: null, internalOnly: true },
  { id: "content-calendar",     name: "Content Calendar Builder",   tagline: "30 days of aligned content.",                          category: "content",     route: "/content-calendar",      tierAccess: "revenue",    priceCents: null, priceId: null, internalOnly: true },
  { id: "playbook-generator",   name: "Playbook Generator",         tagline: "Custom operating playbooks.",                          category: "content",     route: "/try/playbook-generator",tierAccess: "diagnostic", priceCents: null, priceId: null, internalOnly: true },
  { id: "social-content",       name: "Social Content Studio",      tagline: "Voice-locked social posts.",                           category: "content",     route: "/try/social-content",    tierAccess: "suite",      priceCents: null, priceId: null, internalOnly: true },
  { id: "content-engine",       name: "Content Engine",             tagline: "Long-form + short-form pipeline.",                     category: "content",     route: "/try/content-engine",    tierAccess: "suite",      priceCents: null, priceId: null, internalOnly: true },
  { id: "image-studio",         name: "Image Studio",               tagline: "On-brand imagery + watermarks.",                       category: "content",     route: "/try/image-studio",      tierAccess: "suite",      priceCents: null, priceId: null, internalOnly: true },
  { id: "creation-studio",      name: "Creation Studio",            tagline: "Mixed-media asset generator.",                         category: "content",     route: "/try/creation-studio",   tierAccess: "diagnostic", priceCents: null, priceId: null, internalOnly: true },
  { id: "easy-mode",            name: "Easy Mode",                  tagline: "Plain-English paste-ready copy.",                      category: "content",     route: "/try/easy-mode",         tierAccess: "suite",      priceCents: null, priceId: null, internalOnly: true },
  { id: "tool-generator",       name: "Tool Generator",             tagline: "Build a mini-tool from a brief.",                      category: "content",     route: "/try/tool-generator",    tierAccess: "diagnostic", priceCents: null, priceId: null, internalOnly: true },
];

/**
 * @deprecated Legacy plan key retained so old call sites still type-check.
 * No retail plan exists in the tier model.
 */
export type ShopPlan = "single" | "triple" | "unlimited";

export const FREE_RUNS_PER_TOOL = 3;

export function findTool(id: string) {
  return SHOP_TOOLS.find(t => t.id === id);
}

/** Tools visible on public browsing surfaces. */
export function publicShopTools(): ShopTool[] {
  return SHOP_TOOLS.filter(t => !t.internalOnly);
}

/** @deprecated Nothing is sold standalone. Returns the public browse set. */
export function sellableShopTools(): ShopTool[] {
  return publicShopTools();
}

/**
 * Tier badge for a tool card, e.g. "Included in Operator Suite".
 * Replaces the old per-tool price label everywhere.
 */
export function formatToolPrice(tool: ShopTool | undefined): string {
  if (!tool) return "";
  return tierBadgeForTool(tool.id);
}

/** Short tier label for tight layouts. */
export function toolTier(tool: ShopTool | undefined) {
  return tool ? tierForTool(tool.id) : "diagnostic";
}
