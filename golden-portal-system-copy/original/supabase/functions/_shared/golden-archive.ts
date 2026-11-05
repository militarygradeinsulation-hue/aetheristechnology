// Golden Report Library — canonical archive shaping.
//
// Single implementation shared by the Deno edge functions and the Vite app
// (via src/lib/goldenArchive.ts). It never recalculates report findings or
// money: the annual range comes straight from the canonical financial ledger
// through computeGoldenLeakage().

import { computeGoldenLeakage } from "./golden-leakage.ts";
import { normalizeReportSource } from "./golden-report-source.ts";

export const BLUEPRINT_TEMPLATE_VERSION = "vibe-blueprint-1";

/* ───────────────────────── identity normalization ───────────────────────── */

const PUBLIC_HOSTS = new Set([
  "facebook.com", "linkedin.com", "instagram.com", "twitter.com", "x.com",
  "youtube.com", "tiktok.com", "wixsite.com", "squarespace.com", "godaddysites.com",
  "wordpress.com", "blogspot.com", "sites.google.com", "weebly.com", "myshopify.com",
]);

const LEGAL_SUFFIXES = [
  "inc", "llc", "l l c", "ltd", "limited", "corp", "corporation", "co", "company",
  "plc", "llp", "lp", "pllc", "pc", "gmbh", "sa", "srl", "bv", "pty",
];

const PERSON_TITLES = new Set(["mr", "mrs", "ms", "dr", "jr", "sr", "ii", "iii", "iv"]);

const BUSINESS_WORDS = [
  "inc", "llc", "ltd", "corp", "corporation", "company", "co", "group", "holdings",
  "solutions", "services", "systems", "technologies", "technology", "tech", "labs",
  "studio", "studios", "agency", "partners", "associates", "consulting", "consultants",
  "construction", "contracting", "contractors", "plumbing", "roofing", "electric",
  "electrical", "hvac", "mechanical", "industries", "industrial", "supply", "logistics",
  "media", "marketing", "capital", "ventures", "properties", "realty", "real estate",
  "clinic", "dental", "medical", "health", "law", "legal", "insurance", "bank",
  "restaurant", "cafe", "bakery", "brewing", "farms", "foods", "auto", "motors",
  "university", "college", "school", "academy", "church", "foundation", "institute",
  "center", "centre", "department", "association", "society", "council", "district",
  "landscaping", "cleaning", "security", "transport", "trucking", "fitness", "salon",
  "spa", "pest", "paving", "concrete", "fence", "flooring", "windows", "doors",
];

/** Normalized registrable-ish host for a target URL. Returns null when unusable. */
export function normalizeDomain(rawUrl: unknown): string | null {
  const raw = String(rawUrl ?? "").trim();
  if (!raw) return null;
  let host = "";
  try {
    const u = new URL(/^https?:\/\//i.test(raw) ? raw : `https://${raw}`);
    host = u.hostname;
  } catch {
    return null;
  }
  host = host.toLowerCase().replace(/^www\d?\./, "").replace(/\.$/, "");
  if (!host || !host.includes(".")) return null;
  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(host)) return null;
  if (host === "localhost") return null;
  // Never merge distinct businesses under a shared platform host.
  const parts = host.split(".");
  const last2 = parts.slice(-2).join(".");
  if (PUBLIC_HOSTS.has(last2) && parts.length <= 2) return null;
  return host;
}

