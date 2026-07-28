// ═══════════════════════════════════════════════════════════════════════════
// CANONICAL generic / template-report detector.
//
// A Golden Report is only allowed to be presented as a company-specific
// forensic result when its priced leaks are tied to real observed evidence for
// THAT company. This module is the single deterministic authority that decides
// whether a stored report is generic boilerplate.
//
// Consumed by BOTH runtimes:
//   • Deno edge functions → import "../_shared/golden-generic-detector.ts"
//   • Browser / Vite app  → src/lib/goldenGenericDetector.ts re-exports it
//
// Universal by construction: it reads ONLY report shape and text. There is no
// company, url, account, rep or scan-id branch anywhere in this file.
// ═══════════════════════════════════════════════════════════════════════════

import type { GoldenReportLike, PricedLeak } from "./golden-leakage.ts";

/** Bump when detection rules change; persisted with the report. */
export const GENERIC_DETECTOR_VERSION = 1;

/** Report-level state written by the detector/compiler and read by every UI. */
export type GoldenReportState = "compiled" | "needs_review" | "regeneration_required";

export const REGENERATION_REQUIRED_MESSAGE =
  "This report could not be verified against company-specific evidence. The dollar figures it previously showed were category benchmarks, not measured findings for this business. Run a fresh scan to produce a supported forensic result.";

// ───────────────────────── 1. exact boilerplate phrases ─────────────────────
// Lifted verbatim from the deterministic fallback synthesizer. Any report whose
// prose still carries these strings is template output, not a forensic result.
export const BOILERPLATE_PHRASES: string[] = [
  "was scanned across every forensic tool in the aetheris stack",
  "conservative annualised exposure ranges grounded in standard smb leak math",
  "conservative annualized exposure ranges grounded in standard smb leak math",
  "standard smb leak math",
  "treat the ranges as the operator's opening position, not the final number",
  "treat the ranges as the operator’s opening position, not the final number",
  "ranges shown are floors",
  "conservative annualised exposure for this chapter sits in the",
  "conservative annualized exposure for this chapter sits in the",
  "the range tightens once crm, pipeline, and close-rate data are connected",
  "shows visible leak signals in this area that warrant operator review",
  "consolidated findings from the site scan, friction audit, and brand contradiction pass",
  "the pattern is not one isolated issue",
  "each one is survivable, together they bleed pipeline",
  "for a business at",
];

/** Phrases that indicate a range came from benchmark math, not observation. */
export const BENCHMARK_MATH_PHRASES: string[] = [
  "standard smb leak math",
  "public profile",
  "industry average",
  "industry benchmark",
  "typical smb",
  "category default",
  "benchmark range",
  "ranges shown are floors",
];

// ───────────────────────── 2. generic leak catalogue ────────────────────────
/**
 * Normalized titles of the template leak categories. These are category names,
 * not findings: they can be emitted for any company without observing anything.
 */
export const GENERIC_LEAK_TITLES: string[] = [
  "pipeline follow up bleed",
  "site conversion friction",
  "lead hygiene workflow gaps",
  "competitive seo position",
  "brand voice contradictions",
  "top 10 active leaks",
  "owner capacity",
  "authority backlink profile",
  "tech stack performance friction",
  "friction vocabulary audit",
  "lead intelligence visitor identification",
];

/**
 * The category default ranges hardcoded by the fallback synthesizer, keyed as
 * "low:high". A priced leak landing exactly on one of these is a category
 * floor, never a measured result.
 */
export const GENERIC_DEFAULT_RANGES: string[] = [
  "18000:72000",
  "12000:60000",
  "6000:36000",
  "9000:48000",
  "6000:30000",
  "12000:60000",
  "6000:24000",
  "24000:180000",
  "12000:90000",
  "9000:60000",
  "60000:360000",
];

/** Report-wide totals that can only be a sum of category floors. */
export const GENERIC_TOTALS: string[] = ["75000:450000"];

