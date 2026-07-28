// ═══════════════════════════════════════════════════════════════════════════
// GOLDEN REPORT COMPILER — universal evidence ledger, root-cause/pricing ledger,
// deterministic number injection, and the hard validation gate.
//
// One implementation, two runtimes:
//   • Deno edge functions  → import "../_shared/golden-compiler.ts"
//   • Browser / Vite app   → src/lib/goldenCompiler.ts re-exports this file
//
// Contract this file enforces (the honest one — NOT "100% accurate"):
//   every statement presented as fact is traceable to a suitable source;
//   anything not verified is explicitly labelled inferred or unverified;
//   contradictions and internal inconsistencies BLOCK completion.
//
// Universal by construction: no company, url, account, rep or scan-id branch.
// ═══════════════════════════════════════════════════════════════════════════

import {
  computeGoldenLeakage,
  parseMoney,
  type GoldenLeakage,
  type GoldenReportLike,
  type PricedLeak,
} from "./golden-leakage.ts";
import {
  detectGenericReport,
  GENERIC_DETECTOR_VERSION,
  REGENERATION_REQUIRED_MESSAGE,
  type GenericVerdict,
  type GoldenReportState,
} from "./golden-generic-detector.ts";

export const COMPILER_VERSION = 2;
export const PRICING_MODEL_VERSION = 1;


/** Hard caps so a ledger can never bloat a report row. */
const MAX_CLAIMS = 160;
const MAX_TEXT = 600;
const MAX_RAW_VALUE = 300;

// ───────────────────────────── types ─────────────────────────────

export type ClaimStatus = "verified" | "inferred" | "unverified" | "contradicted";

export type SourceKind =
  | "raw_html"
  | "rendered_dom"
  | "browser_test"
  | "structured_api"
  | "markdown"
  | "database"
  | "user_input";

export type ClaimCategory =
  | "schema"
  | "contact_info"
  | "proof"
  | "cta"
  | "lead_capture"
  | "mobile_layout"
  | "form_behavior"
  | "performance"
  | "content"
  | "seo"
  | "owner_capacity"
  | "other";

export type EvidenceClaim = {
  claim_id: string;
  category: ClaimCategory;
  statement: string;
  normalized_fact: string;
  status: ClaimStatus;
  confidence: number;
  source_kind: SourceKind;
  source_url: string;
  source_locator: string;
  observed_at: string;
  raw_value: string;
  normalized_value: string;
  verification_method: string;
  limitations: string;
};

export type CompiledFinding = {
  finding_id: string;
  chapter_slug: string;
  statement: string;
  category: ClaimCategory;
  claim_ids: string[];
  root_cause_id: string;
  status: ClaimStatus;
};

export type CompiledRootCause = {
  root_cause_id: string;
  semantic_key: string;
  label: string;
  chapter_slugs: string[];
  evidence_ids: string[];
  priced: boolean;
  not_priced_reason?: string;
};

export type CompiledPricedLeak = {
  root_cause_id: string;
  name: string;
  chapter_slug: string;
  annual_low: number;
  annual_high: number;
  currency: "USD";
  pricing_model_version: number;
  assumptions: string;
  confidence: number;
  evidence_ids: string[];
};

export type ReportConsistency = {
  detected_findings: number;
  verified_findings: number;
  inferred_or_unverified_findings: number;
  contradicted_findings: number;
  unique_root_causes: number;
  uniquely_priced_leaks: number;
  unpriced_root_causes: number;
  canonical_range_ascii: string;
  canonical_range_display: string;
  canonical_counts_sentence: string;
  compiler_version: number;
  pricing_model_version: number;
  compiled_at: string;
  site_type: SiteType;
  evidence_quality: {
    verified: number;
    inferred: number;
    unverified: number;
    contradicted: number;
    total: number;
    verified_pct: number;
    inferred_pct: number;
    unverified_pct: number;
    contradicted_pct: number;
  };
};

export type CompilerViolationCode =
  | "total_mismatch"
  | "count_mismatch"
  | "duplicate_pricing"
  | "unsupported_negative_claim"
  | "contradicted_claim_presented_as_fact"
  | "unverified_claim_written_as_fact"
  | "unsuitable_source"
  | "recommendation_not_applicable"
  | "unsupported_quantified_claim"
  | "truncated_source_used_as_fact"
  | "currency_inconsistent"
  | "invalid_range"
  | "no_canonical_total";

export type CompilerViolation = {
  code: CompilerViolationCode;
  location: string;
  detail: string;
  excerpt?: string;
};

export type SiteType =
  | "saas"
  | "ecommerce"
  | "local_service"
  | "enterprise"
  | "nonprofit"
  | "professional_service"
  | "unknown";

export type CompiledGoldenReport = {
  ok: boolean;
  state: "compiled" | "needs_review";
  report: GoldenReportLike & Record<string, unknown>;
  leakage: GoldenLeakage | null;
  evidence_ledger: EvidenceClaim[];
  findings: CompiledFinding[];
  root_causes: CompiledRootCause[];
  priced_leaks: CompiledPricedLeak[];
  consistency: ReportConsistency;
  violations: CompilerViolation[];
  repairs: string[];
  /** Prose the deterministic repair pass could not fix; a cheap repair call may. */
  repairable_prose: boolean;
};

// ───────────────────── source inventory + suitability ─────────────────────

export type SourceState = {
  available: boolean;
  truncated: boolean;
  failed: boolean;
  notes: string[];
};

export type SourceInventory = Record<SourceKind, SourceState>;

const emptyState = (): SourceState => ({ available: false, truncated: false, failed: false, notes: [] });

function newInventory(): SourceInventory {
  return {
    raw_html: emptyState(),
    rendered_dom: emptyState(),
    browser_test: emptyState(),
    structured_api: emptyState(),
    markdown: emptyState(),
    database: emptyState(),
    user_input: emptyState(),
  };
}

const HTML_KEYS = /^(html|raw_html|page_html|source_html)$/i;
const DOM_KEYS = /^(rendered_html|dom|rendered_dom|serialized_dom)$/i;
const BROWSER_KEYS = /^(browser_test|viewport_test|lighthouse|playwright|puppeteer)$/i;
const MARKDOWN_KEYS = /^(markdown|md|content_markdown)$/i;

/**
 * Walks raw scan findings and records WHICH kinds of source actually landed,
 * and whether each was truncated or failed. Absence of a source kind is the
 * whole point: it is what stops a markdown-only crawl from "proving" absence.
 */