/** Lowercase, punctuation-free, legal-suffix-free comparison key. */
export function normalizeBusinessName(raw: unknown): string {
  let s = String(raw ?? "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  let changed = true;
  while (changed && s) {
    changed = false;
    for (const suf of LEGAL_SUFFIXES) {
      if (s.endsWith(` ${suf}`)) {
        s = s.slice(0, -(suf.length + 1)).trim();
        changed = true;
      }
    }
  }
  return s;
}

/**
 * Heuristic: does this string read as a human contact name rather than a
 * business? Conservative — any business token wins.
 */
export function looksLikePersonName(raw: unknown): boolean {
  const s = String(raw ?? "").trim();
  if (!s) return false;
  if (/[@\/]/.test(s)) return false;
  if (/\d/.test(s)) return false;
  const lower = s.toLowerCase();
  const tokens = lower.replace(/[^a-z\s.'-]/g, " ").split(/\s+/).filter(Boolean);
  if (!tokens.length || tokens.length > 4) return false;
  const cleaned = tokens.map((t) => t.replace(/\./g, ""));
  if (cleaned.some((t) => BUSINESS_WORDS.includes(t))) return false;
  if (BUSINESS_WORDS.some((w) => w.includes(" ") && lower.includes(w))) return false;
  const core = cleaned.filter((t) => !PERSON_TITLES.has(t));
  if (core.length < 2 || core.length > 3) return false;
  // Every core token must look like a name word (letters, maybe hyphen/apostrophe).
  return core.every((t) => /^[a-z][a-z'-]{0,20}$/.test(t));
}

function titleCase(s: string): string {
  return s.split(/\s+/).filter(Boolean)
    .map((w) => (w.length <= 2 ? w.toUpperCase() : w[0].toUpperCase() + w.slice(1)))
    .join(" ");
}

/** Human-facing business name derived from a domain (acme-roofing.com -> Acme Roofing). */
export function businessNameFromDomain(domain: string): string {
  const label = domain.split(".")[0] || domain;
  return titleCase(label.replace(/[-_]+/g, " ").replace(/\s+/g, " ").trim());
}

function firstString(...vals: unknown[]): string | null {
  for (const v of vals) {
    const s = typeof v === "string" ? v.trim() : "";
    if (s) return s;
  }
  return null;
}

function deepFind(obj: unknown, keys: string[], depth = 0): string | null {
  if (!obj || typeof obj !== "object" || depth > 4) return null;
  const rec = obj as Record<string, unknown>;
  for (const k of keys) {
    const v = rec[k];
    if (typeof v === "string" && v.trim()) return v.trim();
  }
  for (const v of Object.values(rec)) {
    if (v && typeof v === "object") {
      const hit = deepFind(v, keys, depth + 1);
      if (hit) return hit;
    }
  }
  return null;
}

export interface ScanIdentityInput {
  target_url?: string | null;
  company_name?: string | null;
  report?: Record<string, unknown> | null;
  raw_findings?: Record<string, unknown> | null;
}

export interface BusinessIdentity {
  display_name: string;
  normalized_name: string;
  primary_domain: string | null;
  website_url: string | null;
  /** company_name preserved as contact metadata when it reads as a person. */
  contact_name: string | null;
  industry: string | null;
  location: string | null;
  name_source: "report_evidence" | "company_name" | "domain" | "url";
}

/**
 * Resolve a true business identity. Domain wins; a person-style company_name is
 * demoted to contact metadata and never used as the business label when a
 * domain or report evidence identifies the organization.
 */
export function resolveBusinessIdentity(scan: ScanIdentityInput): BusinessIdentity {
  const domain = normalizeDomain(scan.target_url);
  const rawName = firstString(scan.company_name);
  const isPerson = rawName ? looksLikePersonName(rawName) : false;

  const evidenceName = firstString(
    deepFind(scan.report, ["business_name", "company_legal_name", "organization_name"]),
    deepFind(scan.raw_findings, ["business_name", "organization_name", "site_name", "og_site_name", "brand_name"]),
  );
  const industry = firstString(
    deepFind(scan.report, ["industry", "vertical"]),
    deepFind(scan.raw_findings, ["industry", "vertical"]),
  );
  const location = firstString(
    deepFind(scan.report, ["location", "city_state", "service_area"]),
    deepFind(scan.raw_findings, ["location", "city_state", "address", "service_area"]),
  );

  let display: string | null = null;
  let source: BusinessIdentity["name_source"] = "domain";

  if (evidenceName && !looksLikePersonName(evidenceName)) {
    display = evidenceName;
    source = "report_evidence";
  } else if (rawName && !isPerson) {
    display = rawName;
    source = "company_name";
  } else if (domain) {
    display = businessNameFromDomain(domain);
    source = "domain";
  } else if (rawName) {
    display = rawName;
    source = "company_name";
  } else {
    display = firstString(scan.target_url) || "Unknown business";
    source = "url";
  }

  const normalized = normalizeBusinessName(display) || (domain ?? String(display).toLowerCase());

  return {
    display_name: display!,
    normalized_name: normalized,
    primary_domain: domain,
    website_url: firstString(scan.target_url),
    contact_name: isPerson ? rawName : null,
    industry,
    location,
    name_source: source,
  };
}

/* ───────────────────────── archive shaping ───────────────────────── */

export interface ScanRow {
  id: string;
  target_url?: string | null;
  company_name?: string | null;
  report?: Record<string, unknown> | null;
  raw_findings?: Record<string, unknown> | null;
  report_source?: string | null;
  portal_source?: string | null;
  rep_code?: string | null;
  creator_name?: string | null;
  creator_email?: string | null;
  report_state?: string | null;
  financial_model_version?: number | null;
  completed_at?: string | null;
  status?: string | null;
}

/** Stable fingerprint of the canonical report payload (sync FNV-1a, 128-bit-ish). */
export function reportHash(report: unknown): string {
  const json = stableStringify(report ?? null);
  // Two independent FNV-1a passes (forward + reverse) for a wider fingerprint.
  const a = fnv1a(json);
  const b = fnv1a(json.split("").reverse().join(""));
  return `${a.toString(16).padStart(8, "0")}${b.toString(16).padStart(8, "0")}${json.length.toString(16)}`;
}

function fnv1a(s: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h >>> 0;
}

export function stableStringify(v: unknown): string {
  if (v === null || typeof v !== "object") return JSON.stringify(v ?? null);
  if (Array.isArray(v)) return `[${v.map(stableStringify).join(",")}]`;
  const rec = v as Record<string, unknown>;
  return `{${Object.keys(rec).sort().map((k) => `${JSON.stringify(k)}:${stableStringify(rec[k])}`).join(",")}}`;
}

/** A report is blueprint-eligible only when the compiler says it compiled. */
export function isBlueprintEligible(report: unknown, reportState?: string | null): boolean {
  if (!report || typeof report !== "object") return false;
  const r = report as Record<string, unknown>;
  const state = String((r.compiler as { state?: string } | undefined)?.state ?? r.report_state ?? reportState ?? "");
  if (state === "regeneration_required") return false;
  if (String(reportState ?? "") === "regeneration_required") return false;
  return state === "compiled";
}

export interface ArchiveSummary {
  report_state: string | null;
  is_valid: boolean;
  target_url: string | null;
  raw_company_name: string | null;
  report_source: string;
  portal_source: string | null;
  rep_code: string | null;
  creator_name: string | null;
  creator_email: string | null;
  annual_low: number | null;
  annual_high: number | null;
  currency: string;
  leak_count: number;
  finding_count: number;
  root_cause_count: number;
  score: number | null;
  grade: string | null;
  executive_summary: string | null;
  top_priorities: { title: string; detail?: string }[];
  top_leaks: { name: string; annual_low: number | null; annual_high: number | null; chapter_slug?: string }[];
  report_hash: string;
  compiler_version: string | null;
  financial_model_version: number | null;
  completed_at: string | null;
}

function num(v: unknown): number | null {
  const n = typeof v === "number" ? v : Number(String(v ?? "").replace(/[^0-9.\-]/g, ""));
  return Number.isFinite(n) ? n : null;
}

/**
 * Materialized, searchable summary of a scan. Money always comes from
 * computeGoldenLeakage (the canonical ledger) — never from prose.
 */
export function buildArchiveSummary(scan: ScanRow): ArchiveSummary {
  const report = (scan.report || {}) as Record<string, unknown>;
  const leakage = computeGoldenLeakage(report as never);
  const consistency = (report.report_consistency || {}) as Record<string, unknown>;
  const compiler = (report.compiler || {}) as Record<string, unknown>;
  const findings = Array.isArray(report.compiled_findings) ? report.compiled_findings as Record<string, unknown>[] : [];
  const rootCauses = Array.isArray(report.root_causes) ? report.root_causes as Record<string, unknown>[] : [];
  const topLeaks = Array.isArray(report.top_leaks) ? report.top_leaks as Record<string, unknown>[] : [];
  const raw = (scan.raw_findings || {}) as Record<string, unknown>;

  const state = String(report.report_state ?? scan.report_state ?? compiler.state ?? "") || null;

  return {
    report_state: state,
    is_valid: isBlueprintEligible(report, scan.report_state),
    target_url: scan.target_url ?? null,
    raw_company_name: scan.company_name ?? null,
    report_source: normalizeReportSource(scan.report_source),
    portal_source: scan.portal_source ?? null,
    rep_code: scan.rep_code ?? null,
    creator_name: scan.creator_name ?? null,
    creator_email: scan.creator_email ?? null,
    annual_low: leakage ? leakage.low : null,
    annual_high: leakage ? leakage.high : null,
    currency: "USD",
    leak_count: leakage ? leakage.count : 0,
    finding_count: findings.length || num(consistency.detected_findings) || 0,
    root_cause_count: rootCauses.length || num(consistency.unique_root_causes) || 0,
    score: num(deepFind(raw, ["score", "overall_score"])),
    grade: firstString(deepFind(raw, ["grade", "overall_grade"])),
    executive_summary: firstString(report.executive_summary),
    top_priorities: rootCauses.slice(0, 5).map((rc) => ({
      title: String(rc.label ?? rc.root_cause_id ?? "Root cause"),
      detail: typeof rc.not_priced_reason === "string" ? rc.not_priced_reason : undefined,
    })),
    top_leaks: topLeaks.slice(0, 10).map((l) => ({
      name: String(l.name ?? l.title ?? "Leak"),
      annual_low: num(l.dollars_low),
      annual_high: num(l.dollars_high),
      chapter_slug: typeof l.chapter_slug === "string" ? l.chapter_slug : undefined,
    })),
    report_hash: reportHash(report),
    compiler_version: consistency.compiler_version != null ? String(consistency.compiler_version) : null,
    financial_model_version: scan.financial_model_version ?? null,
    completed_at: scan.completed_at ?? null,
  };
}

export interface FindingRow {
  finding_key: string;
  title: string;
  detail: string | null;
  category: string | null;
  chapter_slug: string | null;
  root_cause_id: string | null;
  root_cause_title: string | null;
  evidence_grade: string | null;
  priority: number;
  leak_ref: string | null;
  annual_low: number | null;
  annual_high: number | null;
  recommended_action: string | null;
  status: string;
}

/** Normalized finding rows. Dollar values only when the ledger priced them. */
export function buildFindingRows(scan: ScanRow): FindingRow[] {
  const report = (scan.report || {}) as Record<string, unknown>;
  const findings = Array.isArray(report.compiled_findings) ? report.compiled_findings as Record<string, unknown>[] : [];
  const rootCauses = Array.isArray(report.root_causes) ? report.root_causes as Record<string, unknown>[] : [];
  const rcById = new Map(rootCauses.map((rc) => [String(rc.root_cause_id ?? ""), rc]));

  // Canonical priced entries, keyed by root cause when available.
  const ledger = (report.financial_ledger || {}) as Record<string, unknown>;
  const entries = Array.isArray(ledger.entries) ? ledger.entries as Record<string, unknown>[] : [];
  const pricedByRc = new Map<string, Record<string, unknown>>();
  for (const e of entries) {
    if (String(e.status ?? "active") !== "active") continue;
    const key = String(e.root_cause_id ?? "");
    if (key && !pricedByRc.has(key)) pricedByRc.set(key, e);
  }

  const seen = new Set<string>();
  const rows: FindingRow[] = [];
  findings.forEach((f, i) => {
    const rcId = String(f.root_cause_id ?? "") || null;
    const key = String(f.finding_id ?? `fnd_${i}`);
    if (seen.has(key)) return;
    seen.add(key);
    const rc = rcId ? rcById.get(rcId) : undefined;
    const priced = rcId ? pricedByRc.get(rcId) : undefined;
    rows.push({
      finding_key: key,
      title: String(f.statement ?? f.title ?? `Finding ${i + 1}`),
      detail: typeof f.detail === "string" ? f.detail : null,
      category: typeof f.category === "string" ? f.category : null,
      chapter_slug: typeof f.chapter_slug === "string" ? f.chapter_slug : null,
      root_cause_id: rcId,
      root_cause_title: rc ? String(rc.label ?? rcId) : null,
      evidence_grade: typeof f.status === "string" ? f.status : null,
      priority: i + 1,
      leak_ref: priced ? String(priced.entry_id ?? priced.title ?? rcId) : null,
      annual_low: priced ? num(priced.annual_low) : null,
      annual_high: priced ? num(priced.annual_high) : null,
      recommended_action: typeof f.recommended_action === "string" ? f.recommended_action : null,
      status: "open",
    });
  });
  return rows;
}

/** Deterministic, evidence-only business summary (no AI, no invented claims). */
export function deterministicBusinessSummary(
  identity: BusinessIdentity,
  summary: ArchiveSummary,
): string {
  const bits: string[] = [];
  bits.push(
    `${identity.display_name}${identity.primary_domain ? ` (${identity.primary_domain})` : ""} was scanned by the Aetheris Golden Report.`,
  );
  if (identity.industry) bits.push(`Industry signal: ${identity.industry}.`);
  if (identity.location) bits.push(`Location signal: ${identity.location}.`);
  if (summary.annual_low != null && summary.annual_high != null) {
    bits.push(
      `The canonical ledger documents ${summary.leak_count} priced leak${summary.leak_count === 1 ? "" : "s"} across ${summary.root_cause_count} root causes.`,
    );
  } else {
    bits.push(`${summary.finding_count} findings were detected; no canonical priced range is available.`);
  }
  return bits.join(" ");
}