export function normalizeTitle(s: unknown): string {
  return String(s ?? "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\b(and|the|a|an|of|for|to|amp)\b/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

const num = (v: unknown): number | null => {
  const n = typeof v === "number" ? v : Number(String(v ?? "").replace(/[^0-9.]/g, ""));
  return Number.isFinite(n) && n > 0 ? Math.round(n) : null;
};

export function rangeKey(low: unknown, high: unknown): string | null {
  const l = num(low);
  const h = num(high);
  return l != null && h != null ? `${l}:${h}` : null;
}

// ───────────────────────── 3. company specificity ───────────────────────────
/**
 * Counts DISTINCT company-specific observations in report prose. Deliberately
 * ignores the company name itself: the template synthesizer interpolates the
 * name into every sentence, so name mentions prove nothing.
 *
 * Signals counted:
 *   • quoted on-page snippets ("Build What Matters")
 *   • URLs with a path segment (site-specific pages)
 *   • measured non-currency numbers (scores, counts, years, percentages)
 *   • named page elements / technical artifacts observed on the site
 */
const QUOTE_RE = /["“”']([^"“”']{6,120})["“”']/g;
const PATH_URL_RE = /https?:\/\/[^\s)"']+\/[^\s)"']+/g;
const ARTIFACT_RE =
  /\b(json-ld|schema\.org|localbusiness|meta description|canonical tag|og:[a-z]+|h1\b|hreflang|robots\.txt|sitemap\.xml|alt text|favicon|webflow|framer|wordpress|shopify|hubspot|calendly|form field|copyright \d{4}|cta button|nav(?:igation)? bar|footer link|testimonial|case study|pricing page|contact form|phone number|lighthouse|core web vitals|lcp|cls|ttfb)\b/gi;

/** Money and template range noise must not be mistaken for measured numbers. */
function stripMoney(text: string): string {
  return text.replace(/\$\s?[\d,]+(?:\.\d+)?\s*[kKmM]?/g, " ");
}

const MEASURED_NUMBER_RE = /\b\d{1,4}(?:\.\d+)?\s?(?:%|\/\s?100|ms|s\b|kb|mb|score|points?|pages?|links?|words?|seconds?)|\bscore(?:d)? (?:of |is |at )?\d{1,3}\b|\b(?:19|20)\d{2}\b/gi;

export type SpecificityReport = {
  score: number;
  quotes: number;
  urls: number;
  numbers: number;
  artifacts: number;
  samples: string[];
};

export function measureSpecificity(text: string): SpecificityReport {
  const body = String(text || "");
  const samples: string[] = [];
  const uniq = (re: RegExp, src: string) => {
    const seen = new Set<string>();
    let m: RegExpExecArray | null;
    const r = new RegExp(re.source, re.flags.includes("g") ? re.flags : re.flags + "g");
    while ((m = r.exec(src))) {
      const v = (m[1] ?? m[0]).trim().toLowerCase();
      if (v && !seen.has(v)) {
        seen.add(v);
        if (samples.length < 12) samples.push(v.slice(0, 80));
      }
    }
    return seen.size;
  };

  const quotes = uniq(QUOTE_RE, body);
  const urls = uniq(PATH_URL_RE, body);
  const artifacts = uniq(ARTIFACT_RE, body);
  const numbers = uniq(MEASURED_NUMBER_RE, stripMoney(body));

  return {
    score: quotes * 2 + urls * 2 + artifacts + numbers,
    quotes,
    urls,
    numbers,
    artifacts,
    samples,
  };
}

/** Minimum specificity a report must reach to be presented as company-specific. */
export const MIN_SPECIFICITY_SCORE = 6;

// ───────────────────────── 4. leak evidence contract ────────────────────────
export type LeakContractIssue =
  | "missing_identifier"
  | "missing_evidence"
  | "missing_source"
  | "missing_range"
  | "missing_method"
  | "missing_confidence"
  | "missing_dedupe_key"
  | "generic_title"
  | "generic_default_range";

export type LeakContractResult = {
  name: string;
  issues: LeakContractIssue[];
  generic: boolean;
  ok: boolean;
};

const nonEmpty = (v: unknown) => typeof v === "string" && v.trim().length > 0;
const hasIds = (v: unknown) => Array.isArray(v) && v.filter(nonEmpty).length > 0;

/**
 * Validates ONE priced leak against the evidence data contract. A leak is
 * "generic" when its title is a template category or its range is a hardcoded
 * category default; it is contract-invalid when it lacks traceability.
 */
export function checkLeakContract(leak: Record<string, unknown>): LeakContractResult {
  const issues: LeakContractIssue[] = [];
  const name = String(leak?.name ?? leak?.chapter_slug ?? "unnamed");

  if (!nonEmpty(leak.root_cause_id) && !nonEmpty(leak.finding_id) && !nonEmpty(leak.dedupe_key)) {
    issues.push("missing_identifier");
  }
  if (!hasIds(leak.evidence_ids) && !nonEmpty(leak.observed_evidence) && !nonEmpty(leak.evidence)) {
    issues.push("missing_evidence");
  }
  if (!nonEmpty(leak.source_url) && !nonEmpty(leak.source_id) && !nonEmpty(leak.source_kind)) {
    issues.push("missing_source");
  }
  if (rangeKey(leak.annual_low ?? leak.dollars_low, leak.annual_high ?? leak.dollars_high) == null) {
    issues.push("missing_range");
  }
  if (!nonEmpty(leak.calculation_method) && !nonEmpty(leak.assumptions)) issues.push("missing_method");
  if (!nonEmpty(leak.evidence_class) && typeof leak.confidence !== "number") issues.push("missing_confidence");
  if (!nonEmpty(leak.dedupe_key) && !nonEmpty(leak.root_cause_id)) issues.push("missing_dedupe_key");

  const title = normalizeTitle(name);
  const isGenericTitle = GENERIC_LEAK_TITLES.some((g) => title === g || title.includes(g) || g.includes(title) && title.length > 8);
  if (isGenericTitle) issues.push("generic_title");

  const rk = rangeKey(leak.annual_low ?? leak.dollars_low, leak.annual_high ?? leak.dollars_high);
  const isGenericRange = !!rk && GENERIC_DEFAULT_RANGES.includes(rk);
  if (isGenericRange) issues.push("generic_default_range");

  return {
    name,
    issues,
    generic: isGenericTitle || isGenericRange,
    ok: issues.length === 0,
  };
}

// ───────────────────────── 5. the report-level verdict ──────────────────────
export type GenericViolationCode =
  | "boilerplate_phrase"
  | "generic_priced_leak"
  | "generic_report_total"
  | "benchmark_math_total"
  | "leak_missing_evidence_link"
  | "insufficient_company_evidence"
  | "fully_generic_flagged";

export type GenericViolation = {
  code: GenericViolationCode;
  location: string;
  detail: string;
  excerpt?: string;
};

export type GenericVerdict = {
  /** True when the report must NOT be presented as a company-specific result. */
  generic: boolean;
  /** True when nothing honest can be rebuilt from what is stored. */
  regeneration_required: boolean;
  violations: GenericViolation[];
  /** Leak names that are category defaults and must leave the forensic total. */
  generic_leak_names: string[];
  /** Leak names that are specific enough to keep pricing. */
  supported_leak_names: string[];
  specificity: SpecificityReport;
  detector_version: number;
};

function reportProse(report: GoldenReportLike & Record<string, unknown>): Array<[string, string]> {
  const out: Array<[string, string]> = [];
  const es = String(report.executive_summary ?? "");
  if (es) out.push(["executive_summary", es]);
  for (const ch of (report.chapters || []) as Array<Record<string, unknown>>) {
    for (const f of ["verdict", "what_we_found", "why_its_leaking", "what_its_costing"]) {
      const v = ch?.[f];
      if (typeof v === "string" && v.trim()) out.push([`chapter:${String(ch.slug ?? "?")}.${f}`, v]);
    }
  }
  return out;
}

/**
 * The ONE deterministic generic/template verdict. Callers must not re-implement
 * any part of this test.
 */
export function detectGenericReport(
  report: (GoldenReportLike & Record<string, unknown>) | null | undefined,
): GenericVerdict {
  const violations: GenericViolation[] = [];
  const generic_leak_names: string[] = [];
  const supported_leak_names: string[] = [];

  if (!report) {
    return {
      generic: true,
      regeneration_required: true,
      violations: [{ code: "insufficient_company_evidence", location: "report", detail: "No report stored." }],
      generic_leak_names,
      supported_leak_names,
      specificity: measureSpecificity(""),
      detector_version: GENERIC_DETECTOR_VERSION,
    };
  }

  const prose = reportProse(report);
  const allText = prose.map(([, t]) => t).join("\n");
  const lower = allText.toLowerCase();

  // a. exact boilerplate
  for (const phrase of BOILERPLATE_PHRASES) {
    if (!lower.includes(phrase)) continue;
    const where = prose.find(([, t]) => t.toLowerCase().includes(phrase));
    violations.push({
      code: "boilerplate_phrase",
      location: where?.[0] ?? "report",
      detail: `Template boilerplate present: "${phrase}".`,
      excerpt: phrase,
    });
  }

  // b. explicit synthesizer fallback flag
  if (report.fully_generic === true) {
    violations.push({
      code: "fully_generic_flagged",
      location: "report.fully_generic",
      detail: "Synthesis fell back to template output for the summary and every chapter.",
    });
  }

  // c. priced-leak contract + generic categories
  const leaks = ((report.priced_leaks as Record<string, unknown>[] | undefined)?.length
    ? (report.priced_leaks as Record<string, unknown>[])
    : ((report.top_leaks || []) as unknown as Record<string, unknown>[])) || [];
  for (const leak of leaks) {
    if (!leak || typeof leak !== "object") continue;
    const res = checkLeakContract(leak);
    if (res.generic) {
      generic_leak_names.push(res.name);
      violations.push({
        code: "generic_priced_leak",
        location: `top_leaks:${res.name}`,
        detail: `Priced leak is a category default (${res.issues.filter((i) => i.startsWith("generic")).join(", ")}), not an observed finding.`,
      });
    } else if (res.issues.includes("missing_evidence") || res.issues.includes("missing_identifier")) {
      supported_leak_names.push(res.name);
      violations.push({
        code: "leak_missing_evidence_link",
        location: `top_leaks:${res.name}`,
        detail: `Priced leak has no traceable derivation (${res.issues.join(", ")}).`,
      });
    } else {
      supported_leak_names.push(res.name);
    }
  }

  // d. report-wide total that can only be a sum of category floors
  const ol = report.overall_leakage as Record<string, unknown> | undefined;
  const totalKey = ol ? rangeKey(ol.annual_low, ol.annual_high) : null;
  if (totalKey && GENERIC_TOTALS.includes(totalKey)) {
    violations.push({
      code: "generic_report_total",
      location: "overall_leakage",
      detail: `Total ${totalKey.replace(":", " - ")} is the sum of template category floors.`,
    });
  }
  if (ol && BENCHMARK_MATH_PHRASES.some((p) => lower.includes(p))) {
    violations.push({
      code: "benchmark_math_total",
      location: "overall_leakage",
      detail: "Report prose derives its ranges from benchmark / public-profile math rather than observation.",
    });
  }

  // e. company specificity
  const specificity = measureSpecificity(allText);
  if (specificity.score < MIN_SPECIFICITY_SCORE) {
    violations.push({
      code: "insufficient_company_evidence",
      location: "report",
      detail: `Specificity score ${specificity.score} is below the required ${MIN_SPECIFICITY_SCORE} (quotes ${specificity.quotes}, urls ${specificity.urls}, observed numbers ${specificity.numbers}, page artifacts ${specificity.artifacts}).`,
    });
  }

  const generic = violations.length > 0;
  // Nothing honest survives when every priced leak is a category default, or the
  // prose carries no company-specific observation at all.
  const regeneration_required =
    generic &&
    (specificity.score < MIN_SPECIFICITY_SCORE ||
      (leaks.length > 0 && supported_leak_names.length === 0) ||
      report.fully_generic === true);

  return {
    generic,
    regeneration_required,
    violations,
    generic_leak_names,
    supported_leak_names,
    specificity,
    detector_version: GENERIC_DETECTOR_VERSION,
  };
}

/** True when a stored report may be shown as a credible forensic result. */
export function isReportCredible(report: unknown): boolean {
  const r = report as Record<string, unknown> | null;
  if (!r) return false;
  if (r.report_state === "regeneration_required") return false;
  const c = r.compiler as { state?: string } | undefined;
  return c?.state === "compiled";
}