export function buildSourceInventory(rawFindings: unknown): SourceInventory {
  const inv = newInventory();
  const seen = new Set<unknown>();

  const visit = (node: unknown, path: string, depth: number) => {
    if (!node || depth > 6) return;
    if (typeof node === "object") {
      if (seen.has(node)) return;
      seen.add(node);
    }
    if (Array.isArray(node)) {
      node.slice(0, 40).forEach((v, i) => visit(v, `${path}[${i}]`, depth + 1));
      return;
    }
    if (typeof node !== "object") return;
    const obj = node as Record<string, unknown>;

    for (const [k, v] of Object.entries(obj)) {
      const here = path ? `${path}.${k}` : k;
      const str = typeof v === "string" ? v : "";

      if (HTML_KEYS.test(k) && str.length > 200) {
        inv.raw_html.available = true;
        inv.raw_html.notes.push(here);
      } else if (DOM_KEYS.test(k) && str.length > 200) {
        inv.rendered_dom.available = true;
        inv.rendered_dom.notes.push(here);
      } else if (BROWSER_KEYS.test(k) && v) {
        inv.browser_test.available = true;
        inv.browser_test.notes.push(here);
      } else if (MARKDOWN_KEYS.test(k) && str.length > 40) {
        inv.markdown.available = true;
        inv.markdown.notes.push(here);
        if (/\[truncated\]|\.\.\.$|…$/.test(str.trim())) inv.markdown.truncated = true;
      }

      if (k === "truncated" && v === true) {
        inv.markdown.truncated = true;
        inv.markdown.notes.push(`${here}=true`);
      }
      if (k === "error" && str) {
        // A failure only disqualifies the source kind that failed. An unrelated
        // tool timing out must not downgrade an otherwise good crawl.
        const kind: SourceKind | null = /scan[-_]?website|audit|lighthouse|pagespeed/i.test(path)
          ? "structured_api"
          : /firecrawl|crawl|scrape|fetch|markdown/i.test(path)
            ? "markdown"
            : null;
        if (kind) {
          inv[kind].failed = true;
          inv[kind].notes.push(`${here}: ${str.slice(0, 120)}`);
          if (/timed? ?out|did not finish|timeout|abort/i.test(str)) inv[kind].truncated = true;
        }
      }
      if (/^(gaps|issues|scores?|score|metrics)$/i.test(k) && v && !inv.structured_api.failed) {
        inv.structured_api.available = true;
        inv.structured_api.notes.push(here);
      }

      visit(v, here, depth + 1);
    }
  };

  visit(rawFindings, "", 0);
  return inv;
}

/**
 * Which source kinds can VERIFY a claim in each category. Anything else can, at
 * most, produce an `inferred` claim — and a failed/truncated source can only
 * produce `unverified`.
 */
export const SOURCE_SUITABILITY: Record<ClaimCategory, SourceKind[]> = {
  // Structured data lives in markup, not in Firecrawl markdown.
  schema: ["raw_html", "rendered_dom"],
  contact_info: ["raw_html", "rendered_dom"],
  proof: ["raw_html", "rendered_dom"],
  cta: ["raw_html", "rendered_dom"],
  lead_capture: ["raw_html", "rendered_dom"],
  // Layout and form behaviour require an actual browser.
  mobile_layout: ["browser_test"],
  form_behavior: ["browser_test"],
  // Performance requires measured values from a measuring tool.
  performance: ["browser_test", "structured_api"],
  content: ["raw_html", "rendered_dom", "markdown"],
  seo: ["raw_html", "rendered_dom", "structured_api"],
  // Public sites cannot evidence owner/decision-maker/capacity facts.
  owner_capacity: ["database", "user_input"],
  // Uncategorized statements have no matching verification method, so they are
  // never auto-verified; inferred is the best available grade.
  other: [],
};

/** Grades one observation against the sources that actually landed. */
export function gradeClaim(
  category: ClaimCategory,
  inv: SourceInventory,
): { status: ClaimStatus; source_kind: SourceKind; confidence: number; limitations: string } {
  const suitable = SOURCE_SUITABILITY[category] || [];
  for (const kind of suitable) {
    const st = inv[kind];
    if (st?.available && !st.failed && !st.truncated) {
      return { status: "verified", source_kind: kind, confidence: 0.9, limitations: "" };
    }
    if (st?.available && (st.failed || st.truncated)) {
      return {
        status: "unverified",
        source_kind: kind,
        confidence: 0.2,
        limitations: `The ${kind.replace(/_/g, " ")} source for this check was truncated or failed, so absence cannot be treated as fact.`,
      };
    }
  }
  // Fall back to whatever DID land — that can only support an inference.
  const fallback: SourceKind[] = ["markdown", "structured_api", "raw_html", "rendered_dom"];
  for (const kind of fallback) {
    const st = inv[kind];
    if (st?.available && !st.failed && !st.truncated) {
      return {
        status: "inferred",
        source_kind: kind,
        confidence: 0.5,
        limitations: `Derived from ${kind.replace(/_/g, " ")}, which is not a suitable source to verify a ${category.replace(/_/g, " ")} conclusion. Absence here is not proof of absence.`,
      };
    }
  }
  return {
    status: "unverified",
    source_kind: "markdown",
    confidence: 0.1,
    limitations: "No source suitable for this conclusion was successfully collected in this pass.",
  };
}

// ───────────────────── PII / secret scrubbing + bounding ─────────────────────

