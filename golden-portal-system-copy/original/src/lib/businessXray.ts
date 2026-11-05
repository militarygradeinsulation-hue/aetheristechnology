// Business X-Ray: an additive, read-only operational map built from a saved
// Golden Report. It NEVER creates findings, prices, or totals of its own. Every
// node links back to existing compiled findings, evidence-ledger claims,
// chapter content and the canonical Financial Leak Ledger (per entry, never
// summed).
//
// Data sources read (production shapes, verified against forensic_scans):
//   report.compiled_findings[]  finding_id, category, chapter_slug, statement,
//                               status, claim_ids[], root_cause_id
//   report.evidence_ledger[]    claim_id, statement, raw_value, status,
//                               confidence (0..1), source_url, source_locator
//   report.root_causes[]        root_cause_id, label, chapter_slugs[], priced
//   report.financial_ledger     via resolveFinancialLedger(): active entries
//   report.chapters[]           slug, title, verdict, what_we_found,
//                               why_its_leaking, evidence[], what_to_do{}
//
// Most production findings carry category "other" or free-text chapter slugs
// ("lead capture", "brand consistency", "messaging", "content", "speed",
// "scan_website" ...). Those are normalized through STAGE_ALIASES below, and
// anything still unmatched lands in `unmapped` so it is never dropped.
//
// Honesty rules:
//  • Red = confirmed breakdown (directly observed or contradicted evidence).
//    Amber = needs investigation (inferred / unverified evidence, or a chapter
//    that describes a problem). Green = ONLY a saved correction with baseline
//    and current value. Gray = unknown. No findings is not proof of health.
//  • Public-scan relationships are never "verified".
//  • Evidence confidence is reported separately from status.

import { resolveFinancialLedger, type LedgerEntry } from "./goldenLeakage";

export type XrayNodeStatus = "breakdown" | "investigate" | "corrected" | "unknown";
export type XrayEdgeBasis = "verified" | "inferred" | "unknown";
export type XrayNodeKind = "journey" | "internal";
export type XrayStageId = "discovery" | "website" | "trust" | "inquiry" | "follow_up" | "owner";

export type XrayEvidence = {
  claim_id: string;
  statement: string;
  status: string;
  confidence: number | null;
  source_url: string | null;
  source_ref: string | null;
};

export type XrayFinding = {
  finding_id: string;
  statement: string;
  status: string;
  category: string | null;
  chapter_slug: string | null;
  root_cause_id: string | null;
  root_cause_label: string | null;
  evidence: XrayEvidence[];
  /** How the stage was chosen, so assignments stay traceable. */
  mapped_by: "category" | "chapter_slug" | "root_cause" | "text";
  exposure: XrayExposure | null;
};

export type XrayExposure = {
  leak_id: string;
  title: string;
  annual_low: number;
  annual_high: number;
  label: string;
  /** Number of stages this ledger entry touches. It is counted once in the report total. */
  shared_with: number;
  /** True only on the one stage that "owns" this entry. */
  primary: boolean;
};

export type XrayChapterObservation = {
  slug: string;
  title: string;
  verdict: string | null;
  summary: string | null;
  evidence: { label: string; value: string }[];
  reports_problem: boolean;
};

export type XrayCorrection = {
  node_id: string;
  metric: string;
  baseline: string;
  current: string;
  verified_at: string;
  owner?: string | null;
};

export type XrayNode = {
  id: XrayStageId;
  label: string;
  kind: XrayNodeKind;
  description: string;
  why_it_matters: string;
  downstream: string[];
  status: XrayNodeStatus;
  summary: string;
  findings: XrayFinding[];
  chapters: XrayChapterObservation[];
  exposures: XrayExposure[];
  root_causes: string[];
  evidence_confidence: "high" | "medium" | "low" | "none";
  recommended_actions: string[];
  /** First action, kept for backwards compatibility. */
  recommended_action: string | null;
  owner: string | null;
  correction: XrayCorrection | null;
  on_customer_path: boolean;
  /** Ranking score for "Where it breaks down". Higher = stronger evidence of a break. */
  severity_score: number;
};

