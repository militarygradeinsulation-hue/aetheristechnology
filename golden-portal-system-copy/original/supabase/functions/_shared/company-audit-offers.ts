// Shared deterministic public recommendations. No AI, randomness or time dependence.
// Client and Supabase intake function import the exact same mapping and cents prices.
// These services exist in the internal commissions catalog; a public selection is an
// indicative request for scope, never an automatic charge or product entitlement.
export const AUDIT_ENGINE_VERSION = "company-leak-options-v1";
export type AuditGroup = "capture" | "response" | "drag" | "trust";
export type AuditAnswers = Record<string, number>;
export type AuditOption = {
  id: string; name: string; priceCents: number; cadence: "one_time" | "monthly";
  group: AuditGroup; questions: string[]; problem: string; fix: string;
};
export const AUDIT_OPTIONS: AuditOption[] = [
  { id: "lead-flow", name: "Lead Flow Mapper", priceCents: 9900, cadence: "one_time", group: "capture",
    questions: ["q1","q3"], problem: "Inquiries do not reliably enter one tracked workflow", fix: "Map every lead entry point, assign ownership and define a shared pipeline." },
  { id: "crm-health", name: "CRM Health Check", priceCents: 7900, cadence: "one_time", group: "capture",
    questions: ["q2","q4"], problem: "Lead sources and routing cannot be verified", fix: "Audit CRM routing, backup ownership, source data and pipeline accuracy." },
  { id: "digital-snapshot", name: "Digital Snapshot", priceCents: 14900, cadence: "one_time", group: "capture",
    questions: ["q2","q3"], problem: "Marketing sources are not tied to actual revenue", fix: "Establish a channel baseline and identify where attribution breaks." },
  { id: "follow-up", name: "Follow-Up Plan", priceCents: 5900, cadence: "one_time", group: "response",
    questions: ["q6","q7"], problem: "Quotes and conversations are left without planned follow-up", fix: "Design a repeatable multi-touch follow-up schedule with clear next actions." },
  { id: "lead-nurture", name: "Lead Nurture Automation", priceCents: 29900, cadence: "monthly", group: "response",
    questions: ["q5","q8"], problem: "Response delays and stale inquiries remain untracked", fix: "Scope lead routing, response alerts and reactivation automation." },
  { id: "sales-script", name: "Sales Script Pack", priceCents: 5900, cadence: "one_time", group: "response",
    questions: ["q5","q6"], problem: "Initial replies and quote conversations lack consistency", fix: "Build discovery, first-response and objection-handling scripts." },
  { id: "crm-setup", name: "CRM Setup & Optimization", priceCents: 39900, cadence: "one_time", group: "drag",
    questions: ["q9","q10"], problem: "Processes depend on manual transfers and one person", fix: "Scope shared workflows, pipelines and repeatable task automation." },
  { id: "strategy-blueprint", name: "Strategy Blueprint", priceCents: 34900, cadence: "one_time", group: "drag",
    questions: ["q9","q11"], problem: "Critical operating knowledge is not easy for the team to access", fix: "Document accountable handoffs, operating priorities and a delivery roadmap." },
  { id: "onboarding", name: "Sales Team Onboarding", priceCents: 29900, cadence: "one_time", group: "drag",
    questions: ["q10","q11"], problem: "Knowledge transfer and recurring tasks slow the team", fix: "Create standardized onboarding and repeatable playbooks." },
  { id: "friction", name: "Friction Vocabulary Audit", priceCents: 7900, cadence: "one_time", group: "trust",
    questions: ["q12","q13"], problem: "Visitors struggle to understand the next step", fix: "Identify and rewrite confusing copy, labels and calls to action." },
  { id: "brand", name: "Brand Contradiction Finder", priceCents: 11900, cadence: "one_time", group: "trust",
    questions: ["q12","q14"], problem: "Positioning claims may not align with public proof", fix: "Audit claims, consistency and available evidence across customer-facing pages." },
  { id: "landing", name: "Landing Page Blueprint", priceCents: 34900, cadence: "one_time", group: "trust",
    questions: ["q13","q14"], problem: "The buying path lacks clarity and convincing evidence", fix: "Design a clear conversion pathway, proof hierarchy and buyer-facing answers." },
];
export type AuditRecommendation = { id: string; problem: string; fix: string; reason: string; score: number };
export function validateAuditAnswers(raw: unknown): raw is AuditAnswers {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return false;
  const keys = Object.keys(raw as Record<string, unknown>);
  if (keys.length !== 14) return false;
  return Array.from({ length: 14 }, (_, i) => "q" + (i + 1)).every(k => {
    const v = (raw as Record<string, unknown>)[k];
    return Number.isInteger(v) && typeof v === "number" && v >= 0 && v <= 4;
  });
}
const GROUP_REASON: Record<AuditGroup, string> = {
  capture: "You rated how leads are captured and tracked as weak.",
  response: "You rated response speed and follow-up as weak.",
  drag: "You rated internal handoffs and team workload as weak.",
  trust: "You rated your website clarity and proof as weak.",
};
export function evaluateCompanyAudit(answers: AuditAnswers): AuditRecommendation[] {
  if (!validateAuditAnswers(answers)) throw new Error("All 14 assessment answers are required.");
  const scored = AUDIT_OPTIONS.map(option => {
    const scores = option.questions.map(k => answers[k]);
    const gap = scores.reduce((sum, n) => sum + 4 - n, 0);
    return { option, gap, average: gap / scores.length };
  }).filter(x => x.average >= 1.5)
    .sort((a,b) => b.average - a.average || b.gap - a.gap || a.option.id.localeCompare(b.option.id));
  // Stable tie-breaking and stable selection. No generation temperature.
  return scored.slice(0, 6).map(({option, average}) => ({
    id: option.id,
    problem: option.problem, fix: option.fix, score: Math.round(average * 25),
    reason: GROUP_REASON[option.group],
  }));
}