const SECRET_RE =
  /\b(?:sk|pk|rk|api[-_ ]?key|apikey|access[-_ ]?token|token|bearer|secret|password|passwd|cookie|authorization)\b\s*[:=]?\s*['"]?[A-Za-z0-9_\-]{12,}/gi;
const JWT_RE = /\beyJ[A-Za-z0-9_\-]{4,}\.[A-Za-z0-9_\-]{4,}\.[A-Za-z0-9_\-]{4,}/g;
const EMAIL_RE = /\b[\w.+-]+@[\w-]+\.[\w.-]+\b/g;

/** Never let secrets, tokens, private emails or unbounded blobs into the ledger. */
export function scrubValue(v: unknown, max = MAX_RAW_VALUE): string {
  let s = typeof v === "string" ? v : v == null ? "" : JSON.stringify(v);
  s = s.replace(JWT_RE, "[redacted-token]");
  s = s.replace(SECRET_RE, "[redacted-secret]");
  s = s.replace(EMAIL_RE, "[redacted-email]");
  s = s.replace(/\s+/g, " ").trim();
  return s.length > max ? `${s.slice(0, max - 1)}…` : s;
}

/** Strips query strings and fragments so no session/PII rides along in the ledger. */
export function scrubUrl(u: unknown): string {
  const raw = String(u ?? "").trim();
  if (!raw) return "";
  try {
    const parsed = new URL(raw);
    parsed.search = "";
    parsed.hash = "";
    return parsed.toString();
  } catch {
    return scrubValue(raw.split("?")[0], 200);
  }
}

// ───────────────────── semantic root-cause clustering ─────────────────────

/**
 * Semantic clusters. "missing proof", "no quantified case studies" and
 * "authority proof is weak" collapse to ONE root cause, so they can never be
 * priced three times.
 */
const SEMANTIC_CLUSTERS: Array<{ key: string; label: string; category: ClaimCategory; re: RegExp }> = [
  { key: "lead_magnet", label: "No mid-funnel capture asset", category: "lead_capture", re: /\b(lead magnet|mid[-\s]funnel|checklist|calculator|buyer guide|gated asset|download\w*|newsletter capture)\b/i },
  { key: "schema", label: "Structured data is missing or incomplete", category: "schema", re: /\b(schema|json[-\s]?ld|structured data|rich results?|microdata|rdfa)\b/i },
  { key: "proof", label: "Proof and social validation are missing", category: "proof", re: /\b(proof|case stud\w*|testimonial\w*|social validation|authority|credibilit\w*|reviews?|logos?|quantified outcomes?)\b/i },
  { key: "form", label: "Form path is unproven", category: "form_behavior", re: /\b(form|submission|submit button|field validation|thank[-\s]?you page)\b/i },
  { key: "speed", label: "Page performance drag", category: "performance", re: /\b(load time|page speed|performance|lcp|first (?:contentful|meaningful) paint|core web vitals|ttfb)\b/i },
  { key: "mobile", label: "Mobile experience is unverified", category: "mobile_layout", re: /\b(mobile|responsive|viewport|tap target|small screen)\b/i },
  { key: "seo_meta", label: "Search snippet and metadata gaps", category: "seo", re: /\b(meta description|title tag|search snippet|canonical|sitemap|robots\.txt|indexation)\b/i },
  { key: "cta", label: "Call-to-action hierarchy is diluted", category: "cta", re: /\b(cta|call[-\s]to[-\s]action|button hierarch\w*|competing (?:cta|action)|next step|primary action)\b/i },
  { key: "contact_redundancy", label: "Contact paths are buried or inconsistent", category: "contact_info", re: /\b(phone|telephone|email address|contact (?:option|detail|info|redundanc)\w*|tap[-\s]to[-\s]call|reachab\w*)\b/i },
  { key: "follow_up", label: "Follow-up and response speed gaps", category: "other", re: /\b(follow[-\s]?up|response time|nurture|drip|reply|speed[-\s]to[-\s]lead)\b/i },
  { key: "owner_capacity", label: "Owner and capacity signals are unknown", category: "owner_capacity", re: /\b(owner|founder|decision[-\s]maker|headcount|capacity|staff|team size)\b/i },
  { key: "content_depth", label: "Content depth and clarity gaps", category: "content", re: /\b(content|copy|messaging|value proposition|headline|clarity|positioning)\b/i },
];

/**
 * Semantic (not exact-string) key for a finding/leak. Two differently-worded
 * descriptions of the same business problem return the same key.
 */
export function semanticRootCauseKey(text: string): { key: string; label: string; category: ClaimCategory } {
  const t = String(text || "");
  for (const c of SEMANTIC_CLUSTERS) {
    if (c.re.test(t)) return { key: c.key, label: c.label, category: c.category };
  }
  const norm = t.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "").slice(0, 40);
  return { key: norm || "unclassified", label: t.slice(0, 80) || "Unclassified finding", category: "other" };
}

// ───────────────────── site-type classification ─────────────────────

const SITE_SIGNALS: Array<{ type: SiteType; re: RegExp; weight: number }> = [
  { type: "saas", re: /\b(saas|software|platform|app|api|subscription|free trial|pricing per user|erp|crm|cloud)\b/gi, weight: 1 },
  { type: "ecommerce", re: /\b(add to cart|checkout|shopping cart|product catalog|shipping|sku|storefront)\b/gi, weight: 1 },
  { type: "local_service", re: /\b(service area|we serve|call now|same[-\s]day|licensed and insured|nearby|local business|our (?:crew|technicians))\b/gi, weight: 1 },
  { type: "enterprise", re: /\b(enterprise|fortune 500|global (?:offices|operations)|investor relations|annual report|nyse|nasdaq)\b/gi, weight: 1 },
  { type: "nonprofit", re: /\b(nonprofit|non[-\s]profit|donate|501\(c\)|charit\w+|volunteer)\b/gi, weight: 1 },
  { type: "professional_service", re: /\b(cpa|attorney|law firm|accounting|advisory|consultanc\w+|wealth management)\b/gi, weight: 1 },
];

/** Deterministic company/site classification from report + crawl text. */
export function classifySiteType(sample: string): SiteType {
  const text = String(sample || "").slice(0, 60_000);
  let best: SiteType = "unknown";
  let bestScore = 0;
  for (const s of SITE_SIGNALS) {
    const n = (text.match(s.re) || []).length * s.weight;
    if (n > bestScore) {
      bestScore = n;
      best = s.type;
    }
  }
  return bestScore >= 2 ? best : "unknown";
}

/** Local-business tactics that must not be recommended to non-local companies. */
const LOCAL_ONLY_TACTIC =
  /\b(localbusiness\b|local ?business schema|service[-\s]area pages?|city\s*(?:\/|\+|and)?\s*service (?:matrix|pages?)|city[-\s]landing pages?|owner (?:line|name) in the footer|sticky (?:tap[-\s]to[-\s]call|call bar|phone bar)|tap[-\s]to[-\s]call|google business profile|near me pages?)\b/i;

const LOCAL_TYPES: SiteType[] = ["local_service", "professional_service"];

export function isRecommendationApplicable(text: string, siteType: SiteType): boolean {
  if (!LOCAL_ONLY_TACTIC.test(String(text || ""))) return true;
  return LOCAL_TYPES.includes(siteType);
}

// ───────────────────── truthfulness language rules ─────────────────────

/** Absolute negatives that require verified evidence from a suitable source. */
export const ABSOLUTE_NEGATIVE_RE =
  /\b(has no|have no|has zero|there (?:is|are) no|does not have|doesn'?t have|do not have|don'?t have|missing entirely|records no|offers no mechanism|offers no|shows no|contains no|lacks any|entirely absent|completely absent|no case studies|no testimonials|no phone|no email|no schema|no structured data)\b/gi;

/** Wording that is honest about an incomplete crawl. */
export const LIMITED_NEGATIVE_PHRASE = "was not detected in the pages successfully crawled";