export type XrayEdge = { from: XrayStageId; to: XrayStageId; label: string; basis: XrayEdgeBasis; on_customer_path: boolean; friction: boolean };

export type XrayUnmapped = { finding_id: string; statement: string; category: string | null; chapter_slug: string | null };

export type BusinessXray = {
  preliminary: boolean;
  legacy_fallback: boolean;
  nodes: XrayNode[];
  edges: XrayEdge[];
  unmapped: XrayUnmapped[];
  /** Node ids ordered by severity, strongest break first (unknown excluded). */
  ranked: XrayStageId[];
  counts: { breakdown: number; investigate: number; corrected: number; unknown: number; linked_findings: number; total_findings: number };
  history_available: boolean;
  notes: string[];
};

type StepDef = {
  id: XrayStageId;
  label: string;
  kind: XrayNodeKind;
  description: string;
  why: string;
  downstream: XrayStageId[];
  chapters: string[];
  on_customer_path: boolean;
};

const STEPS: StepDef[] = [
  { id: "discovery", label: "Discovery", kind: "journey", description: "How a buyer finds the business in search, listings and referrals.", why: "If buyers cannot find you, or the search result does not earn the click, every later stage starts with fewer people.", downstream: ["website"], chapters: ["seo-discoverability", "authority-backlinks"], on_customer_path: true },
  { id: "website", label: "Website visit", kind: "journey", description: "First impression: speed, mobile layout, page content and navigation.", why: "A slow, broken or confusing first visit loses buyers before they ever read the offer.", downstream: ["trust", "inquiry"], chapters: ["site-autopsy", "tech-performance"], on_customer_path: true },
  { id: "trust", label: "Trust and proof", kind: "journey", description: "Proof, reviews, consistency and messaging that make a buyer believe the claim.", why: "Visitors who do not believe the claim do not reach out, no matter how good the service is.", downstream: ["inquiry"], chapters: ["brand-contradictions", "friction-vocabulary", "competitive"], on_customer_path: true },
  { id: "inquiry", label: "Inquiry", kind: "journey", description: "Calls to action, contact details and forms that capture the lead.", why: "This is where interest turns into a lead. Friction here drops buyers who were ready to talk.", downstream: ["follow_up"], chapters: ["lead-intelligence"], on_customer_path: true },
  { id: "follow_up", label: "Follow up and sales", kind: "internal", description: "What happens after an inquiry lands: response, pipeline and lead handling.", why: "Leads that are not answered quickly or tracked properly turn into lost revenue that never shows up anywhere.", downstream: [], chapters: ["pipeline-forensics", "lead-hygiene"], on_customer_path: true },
  { id: "owner", label: "Owner and team capacity", kind: "internal", description: "Who carries the work. No people are named unless the report supports it.", why: "When the owner or team is stretched, follow up slows and the whole pipeline leaks.", downstream: ["follow_up"], chapters: ["owner-capacity"], on_customer_path: false },
];

/** Exact compiled_findings.category values seen in production. */
const CATEGORY_STAGE: Record<string, XrayStageId> = {
  seo: "discovery",
  schema: "discovery",
  performance: "website",
  mobile_layout: "website",
  proof: "trust",
  cta: "inquiry",
  contact_info: "inquiry",
  lead_capture: "inquiry",
  form_behavior: "inquiry",
  owner_capacity: "owner",
  pipeline: "follow_up",
  lead_hygiene: "follow_up",
};

/** Ordered alias rules applied to normalized slugs and text. Specific stages first. */
export const STAGE_ALIASES: Array<[XrayStageId, RegExp]> = [
  ["follow_up", /\b(pipeline|crm|follow ?up|sales|lead hygiene|nurtur|response time|drip|deal|quote)/],
  ["owner", /\b(capacity|owner|team|staff|operations?|hiring|founder|bandwidth)\b/],
  ["inquiry", /\b(cta|call to action|forms?|contact|lead capture|lead intelligence|conversion|booking|book a|phone|inquir|enquir|support policy|pricing|checkout|homepage lead)/],
  ["trust", /\b(proof|reviews?|testimonial|brand|messaging|message|credib|contradict|consisten|voice|friction vocab|competit|trust|case stud|ranking|misrepresent|authority content|content authority|certif|guarantee)/],
  ["discovery", /\b(seo|search|serp|discover|visib|schema|structured data|meta|snippet|backlink|authority|index|google|listing)/],
  ["website", /\b(performance|speed|mobile|ux|content|navigation|site|tech|layout|page|domain|technical|maintenance|stale|currency|firecrawl|scrape|scan website|load|broken|accessib)/],
];

