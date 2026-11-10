/**
 * Read-only normalization of existing Aetheris scan evidence.
 * No Firecrawl, AI calls, new scans, or guessed contact details.
 */
export type ScanSource = "forensic" | "website" | "enriched";
export type Issue = {
  title: string;
  description: string | null;
  category: string | null;
  evidence: string | null;
  priority: number | null;
  severity: string | null;
  recommendation: string | null;
  estimatedAnnualCost: string | null;
};

export const SCANNED_LEADS_PAGE_SIZE = 20;

const obj = (value: unknown): Record<string, unknown> =>
  value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown> : {};
const string = (value: unknown, limit = 3000): string | null =>
  typeof value === "string" && value.trim() ? value.trim().slice(0, limit) : null;
const num = (value: unknown): number | null =>
  typeof value === "number" && Number.isFinite(value) ? value : null;

export function safeDirectorySearch(value: unknown): string {
  if (typeof value !== "string") return "";
  // Prevent PostgREST OR-filter syntax injection, while keeping names, email
  // domains, company slugs and telephone digits searchable.
  return value.replace(/[^\p{L}\p{N}\s@.\-]/gu, " ").trim().replace(/\s+/g, " ").slice(0, 80);
}

export function safeDirectoryPage(value: unknown): number {
  const page = typeof value === "number" ? value : Number(value);
  return Number.isSafeInteger(page) && page >= 0 ? Math.min(page, 2500) : 0;
}

export function normalizedIssue(raw: unknown): Issue | null {
  if (typeof raw === "string") {
    const title = string(raw, 500);
    return title ? { title, description: null, category: null, evidence: "inferred", priority: null, severity: null, recommendation: null, estimatedAnnualCost: null } : null;
  }
  const o = obj(raw);
  const title = string(o.title, 500) || string(o.finding, 500) || string(o.name, 500) || string(o.label, 500);
  if (!title) return null;
  const priority = num(o.priority);
  return {
    title,
    description: string(o.detail) || string(o.description),
    category: string(o.category, 100),
    evidence: string(o.evidence_grade, 50) || string(o.evidence, 50) || "unverified",
    priority,
    severity: string(o.severity, 50),
    recommendation: string(o.recommended_action) || string(o.recommendedFix) || string(o.fix),
    estimatedAnnualCost: string(o.annualCost, 80),
  };
}

export function websiteScanIssues(gaps: unknown): Issue[] {
  const data = obj(gaps);
  const candidates = Array.isArray(data.gaps) ? data.gaps : Array.isArray(gaps) ? gaps : [];
  return candidates.slice(0, 60).map(normalizedIssue).filter((x): x is Issue => Boolean(x));
}

export function enrichedLeadIssues(enrichment: unknown): Issue[] {
  const data = obj(enrichment);
  const scan = obj(data.scan);
  const result = websiteScanIssues(scan.gaps);
  const weak = Array.isArray(data.weak_points) ? data.weak_points : [];
  for (const item of weak) {
    const issue = normalizedIssue(item);
    if (issue) result.push(issue);
  }
  // Deterministic titles prevent duplicate issues from the same scan source.
  const seen = new Set<string>();
  return result.filter(issue => {
    const key = issue.title.toLocaleLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  }).slice(0, 60);
}

export function indexedReportIssue(value: unknown): Issue | null {
  const data = obj(value);
  const issue = normalizedIssue(data);
  if (!issue) return null;
  const low = num(data.annual_low), high = num(data.annual_high);
  if (low !== null || high !== null) {
    issue.estimatedAnnualCost = [low, high].filter((n): n is number => n !== null)
      .map(n => "$" + n.toLocaleString("en-US", { maximumFractionDigits: 0 })).join(" to ");
  }
  return issue;
}

export function scanCompanyName(url: unknown, fallback: unknown): string {
  const name = string(fallback, 160);
  if (name) return name;
  const raw = string(url, 2048);
  if (!raw) return "Unnamed scan";
  try {
    const parsed = new URL(/^https?:\/\//i.test(raw) ? raw : "https://" + raw);
    return parsed.hostname.replace(/^www\./i, "");
  } catch {
    return raw.slice(0, 160);
  }
}

export function safePublicUrl(value: unknown): string | null {
  const url = string(value, 2048);
  if (!url) return null;
  try {
    const parsed = new URL(/^https?:\/\//i.test(url) ? url : "https://" + url);
    if (!["https:", "http:"].includes(parsed.protocol) || parsed.username || parsed.password) return null;
    if (!parsed.hostname.includes(".")) return null;
    return parsed.toString();
  } catch {
    return null;
  }
}

export function contactNameList(value: unknown): string[] {
  return Array.isArray(value) ? value.map(v => string(v, 120)).filter((s): s is string => Boolean(s)).slice(0, 25) : [];
}