export type AuditExposureEstimate = {
  healthScore: number;
  annualLow: number;
  annualHigh: number;
  revenueAnchor: number;
  basis: string;
  modelVersion: string;
};

export const AUDIT_EXPOSURE_MODEL_VERSION = "free-leak-check-exposure-v1";

const REVENUE_MODEL: Record<string, { label: string; anchor: number }> = {
  sub_500k: { label: "Under $500K", anchor: 250_000 },
  "500k_1m": { label: "$500K – $1M", anchor: 750_000 },
  "1m_3m": { label: "$1M – $3M", anchor: 2_000_000 },
  "3m_10m": { label: "$3M – $10M", anchor: 6_000_000 },
  "10m_plus": { label: "$10M+", anchor: 10_000_000 },
};

const round500 = (n: number) => Math.max(0, Math.round(n / 500) * 500);

/**
 * Directional, self-reported model only. It intentionally uses a conservative
 * planning anchor for each revenue band and a bounded percentage of that anchor
 * based on the 14-answer health score. It is not measured loss or recovered ROI.
 */
export function modelCompanyAuditExposure(answers: AuditAnswers, revenueBand: string): AuditExposureEstimate {
  if (!validateAuditAnswers(answers)) throw new Error("All 14 assessment answers are required.");
  const band = REVENUE_MODEL[revenueBand];
  if (!band) throw new Error("Choose a valid revenue band.");
  const points = Object.values(answers).reduce((sum, n) => sum + n, 0);
  const healthFraction = points / (14 * 4);
  const healthScore = Math.round(healthFraction * 100);
  const gapFraction = Math.max(0, Math.min(1, 1 - healthFraction));

  // At maximum observed gap: 1.5%–4% of the conservative planning anchor.
  const annualLow = round500(band.anchor * gapFraction * 0.015);
  const annualHigh = Math.max(annualLow, round500(band.anchor * gapFraction * 0.04));
  return {
    healthScore,
    annualLow,
    annualHigh,
    revenueAnchor: band.anchor,
    modelVersion: AUDIT_EXPOSURE_MODEL_VERSION,
    basis: `Directional range from the self-reported 14-question score (${healthScore}/100) using a conservative ${band.label} planning reference. This is modeled exposure, not verified lost revenue.`,
  };
}
export function auditOption(id: string) { return AUDIT_OPTIONS.find(option => option.id === id); }
export function quoteAuditSelection(ids: string[]) {
  const unique = [...new Set(ids)];
  const chosen = unique.map(id => auditOption(id)).filter((x): x is AuditOption => !!x);
  return {
    items: chosen,
    oneTimeCents: chosen.reduce((n, x) => n + (x.cadence === "one_time" ? x.priceCents : 0), 0),
    monthlyCents: chosen.reduce((n, x) => n + (x.cadence === "monthly" ? x.priceCents : 0), 0),
  };
}
export function normalizePublicCompanyUrl(input: unknown): { url: string; domain: string } {
  const raw = String(input ?? "").trim();
  if (!raw || raw.length > 240) throw new Error("Enter a public company website URL.");
  const u = new URL(/^https?:\/\//i.test(raw) ? raw : "https://" + raw);
  const domain = u.hostname.toLowerCase().replace(/^www\./, "").replace(/\.$/, "");
  if (!["http:", "https:"].includes(u.protocol) || u.username || u.password || u.port ||
      domain.length < 4 || !domain.includes(".") ||
      !/^[a-z0-9.-]+$/.test(domain) || domain.includes("..") ||
      /(^|\.)(localhost|local|internal|test|invalid)$/.test(domain) ||
      /(^|\.)(localhost|local|internal|test|invalid)(\.|$)/.test(domain) ||
      /(^|\.)\d+$/.test(domain) || /^\d+\.\d+\.\d+\.\d+$/.test(domain)) {
    throw new Error("Use a publicly accessible business domain (not an internal address).");
  }
  return { domain, url: "https://" + domain + "/" };
}