type AnyRec = Record<string, unknown>;
const arr = (v: unknown): AnyRec[] => (Array.isArray(v) ? (v.filter((x) => x && typeof x === "object") as AnyRec[]) : []);
const str = (v: unknown): string | null => (typeof v === "string" && v.trim() ? v.trim() : null);
export const normalizeKey = (s: unknown) => String(s ?? "").toLowerCase().replace(/[_\-/.]+/g, " ").replace(/\s+/g, " ").trim();

export function stageFromText(s: unknown): XrayStageId | null {
  const k = normalizeKey(s);
  if (!k) return null;
  for (const [stage, re] of STAGE_ALIASES) if (re.test(k)) return stage;
  return null;
}

const CHAPTER_STAGE = new Map<string, XrayStageId>(STEPS.flatMap((s) => s.chapters.map((c) => [c, s.id] as const)));
function stageFromChapterSlug(slug: unknown): XrayStageId | null {
  const raw = String(slug ?? "").toLowerCase().replace(/_/g, "-").trim();
  return CHAPTER_STAGE.get(raw) ?? null;
}

const GENERIC_CATEGORIES = new Set(["other", "content", ""]);

function assignStage(f: AnyRec, rootCauseSlugs: string[]): { stage: XrayStageId; by: XrayFinding["mapped_by"] } | null {
  const cat = String(f.category || "").toLowerCase();
  if (!GENERIC_CATEGORIES.has(cat) && CATEGORY_STAGE[cat]) return { stage: CATEGORY_STAGE[cat], by: "category" };
  const slug = f.chapter_slug;
  const fromSlug = stageFromChapterSlug(slug) || stageFromText(slug);
  if (fromSlug) return { stage: fromSlug, by: "chapter_slug" };
  for (const rs of rootCauseSlugs) {
    const s = stageFromChapterSlug(rs) || stageFromText(rs);
    if (s) return { stage: s, by: "root_cause" };
  }
  if (cat === "content") return { stage: "website", by: "category" };
  const fromText = stageFromText(f.statement);
  if (fromText) return { stage: fromText, by: "text" };
  return null;
}

const NO_PROBLEM_RE = /\b(no (active |revenue |material |significant )?(revenue )?(leaks?|issues?|friction|contradictions?|gaps?|problems?)|operating as designed|not detected|none detected|no .{0,40}(detected|identified|found)|did not (complete|finish)|tool (reported an )?error|could not be (assessed|scanned))/i;

function confidenceBand(values: number[]): XrayNode["evidence_confidence"] {
  if (!values.length) return "none";
  const max = Math.max(...values);
  return max >= 0.7 ? "high" : max >= 0.4 ? "medium" : "low";
}

function validCorrections(report: AnyRec): XrayCorrection[] {
  return arr(report.xray_corrections)
    .map((c) => ({
      node_id: str(c.node_id) || "",
      metric: str(c.metric) || "",
      baseline: str(c.baseline) || "",
      current: str(c.current) || "",
      verified_at: str(c.verified_at) || "",
      owner: str(c.owner),
    }))
    .filter((c) => c.node_id && c.metric && c.baseline && c.current && c.verified_at);
}

const usd = (n: number) => `$${Math.round(n).toLocaleString("en-US")}`;
const firstSentence = (s: string | null, max = 220) => {
  if (!s) return null;
  const m = s.match(/^.*?[.!?](\s|$)/);
  const out = (m ? m[0] : s).trim();
  return out.length > max ? `${out.slice(0, out.lastIndexOf(" ", max) > 0 ? out.lastIndexOf(" ", max) : max)}…` : out;
};