const NEGATIVE_REWRITES: Array<[RegExp, string]> = [
  [/\bhas no\b/gi, "showed no"],
  [/\bhave no\b/gi, "showed no"],
  [/\bhas zero\b/gi, "showed no"],
  [/\bthere (?:is|are) no\b/gi, "the crawl did not detect"],
  [/\bdoes not have\b/gi, "did not surface"],
  [/\bdoesn'?t have\b/gi, "did not surface"],
  [/\bdo not have\b/gi, "did not surface"],
  [/\bdon'?t have\b/gi, "did not surface"],
  [/\bmissing entirely\b/gi, "not detected in the pages successfully crawled"],
  [/\bentirely absent\b/gi, "not detected in the pages successfully crawled"],
  [/\bcompletely absent\b/gi, "not detected in the pages successfully crawled"],
  [/\brecords no\b/gi, "did not record"],
  [/\boffers no mechanism\b/gi, "did not surface a mechanism"],
  [/\boffers no\b/gi, "did not surface"],
  [/\bshows no\b/gi, "did not surface"],
  [/\bcontains no\b/gi, "did not surface"],
  [/\blacks any\b/gi, "did not surface"],
  // Each rewrite consumes the trailing noun and refuses to fire twice, so
  // recompiling an already-softened report is a no-op.
  [/\bno case studies\b(?!\s+detected)/gi, "no case studies detected in the pages successfully crawled"],
  [/\bno testimonials\b(?!\s+detected)/gi, "no testimonials detected in the pages successfully crawled"],
  [/\bno phone(?:\s+number)?\b(?!\s+detected)/gi, "no phone number detected on the pages successfully crawled"],
  [/\bno email(?:\s+address)?\b(?!\s+detected)/gi, "no email address detected on the pages successfully crawled"],
  [/\bno schema(?:\s+markup)?\b(?!\s+detected)/gi, "no schema markup detected in the source reviewed"],
  [/\bno structured data\b(?!\s+detected)/gi, "no structured data detected in the source reviewed"],
];

/** Mechanically converts unsupported certainty into honest, limited wording. */
export function softenNegativeProse(text: string): string {
  let out = String(text || "");
  for (const [re, sub] of NEGATIVE_REWRITES) out = out.replace(re, sub);
  // collapse accidental double qualifiers produced by chained rewrites
  out = out.replace(/detected in the pages successfully crawled(,? (?:and )?)?detected in the pages successfully crawled/gi, "detected in the pages successfully crawled");
  return out;
}

/** Disclosed modelling assumptions are legitimate; unlabelled promises are not. */
const ASSUMPTION_CONTEXT_RE =
  /\b(?:assum\w+|baseline|industry[-\s]average|benchmark\w*|conservativ\w+|estimat\w+|typical|illustrative|modell?ed|using|at an?|hypothetical)\b/i;

/** Marker the repair pass appends so a claim reads as a model, not a promise. */
export const ILLUSTRATIVE_MARKER = " (illustrative assumption, not a measured result)";

/** Quantified performance/ROI promises that need measured evidence. */
export const UNSUPPORTED_QUANTIFIED_RE =
  /\b(?:\d{1,3}(?:\.\d+)?\s?%\s?(?:lift|increase|improvement|more|higher|better|conversion|uplift)|\d+(?:\.\d+)?x\s?(?:more|higher|return|roi|conversion)|roi of \d|payback in \d|within \d+ (?:hours?|minutes?) response)/gi;

/**
 * A money range is only treated as THE report total when the surrounding text
 * claims report-wide scope. Chapter subtotals ("the combined SEO gaps are
 * priced at ...") are left exactly as written — rewriting them to the whole
 * report total would itself be an accuracy defect.
 */
const TOTAL_CONTEXT_RE =
  /\b(?:total (?:annual |estimated |combined )*(?:revenue )?(?:loss|exposure|leakage)|annual revenue (?:loss|exposure)|total estimated annual revenue loss|overall (?:annual )?(?:exposure|leakage|loss)|report[-\s]wide|across (?:the )?(?:report|site|business|company|organization|entire funnel|all chapters)|adds up to|sums? to|in total)\b/i;

/** Subset language that proves a range is NOT the report total. */
const SUBSET_SCOPE_RE =
  /\b(?:combined \w+|these|this (?:chapter|section|gap|leak|issue|single)|each|alone|another|per (?:leak|chapter|page))\b/i;

/** Wording that already limits an absence statement to what was actually crawled. */
export const SCOPE_QUALIFIER_RE =
  /\b(?:detected (?:in|on) the (?:pages successfully crawled|source reviewed)|number detected|address detected|markup detected|in the pages successfully crawled)\b/i;

const COUNT_RE =
  /\b(\d{1,3})\s+(?:distinct\s+|separate\s+|unique\s+|total\s+)?(gaps?|leaks?|findings?|issues?|problems?|root causes?)\b/gi;

const MONEY_RANGE_RE =
  /\$\s?[\d,]+(?:\.\d+)?\s*[kKmM]?\s*(?:-|–|—|to)\s*\$?\s?[\d,]+(?:\.\d+)?\s*[kKmM]?/g;

/** Periodized figures are annualized before comparison to the canonical total. */
const PERIOD_RE = /^[\s,]*(?:\/|per\s+|a\s+|each\s+)?(month|mo|quarter|qtr|week|wk|day|year|yr|annually|monthly|quarterly|weekly|daily|yearly)\b/i;
const PERIOD_FACTOR: Record<string, number> = {
  month: 12, mo: 12, monthly: 12,
  quarter: 4, qtr: 4, quarterly: 4,
  week: 52, wk: 52, weekly: 52,
  day: 365, daily: 365,
  year: 1, yr: 1, yearly: 1, annually: 1,
};
function periodFactor(after: string): number {
  const m = after.match(PERIOD_RE);
  return m ? (PERIOD_FACTOR[m[1].toLowerCase()] ?? 1) : 1;
}

const NON_USD_RE = /(€|£|¥|₹|\b(?:EUR|GBP|JPY|CAD|AUD|INR)\b)/g;

// ───────────────────── ledger + root cause construction ─────────────────────

/**
 * Prose we authored, and therefore lint. Quoted `evidence` values are raw
 * observations copied from the target (a euro price on the target site is a
 * fact about them, not a currency error in our report), so they are excluded.
 */
function chapterText(ch: Record<string, unknown>): string {
  return [ch?.verdict, ch?.what_we_found, ch?.why_its_leaking, ch?.what_its_costing]
    .map((v) => (typeof v === "string" ? v : ""))
    .join("\n");
}

function collectGaps(rawFindings: unknown): Array<Record<string, unknown>> {
  const out: Array<Record<string, unknown>> = [];
  const seen = new Set<unknown>();
  const visit = (node: unknown, depth: number) => {
    if (!node || typeof node !== "object" || depth > 5) return;
    if (seen.has(node)) return;
    seen.add(node);
    if (Array.isArray(node)) {
      node.slice(0, 60).forEach((v) => visit(v, depth + 1));
      return;
    }
    for (const [k, v] of Object.entries(node as Record<string, unknown>)) {
      if (/^(gaps|issues|findings)$/i.test(k) && Array.isArray(v)) {
        for (const g of v.slice(0, 60)) if (g && typeof g === "object") out.push(g as Record<string, unknown>);
      }
      visit(v, depth + 1);
    }
  };
  visit(rawFindings, 0);
  return out;
}

// ───────────────────── the compiler ─────────────────────

export type CompileInput = {
  report: GoldenReportLike & Record<string, unknown>;
  rawFindings?: unknown;
  url?: string;
  company?: string;
  /** Skip deterministic prose repair (used by validation-only callers). */
  repair?: boolean;
};

/**
 * Compiles a Golden Report into a single object that the website, portal,
 * pre-download summary and every PDF entry point consume verbatim.
 * No consumer may recompute totals, counts or evidence status.
 */
export function compileGoldenReport(input: CompileInput): CompiledGoldenReport {
  const repair = input.repair !== false;
  const src = input.report || ({} as GoldenReportLike);
  // Deep-ish clone so repairs never mutate the caller's object.
  const report: GoldenReportLike & Record<string, unknown> = JSON.parse(JSON.stringify(src ?? {}));
  const rawFindings = input.rawFindings ?? null;
  const observedAt = new Date().toISOString();
  const baseUrl = scrubUrl(input.url || "");

  const inv = buildSourceInventory(rawFindings);
  const chapters = (report.chapters || []) as Array<Record<string, unknown>>;

  const siteType = classifySiteType(
    [
      input.company || "",
      baseUrl,
      String(report.executive_summary || ""),
      chapters.map(chapterText).join("\n"),
      typeof rawFindings === "string" ? rawFindings : JSON.stringify(rawFindings ?? "").slice(0, 40_000),
    ].join("\n"),
  );

  // ── 1. evidence ledger ────────────────────────────────────────────────
  const ledger: EvidenceClaim[] = [];
  const claimByKey = new Map<string, EvidenceClaim>();
  const pushClaim = (
    category: ClaimCategory,
    statement: string,
    locator: string,
    rawValue: unknown,
    method: string,
  ): EvidenceClaim => {
    const normalized = statement.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim().slice(0, 160);
    const existing = claimByKey.get(normalized);
    const graded = gradeClaim(category, inv);
    if (existing) {
      // Conflicting observations of the same normalized fact are contradicted,
      // never "whichever arrived last".
      const newVal = scrubValue(rawValue);
      if (existing.raw_value && newVal && existing.raw_value !== newVal) {
        existing.status = "contradicted";
        existing.confidence = Math.min(existing.confidence, 0.25);
        existing.limitations =
          `Conflicting observations recorded for this fact (${scrubValue(existing.raw_value, 80)} vs ${scrubValue(newVal, 80)}).`;
      }
      return existing;
    }
    const claim: EvidenceClaim = {
      claim_id: `clm_${(ledger.length + 1).toString().padStart(3, "0")}`,
      category,
      statement: scrubValue(statement, MAX_TEXT),
      normalized_fact: normalized,
      status: graded.status,
      confidence: graded.confidence,
      source_kind: graded.source_kind,
      source_url: baseUrl,
      source_locator: scrubValue(locator, 160),
      observed_at: observedAt,
      raw_value: scrubValue(rawValue),
      normalized_value: scrubValue(rawValue, 120),
      verification_method: method,
      limitations: graded.limitations,
    };
    if (ledger.length < MAX_CLAIMS) {
      ledger.push(claim);
      claimByKey.set(normalized, claim);
    }
    return claim;
  };

  // ── 2. findings from detectors + report leaks ─────────────────────────
  const findings: CompiledFinding[] = [];
  const rootCauses = new Map<string, CompiledRootCause>();

  const ensureRootCause = (key: string, label: string, chapterSlug: string, evidenceIds: string[]) => {
    const id = `rc_${key}`;
    const rc = rootCauses.get(id) || {
      root_cause_id: id,
      semantic_key: key,
      label,
      chapter_slugs: [],
      evidence_ids: [],
      priced: false,
    };
    if (chapterSlug && !rc.chapter_slugs.includes(chapterSlug)) rc.chapter_slugs.push(chapterSlug);
    for (const e of evidenceIds) if (!rc.evidence_ids.includes(e)) rc.evidence_ids.push(e);
    rootCauses.set(id, rc);
    return rc;
  };

  const addFinding = (statement: string, chapterSlug: string, locator: string, rawValue: unknown, method: string) => {
    const { key, label, category } = semanticRootCauseKey(statement);
    const claim = pushClaim(category, statement, locator, rawValue, method);
    const rc = ensureRootCause(key, label, chapterSlug, [claim.claim_id]);
    findings.push({
      finding_id: `fnd_${(findings.length + 1).toString().padStart(3, "0")}`,
      chapter_slug: chapterSlug,
      statement: scrubValue(statement, MAX_TEXT),
      category,
      claim_ids: [claim.claim_id],
      root_cause_id: rc.root_cause_id,
      status: claim.status,
    });
  };

  for (const g of collectGaps(rawFindings)) {
    const title = String(g.title || g.name || g.issue || "").trim();
    if (!title) continue;
    addFinding(
      title,
      String(g.chapter_slug || g.category || "").toLowerCase(),
      "detector.gaps[]",
      g.description ?? g.detail ?? g.evidence ?? "",
      "automated detector output",
    );
  }

  for (const leak of (report.top_leaks || []) as PricedLeak[]) {
    const name = String(leak?.name || "").trim();
    if (!name) continue;
    addFinding(
      `${name}. ${String(leak?.summary ?? "")}`.trim(),
      String(leak?.chapter_slug || "").toLowerCase(),
      "report.top_leaks[]",
      leak?.summary ?? "",
      "synthesis top_leaks entry",
    );
  }

  // ── 3. price each unique root cause at most once ──────────────────────
  const priced_leaks: CompiledPricedLeak[] = [];
  const pricedKeys = new Set<string>();
  const duplicatePricing: CompilerViolation[] = [];

  for (const leak of (report.top_leaks || []) as PricedLeak[]) {
    if (!leak || typeof leak !== "object") continue;
    const name = String(leak.name || leak.chapter_slug || "").trim();
    const { key, label, category } = semanticRootCauseKey(`${name} ${String(leak.summary ?? "")}`);
    const single = computeGoldenLeakage([leak]);
    const chapterSlug = String(leak.chapter_slug || "").toLowerCase();
    const rc = ensureRootCause(key, label || name, chapterSlug, []);

    if (!single) {
      rc.priced = false;
      rc.not_priced_reason =
        "No finite, positive, annualized USD value could be validated for this root cause.";
      continue;
    }
    if (pricedKeys.has(key)) {
      // Chapters may cross-reference the shared root cause, but it is never
      // priced twice. This is a repair, not a blocker, when we can drop it.
      duplicatePricing.push({
        code: "duplicate_pricing",
        location: `top_leaks:${name}`,
        detail: `Root cause ${key} is already priced; duplicate dollar row removed from the total.`,
      });
      continue;
    }
    const claim = pushClaim(category, `${name} is a priced root cause`, "report.top_leaks[]", leak.summary ?? "", "pricing model");
    pricedKeys.add(key);
    rc.priced = true;
    delete rc.not_priced_reason;
    if (!rc.evidence_ids.includes(claim.claim_id)) rc.evidence_ids.push(claim.claim_id);
    priced_leaks.push({
      root_cause_id: rc.root_cause_id,
      name: name || label,
      chapter_slug: chapterSlug,
      annual_low: Math.round(single.low),
      annual_high: Math.round(single.high),
      currency: "USD",
      pricing_model_version: PRICING_MODEL_VERSION,
      assumptions: scrubValue(leak.summary ?? "Annualized from the observed gap severity.", 240),
      confidence: claim.confidence,
      evidence_ids: rc.evidence_ids.slice(0, 8),
    });
  }

  for (const rc of rootCauses.values()) {
    if (!rc.priced && !rc.not_priced_reason) {
      rc.not_priced_reason = "Evidence is insufficient to price this root cause; reported as a finding only.";
    }
  }

  // ── 4. canonical totals, computed from unique priced leaks only ───────
  const canonicalLeaks: PricedLeak[] = priced_leaks.map((p) => ({
    name: p.root_cause_id,
    chapter_slug: p.chapter_slug,
    dollars_low: p.annual_low,
    dollars_high: p.annual_high,
  }));
  const leakage = canonicalLeaks.length
    ? computeGoldenLeakage(canonicalLeaks)
    : computeGoldenLeakage(report);

  if (leakage) {
    report.overall_leakage = {
      annual_low: Math.round(leakage.low),
      annual_high: Math.round(leakage.high),
      currency: "USD",
      source: canonicalLeaks.length ? "priced_leaks" : leakage.source,
      priced_leak_count: canonicalLeaks.length || leakage.count,
      calculation_version: leakage.calculation_version,
    };
  }

  const verifiedCount = findings.filter((f) => f.status === "verified").length;
  const contradictedCount = findings.filter((f) => f.status === "contradicted").length;
  const softCount = findings.length - verifiedCount - contradictedCount;
  const q = {
    verified: ledger.filter((c) => c.status === "verified").length,
    inferred: ledger.filter((c) => c.status === "inferred").length,
    unverified: ledger.filter((c) => c.status === "unverified").length,
    contradicted: ledger.filter((c) => c.status === "contradicted").length,
    total: ledger.length,
  };
  const pct = (n: number) => (q.total ? Math.round((n / q.total) * 100) : 0);

  const canonical_counts_sentence =
    `${findings.length} detected findings (${verifiedCount} verified, ${softCount} inferred or unverified) and ` +
    `${priced_leaks.length} uniquely priced leak${priced_leaks.length === 1 ? "" : "s"} across ${rootCauses.size} unique root cause${rootCauses.size === 1 ? "" : "s"}.`;

  const consistency: ReportConsistency = {
    detected_findings: findings.length,
    verified_findings: verifiedCount,
    inferred_or_unverified_findings: softCount,
    contradicted_findings: contradictedCount,
    unique_root_causes: rootCauses.size,
    uniquely_priced_leaks: priced_leaks.length,
    unpriced_root_causes: Array.from(rootCauses.values()).filter((r) => !r.priced).length,
    canonical_range_ascii: leakage?.rangeLabelAscii ?? "",
    canonical_range_display: leakage?.displayValue ?? "",
    canonical_counts_sentence,
    compiler_version: COMPILER_VERSION,
    pricing_model_version: PRICING_MODEL_VERSION,
    compiled_at: observedAt,
    site_type: siteType,
    evidence_quality: {
      ...q,
      verified_pct: pct(q.verified),
      inferred_pct: pct(q.inferred),
      unverified_pct: pct(q.unverified),
      contradicted_pct: pct(q.contradicted),
    },
  };

  // ── 5. deterministic prose repair ─────────────────────────────────────
  const repairs: string[] = [];
  if (repair) {
    const verifiedCategories = new Set(
      ledger.filter((c) => c.status === "verified").map((c) => c.category),
    );

    const fixText = (text: string, where: string): string => {
      if (!text) return text;
      let out = text;

      if (leakage) {
        // The period phrase is consumed together with the range so a total can
        // never keep a stale "per month" label after being rewritten to the
        // canonical ANNUAL figure.
        const totalRe = new RegExp(
          `(${MONEY_RANGE_RE.source})([\\s,]*(?:\\/|per\\s+|a\\s+|each\\s+)?(?:month|mo|quarter|qtr|week|wk|day|year|yr|annually|monthly|quarterly|weekly|daily|yearly)\\b)?`,
          "g",
        );
        out = out.replace(totalRe, (m, range: string, period: string | undefined, offset: number) => {
          const window = out.slice(Math.max(0, offset - 140), offset + m.length + 60);
          const before = out.slice(Math.max(0, offset - 80), offset);
          if (!TOTAL_CONTEXT_RE.test(window) || SUBSET_SCOPE_RE.test(before)) return m;
          const lo = parseMoney(range.split(/-|–|—|to/)[0]);
          const hi = parseMoney(range.split(/-|–|—|to/).slice(1).join(" "));
          if (lo == null || hi == null) return m;
          const f = periodFactor(period || "");
          const annual = `${leakage.rangeLabelAscii} per year`;
          if (Math.round(lo * f) === Math.round(leakage.low) && Math.round(hi * f) === Math.round(leakage.high)) {
            return m; // numbers already reconcile for the stated period
          }
          repairs.push(`${where}: replaced stale total ${range.trim()}${period ? period.trim() : ""} with canonical ${annual}`);
          return annual;
        });
      }

      out = out.replace(COUNT_RE, (m, n: string, noun: string) => {
        const num = Number(n);
        const isPriced = /leak/i.test(noun);
        const isRoot = /root cause/i.test(noun);
        const expected = isPriced
          ? priced_leaks.length
          : isRoot
            ? rootCauses.size
            : findings.length;
        const canonicalNoun = isPriced ? "uniquely priced leaks" : isRoot ? "unique root causes" : "detected findings";
        if (num === expected && new RegExp(canonicalNoun.split(" ")[0], "i").test(noun)) return m;
        repairs.push(`${where}: canonicalized count "${m.trim()}" -> "${expected} ${canonicalNoun}"`);
        return `${expected} ${canonicalNoun}`;
      });

      const beforeNeg = out;
      const SCOPE_NOTE =
        " Absence statements here reflect only the pages successfully crawled in this pass.";
      out = out.replace(ABSOLUTE_NEGATIVE_RE, (m, _g, offset: number) => {
        const window = out.slice(Math.max(0, offset - 120), offset + 160);
        const { category } = semanticRootCauseKey(window);
        if (verifiedCategories.has(category)) return m; // verified fact may stay absolute
        return softenNegativeProse(m);
      });
      if (out !== beforeNeg) {
        // A softened negative is a scope-limited statement, so the scope is
        // stated explicitly rather than left for the reader to infer.
        if (!out.includes(SCOPE_NOTE.trim())) out = `${out.trimEnd()}${SCOPE_NOTE}`;
        repairs.push(`${where}: softened unverified absolute negatives and stated crawl scope`);
      }

      // Quantified promises: keep the number, remove the promise. A figure the
      // scan never measured is labelled as an assumption rather than deleted.
      out = out.replace(new RegExp(UNSUPPORTED_QUANTIFIED_RE.source, "gi"), (m, offset: number) => {
        const before = out.slice(Math.max(0, offset - 70), offset);
        const after = out.slice(offset + m.length, offset + m.length + 70);
        if (ASSUMPTION_CONTEXT_RE.test(before) || after.startsWith(ILLUSTRATIVE_MARKER)) return m;
        repairs.push(`${where}: labelled unmeasured figure "${m.trim()}" as an assumption`);
        return `${m}${ILLUSTRATIVE_MARKER}`;
      });

      // Currency lock: USD only, everywhere.
      if (NON_USD_RE.test(out)) {
        out = out.replace(/€|£|¥|₹/g, "$").replace(/\b(?:EUR|GBP|JPY|CAD|AUD|INR)\b/g, "USD");
        repairs.push(`${where}: normalized non-USD currency markers to USD`);
      }
      return out;
    };

    report.executive_summary = fixText(String(report.executive_summary || ""), "executive_summary");

    for (const ch of chapters) {
      for (const field of ["verdict", "what_we_found", "why_its_leaking", "what_its_costing"]) {
        if (typeof ch[field] === "string") {
          ch[field] = fixText(ch[field] as string, `chapter:${String(ch.slug)}.${field}`);
        }
      }
      const wtd = ch.what_to_do as Record<string, unknown> | undefined;
      if (wtd && typeof wtd === "object") {
        for (const horizon of ["this_week", "this_month", "this_quarter"]) {
          const list = wtd[horizon];
          if (!Array.isArray(list)) continue;
          const kept = list
            .map((it) => (typeof it === "string" ? fixText(it, `chapter:${String(ch.slug)}.${horizon}`) : it))
            .filter((it) => {
              if (typeof it !== "string") return true;
              if (isRecommendationApplicable(it, siteType)) return true;
              repairs.push(`chapter:${String(ch.slug)}.${horizon}: removed recommendation not applicable to a ${siteType} company`);
              return false;
            });
          wtd[horizon] = kept;
        }
      }
    }
  }

  // ── 6. validation gate ────────────────────────────────────────────────
  const violations = validateCompiledReport({
    report,
    leakage,
    findings,
    root_causes: Array.from(rootCauses.values()),
    priced_leaks,
    ledger,
    consistency,
  });
  // Duplicates found during compilation were dropped from the total, so they are
  // recorded as repairs rather than blockers. A duplicate that SURVIVES into the
  // validated output is still fatal (see validateCompiledReport).
  for (const d of duplicatePricing) repairs.push(`${d.location}: ${d.detail}`);

  const blocking = violations;
  const ok = blocking.length === 0;

  report.report_consistency = consistency;
  report.evidence_ledger = ledger;
  report.compiled_findings = findings;
  report.root_causes = Array.from(rootCauses.values());
  report.priced_leaks = priced_leaks;
  report.compiler = {
    version: COMPILER_VERSION,
    state: ok ? "compiled" : "needs_review",
    compiled_at: observedAt,
    violations: violations.slice(0, 40),
    repairs: repairs.slice(0, 60),
  };

  return {
    ok,
    state: ok ? "compiled" : "needs_review",
    report,
    leakage,
    evidence_ledger: ledger,
    findings,
    root_causes: Array.from(rootCauses.values()),
    priced_leaks,
    consistency,
    violations,
    repairs,
    repairable_prose: !ok && blocking.every((v) =>
      ["total_mismatch", "count_mismatch", "unsupported_negative_claim", "unsupported_quantified_claim", "recommendation_not_applicable"].includes(v.code)
    ),
  };
}

// ───────────────────── the gate ─────────────────────

export function validateCompiledReport(args: {
  report: GoldenReportLike & Record<string, unknown>;
  leakage: GoldenLeakage | null;
  findings: CompiledFinding[];
  root_causes: CompiledRootCause[];
  priced_leaks: CompiledPricedLeak[];
  ledger: EvidenceClaim[];
  consistency: ReportConsistency;
}): CompilerViolation[] {
  const { report, leakage, priced_leaks, ledger, consistency } = args;
  const v: CompilerViolation[] = [];
  const chapters = (report.chapters || []) as Array<Record<string, unknown>>;

  // priced-leak sanity
  const byRoot = new Map<string, number>();
  for (const p of priced_leaks) {
    byRoot.set(p.root_cause_id, (byRoot.get(p.root_cause_id) || 0) + 1);
    if (!Number.isFinite(p.annual_low) || !Number.isFinite(p.annual_high) || p.annual_high <= 0) {
      v.push({ code: "invalid_range", location: p.name, detail: "Non-finite or zero annual value." });
    }
    if (p.annual_low > p.annual_high) {
      v.push({ code: "invalid_range", location: p.name, detail: "Annual low exceeds annual high." });
    }
    if (p.currency !== "USD") {
      v.push({ code: "currency_inconsistent", location: p.name, detail: `Currency ${p.currency} is not USD.` });
    }
  }
  for (const [id, n] of byRoot) {
    if (n > 1) v.push({ code: "duplicate_pricing", location: id, detail: `Root cause priced ${n} times.` });
  }

  if (priced_leaks.length && !leakage) {
    v.push({ code: "no_canonical_total", location: "overall_leakage", detail: "Priced leaks exist but no canonical total resolved." });
  }

  // Validated at the SAME granularity the repair pass writes at (one field at a
  // time), so a claim is never judged against a wider context window than the
  // one used to decide whether to rewrite it.
  const sections: Array<[string, string]> = [["executive_summary", String(report.executive_summary || "")]];
  for (const ch of chapters) {
    for (const field of ["verdict", "what_we_found", "why_its_leaking", "what_its_costing"]) {
      const val = (ch as Record<string, unknown>)[field];
      if (typeof val === "string" && val.trim()) sections.push([`chapter:${String(ch.slug ?? "?")}.${field}`, val]);
    }
  }

  const verifiedCategories = new Set(ledger.filter((c) => c.status === "verified").map((c) => c.category));
  const contradictedCategories = new Set(ledger.filter((c) => c.status === "contradicted").map((c) => c.category));
  const unverifiedOnly = new Set(
    ledger.filter((c) => c.status === "unverified").map((c) => c.category),
  );

  for (const [where, text] of sections) {
    if (!text) continue;

    // totals
    if (leakage) {
      let m: RegExpExecArray | null;
      const re = new RegExp(MONEY_RANGE_RE.source, "g");
      while ((m = re.exec(text))) {
        const window = text.slice(Math.max(0, m.index - 140), m.index + m[0].length + 60);
        const beforeCtx = text.slice(Math.max(0, m.index - 80), m.index);
        if (!TOTAL_CONTEXT_RE.test(window) || SUBSET_SCOPE_RE.test(beforeCtx)) continue;
        const parts = m[0].split(/-|–|—|to/);
        const lo = parseMoney(parts[0]);
        const hi = parseMoney(parts.slice(1).join(" "));
        if (lo == null || hi == null) continue;
        const f = periodFactor(text.slice(m.index + m[0].length, m.index + m[0].length + 24));
        if (Math.round(lo * f) !== Math.round(leakage.low) || Math.round(hi * f) !== Math.round(leakage.high)) {
          v.push({ code: "total_mismatch", location: where, detail: `Stated total ${m[0].trim()} differs from canonical ${leakage.rangeLabelAscii}.`, excerpt: window.slice(0, 200) });
        }
      }
    }

    // counts
    let cm: RegExpExecArray | null;
    const cre = new RegExp(COUNT_RE.source, "gi");
    while ((cm = cre.exec(text))) {
      const num = Number(cm[1]);
      const noun = cm[2].toLowerCase();
      const isPriced = /leak/.test(noun);
      const isRoot = /root cause/.test(noun);
      const expected = isPriced ? consistency.uniquely_priced_leaks : isRoot ? consistency.unique_root_causes : consistency.detected_findings;
      const canonicalNoun = isPriced ? "leak" : isRoot ? "root cause" : "detected finding";
      if (num !== expected || !noun.includes(canonicalNoun.split(" ")[0])) {
        v.push({ code: "count_mismatch", location: where, detail: `"${cm[0].trim()}" is ambiguous or differs from the canonical ${expected} ${canonicalNoun}s.`, excerpt: cm[0] });
      }
    }

    // absolute negatives
    const nre = new RegExp(ABSOLUTE_NEGATIVE_RE.source, "gi");
    let nm: RegExpExecArray | null;
    while ((nm = nre.exec(text))) {
      const tail = text.slice(nm.index + nm[0].length, nm.index + nm[0].length + 90);
      // Already scope-limited by the repair pass -> honest, not a violation.
      if (SCOPE_QUALIFIER_RE.test(tail)) continue;
      const window = text.slice(Math.max(0, nm.index - 120), nm.index + 160);
      const { category } = semanticRootCauseKey(window);
      if (verifiedCategories.has(category)) continue;
      const code: CompilerViolationCode = contradictedCategories.has(category)
        ? "contradicted_claim_presented_as_fact"
        : unverifiedOnly.has(category)
          ? "truncated_source_used_as_fact"
          : "unsupported_negative_claim";
      v.push({ code, location: where, detail: `Absolute negative "${nm[0].trim()}" is not backed by a suitable verified source for ${category}.`, excerpt: window.slice(0, 200) });
    }

    // unsupported quantified promises
    const qre = new RegExp(UNSUPPORTED_QUANTIFIED_RE.source, "gi");
    let qm: RegExpExecArray | null;
    while ((qm = qre.exec(text))) {
      const before = text.slice(Math.max(0, qm.index - 70), qm.index);
      const after = text.slice(qm.index + qm[0].length, qm.index + qm[0].length + 70);
      if (ASSUMPTION_CONTEXT_RE.test(before) || after.startsWith(ILLUSTRATIVE_MARKER)) continue;
      v.push({ code: "unsupported_quantified_claim", location: where, detail: `Quantified promise "${qm[0].trim()}" has no measured evidence.`, excerpt: qm[0] });
    }

    // currency
    if (NON_USD_RE.test(text)) {
      v.push({ code: "currency_inconsistent", location: where, detail: "Non-USD currency marker present." });
    }
  }

  // recommendation applicability
  for (const ch of chapters) {
    const wtd = ch.what_to_do as Record<string, unknown> | undefined;
    if (!wtd || typeof wtd !== "object") continue;
    for (const horizon of ["this_week", "this_month", "this_quarter"]) {
      for (const it of (wtd[horizon] as unknown[]) || []) {
        if (typeof it !== "string") continue;
        if (!isRecommendationApplicable(it, consistency.site_type)) {
          v.push({ code: "recommendation_not_applicable", location: `chapter:${String(ch.slug)}.${horizon}`, detail: `Local-business tactic recommended to a ${consistency.site_type} company.`, excerpt: it.slice(0, 160) });
        }
      }
    }
  }

  // unverified claims still asserted with certainty in the ledger itself
  for (const c of ledger) {
    if (c.status === "verified" && !SOURCE_SUITABILITY[c.category].includes(c.source_kind)) {
      v.push({ code: "unsuitable_source", location: c.claim_id, detail: `${c.source_kind} cannot verify a ${c.category} conclusion.` });
    }
  }

  return v;
}

/** Convenience: is this stored report safe to expose / turn into a PDF? */
export function isReportPublishable(report: unknown): boolean {
  const c = (report as { compiler?: { state?: string } })?.compiler;
  return c?.state === "compiled";
}