export function buildBusinessXray(reportIn: unknown): BusinessXray {
  const report = (reportIn && typeof reportIn === "object" ? reportIn : {}) as AnyRec;
  const notes: string[] = [];

  const claims = new Map<string, AnyRec>();
  for (const c of arr(report.evidence_ledger)) if (str(c.claim_id)) claims.set(String(c.claim_id), c);
  const rootCauses = new Map<string, AnyRec>();
  for (const r of arr(report.root_causes)) if (str(r.root_cause_id)) rootCauses.set(String(r.root_cause_id), r);

  let ledgerActive: LedgerEntry[] = [];
  try {
    ledgerActive = resolveFinancialLedger(report as never).active || [];
  } catch {
    notes.push("Financial ledger could not be read, so exposure is omitted.");
  }

  // ── Findings → stages ──
  const findings = arr(report.compiled_findings);
  const perStage = new Map<XrayStageId, XrayFinding[]>();
  const unmapped: XrayUnmapped[] = [];
  findings.forEach((f, i) => {
    const rc = str(f.root_cause_id);
    const rcSlugs = rc ? (Array.isArray(rootCauses.get(rc)?.chapter_slugs) ? (rootCauses.get(rc)!.chapter_slugs as unknown[]).map(String) : []) : [];
    const id = str(f.finding_id) || `finding_${i + 1}`;
    const assigned = assignStage(f, rcSlugs);
    if (!assigned) {
      unmapped.push({ finding_id: id, statement: str(f.statement) || "Finding", category: str(f.category), chapter_slug: str(f.chapter_slug) });
      return;
    }
    const ids = Array.isArray(f.claim_ids) ? (f.claim_ids as unknown[]).map(String) : [];
    const evidence: XrayEvidence[] = ids
      .map((cid) => claims.get(cid))
      .filter((c): c is AnyRec => !!c)
      .map((c) => ({
        claim_id: String(c.claim_id),
        statement: str(c.raw_value) || str(c.statement) || "Evidence statement not recorded",
        status: str(c.status) || "unverified",
        confidence: typeof c.confidence === "number" ? (c.confidence as number) : null,
        source_url: str(c.source_url),
        source_ref: str(c.source_locator) || str(c.source_kind),
      }));
    const list = perStage.get(assigned.stage) || [];
    list.push({
      finding_id: id,
      statement: str(f.statement) || "Finding",
      status: str(f.status) || "unverified",
      category: str(f.category),
      chapter_slug: str(f.chapter_slug),
      root_cause_id: rc,
      root_cause_label: rc ? str(rootCauses.get(rc)?.label) : null,
      evidence,
      mapped_by: assigned.by,
      exposure: null,
    });
    perStage.set(assigned.stage, list);
  });

  // ── Chapters → stages (also the legacy fallback) ──
  const chapters = arr(report.chapters);
  const perStageChapters = new Map<XrayStageId, XrayChapterObservation[]>();
  const perStageActions = new Map<XrayStageId, string[]>();
  for (const ch of chapters) {
    const slug = String(ch.slug || "").toLowerCase();
    const stage = stageFromChapterSlug(slug) || (["top-10-leaks", "remediation-plan", "appendix"].includes(slug) ? null : stageFromText(slug) || stageFromText(ch.title));
    if (!stage) continue;
    const verdict = str(ch.verdict);
    const found = str(ch.what_we_found);
    const text = `${verdict ?? ""} ${firstSentence(found) ?? ""}`;
    const obs: XrayChapterObservation = {
      slug,
      title: str(ch.title) || slug,
      verdict,
      summary: firstSentence(found),
      evidence: arr(ch.evidence).map((e) => ({ label: String(e.label ?? ""), value: String(e.value ?? "") })).filter((e) => e.label || e.value).slice(0, 4),
      reports_problem: !!(verdict || found) && !NO_PROBLEM_RE.test(text),
    };
    perStageChapters.set(stage, [...(perStageChapters.get(stage) || []), obs]);
    const todo = (ch.what_to_do || {}) as AnyRec;
    const actions = [todo.this_week, todo.this_month, todo.this_quarter].flatMap((x) => (Array.isArray(x) ? x : [])).map(str).filter((x): x is string => !!x);
    perStageActions.set(stage, [...(perStageActions.get(stage) || []), ...actions]);
  }

  // ── Ledger → stages. Each entry has exactly ONE primary stage. ──
  const stageOrder = STEPS.map((s) => s.id);
  const entryStages = new Map<string, XrayStageId[]>();
  for (const e of ledgerActive) {
    const stages = new Set<XrayStageId>();
    for (const [stage, list] of perStage) if (list.some((f) => f.root_cause_id && f.root_cause_id === e.root_cause_id)) stages.add(stage);
    const chStage = stageFromChapterSlug(e.primary_chapter) || stageFromText(e.primary_chapter) || stageFromText(e.title);
    if (chStage) stages.add(chStage);
    for (const c of e.cross_referenced_chapters || []) { const s = stageFromChapterSlug(c); if (s) stages.add(s); }
    if (stages.size) entryStages.set(e.leak_id, stageOrder.filter((s) => stages.has(s)));
  }
  const perStageExposure = new Map<XrayStageId, XrayExposure[]>();
  for (const e of ledgerActive) {
    const stages = entryStages.get(e.leak_id);
    if (!stages) continue;
    const primaryStage = stageFromChapterSlug(e.primary_chapter) && stages.includes(stageFromChapterSlug(e.primary_chapter)!) ? stageFromChapterSlug(e.primary_chapter)! : stages[0];
    for (const s of stages) {
      const x: XrayExposure = {
        leak_id: e.leak_id,
        title: e.title,
        annual_low: e.annual_low,
        annual_high: e.annual_high,
        label: `${usd(e.annual_low)} to ${usd(e.annual_high)} per year`,
        shared_with: stages.length,
        primary: s === primaryStage,
      };
      perStageExposure.set(s, [...(perStageExposure.get(s) || []), x]);
    }
  }
  for (const [stage, list] of perStage) {
    const xs = perStageExposure.get(stage) || [];
    for (const f of list) {
      const e = f.root_cause_id ? ledgerActive.find((l) => l.root_cause_id === f.root_cause_id) : undefined;
      if (e) f.exposure = xs.find((x) => x.leak_id === e.leak_id) || null;
    }
  }

  const legacy = findings.length === 0;
  if (legacy && chapters.length) notes.push("This report has no structured findings list. Stages are filled from the report chapters and leak ledger.");
  if (legacy && !chapters.length) notes.push("This report has no findings or chapters to map.");

  const corrections = validCorrections(report);

  const nodes: XrayNode[] = STEPS.map((s) => {
    const fs = perStage.get(s.id) || [];
    const chs = perStageChapters.get(s.id) || [];
    const exposures = perStageExposure.get(s.id) || [];
    const correction = corrections.find((c) => c.node_id === s.id) || null;
    const statuses = fs.flatMap((f) => [f.status, ...f.evidence.map((e) => e.status)]);
    let status: XrayNodeStatus = "unknown";
    if (fs.length) status = statuses.some((x) => x === "verified" || x === "contradicted") ? "breakdown" : "investigate";
    else if (exposures.length || chs.some((c) => c.reports_problem)) status = "investigate";
    if (correction) status = "corrected";

    const confs = fs.flatMap((f) => f.evidence.map((e) => e.confidence)).filter((x): x is number => x != null);
    const rcs = [...new Set(fs.map((f) => f.root_cause_label || f.root_cause_id).filter((x): x is string => !!x))];
    const actions = [...new Set(perStageActions.get(s.id) || [])].slice(0, 6);

    const primaryCh = chs.find((c) => c.reports_problem) || chs[0];
    let summary: string;
    if (fs.length) {
      const verified = fs.filter((f) => f.status === "verified" || f.status === "contradicted").length;
      summary = `${fs.length} finding${fs.length === 1 ? "" : "s"} tied to this stage${verified ? `, ${verified} directly observed` : ""}. ${primaryCh?.verdict ? primaryCh.verdict : `Lead issue: ${fs[0].statement}.`}`;
    } else if (primaryCh?.verdict || primaryCh?.summary) {
      summary = `${primaryCh.verdict || primaryCh.summary}${primaryCh.reports_problem ? "" : " A scan that finds nothing is not proof this stage works well."}`;
    } else if (s.kind === "internal") {
      summary = "Not visible from a public website scan. Needs a conversation or connected data to assess.";
    } else {
      summary = "The report holds no usable evidence for this stage.";
    }

    const score =
      (status === "breakdown" ? 100 : status === "investigate" ? 50 : 0) +
      fs.filter((f) => f.status === "verified" || f.status === "contradicted").length * 10 +
      fs.length * 3 +
      Math.round((confs.length ? Math.max(...confs) : 0) * 10) +
      exposures.filter((x) => x.primary).length * 8 +
      chs.filter((c) => c.reports_problem).length * 2;

    return {
      id: s.id,
      label: s.label,
      kind: s.kind,
      description: s.description,
      why_it_matters: s.why,
      downstream: s.downstream.map((d) => STEPS.find((x) => x.id === d)!.label),
      status,
      summary,
      findings: fs,
      chapters: chs,
      exposures,
      root_causes: rcs,
      evidence_confidence: confidenceBand(confs),
      recommended_actions: actions,
      recommended_action: actions[0] ?? null,
      owner: correction?.owner ?? null,
      correction,
      on_customer_path: s.on_customer_path,
      severity_score: status === "unknown" || status === "corrected" ? 0 : score,
    };
  });

  const byId = new Map(nodes.map((n) => [n.id, n]));
  const hasEvidence = (n: XrayNode) => n.findings.length > 0 || n.exposures.length > 0 || n.chapters.some((c) => c.reports_problem);
  const EDGES: Array<{ from: XrayStageId; to: XrayStageId; label: string; on_customer_path: boolean }> = [
    { from: "discovery", to: "website", label: "Search result to visit", on_customer_path: true },
    { from: "website", to: "trust", label: "Visit to belief", on_customer_path: true },
    { from: "trust", to: "inquiry", label: "Belief to inquiry", on_customer_path: true },
    { from: "inquiry", to: "follow_up", label: "Inquiry handoff to sales", on_customer_path: true },
    { from: "owner", to: "follow_up", label: "Capacity to respond", on_customer_path: false },
  ];
  const edges: XrayEdge[] = EDGES.map((e) => {
    const a = byId.get(e.from)!;
    const b = byId.get(e.to)!;
    let basis: XrayEdgeBasis;
    if (a.correction && b.correction) basis = "verified";
    else if (a.kind === "journey" && b.kind === "journey") basis = "inferred";
    else basis = hasEvidence(a) && hasEvidence(b) ? "inferred" : "unknown";
    return { ...e, basis, friction: a.status === "breakdown" || a.status === "investigate" || b.status === "breakdown" || b.status === "investigate" };
  });

  const ranked = [...nodes].filter((n) => n.severity_score > 0).sort((a, b) => b.severity_score - a.severity_score).map((n) => n.id);
  const count = (s: XrayNodeStatus) => nodes.filter((n) => n.status === s).length;
  const linked = nodes.reduce((n, x) => n + x.findings.length, 0);
  return {
    preliminary: corrections.length === 0,
    legacy_fallback: legacy,
    nodes,
    edges,
    unmapped,
    ranked,
    counts: {
      breakdown: count("breakdown"),
      investigate: count("investigate"),
      corrected: count("corrected"),
      unknown: count("unknown"),
      linked_findings: linked,
      total_findings: findings.length,
    },
    history_available: corrections.length > 0,
    notes,
  };
}

export const XRAY_STATUS_LABEL: Record<XrayNodeStatus, string> = {
  breakdown: "Confirmed breakdown",
  investigate: "Needs investigation",
  corrected: "Verified corrected",
  unknown: "Unknown. No findings is not proof of health",
};

export const XRAY_EDGE_LABEL: Record<XrayEdgeBasis, string> = {
  verified: "Verified relationship",
  inferred: "Inferred relationship",
  unknown: "Unknown relationship",
};

/** Plain text lines for PDF and accessible summaries. */
export function xraySummaryLines(x: BusinessXray): string[] {
  return x.nodes.map(
    (n) => `${n.label}: ${XRAY_STATUS_LABEL[n.status]} · ${n.findings.length} linked finding(s) · evidence confidence ${n.evidence_confidence}`,
  );
}
