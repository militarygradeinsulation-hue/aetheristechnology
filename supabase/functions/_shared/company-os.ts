// ============================================================================
// AETHERIS COMPANY OPERATING SYSTEM — derivation layer.
// ----------------------------------------------------------------------------
// Turns a composed system (modules + root causes + canonical ledger) into the
// concrete operating surface: team workspaces, tasks, playbooks, seeded active
// memory and typed tool-to-tool events.
//
// Hard rules honoured here:
//  - No money is ever recomputed. Canonical ledger values are passed in and
//    only ever echoed.
//  - No company fact is invented. Anything not present in the report becomes a
//    null value plus a "requires company data" connection task.
//  - Everything is deterministic and carries a dedupe key so re-running the
//    pipeline for the same report is idempotent.
// ============================================================================

import type { SelectedModule, Gap, RootCauseInput } from "./universe-system.ts";

/* ── Teams ───────────────────────────────────────────────────────────────── */

export type TeamKey =
  | "executive"
  | "sales"
  | "marketing"
  | "brand"
  | "website"
  | "operations"
  | "customer_success"
  | "technology";

export const TEAM_ORDER: TeamKey[] = [
  "executive", "sales", "marketing", "brand", "website",
  "operations", "customer_success", "technology",
];

export const TEAM_LABEL: Record<TeamKey, string> = {
  executive: "Executive",
  sales: "Sales",
  marketing: "Marketing",
  brand: "Brand",
  website: "Website & Conversion",
  operations: "Operations",
  customer_success: "Customer Success",
  technology: "Technology & Automation",
};

/** Capability -> team. Checked before the coarser category mapping. */
const CAPABILITY_TEAM: Record<string, TeamKey> = {
  lead_capture: "sales",
  lead_response_time: "sales",
  crm_data_quality: "sales",
  pipeline_hygiene: "sales",
  pipeline_followup: "sales",
  sales_conversion: "sales",
  objection_handling: "sales",
  lead_response: "sales",
  dead_lead_recovery: "customer_success",
  conversion_friction: "website",
  buyer_journey: "website",
  form_and_cta_quality: "website",
  site_health: "website",
  recovery_measurement: "website",
  re_scan: "website",
  brand_consistency: "brand",
  messaging_alignment: "brand",
  positioning_clarity: "brand",
  brand_imagery: "brand",
  content_planning: "marketing",
  publishing_cadence: "marketing",
  content_production: "marketing",
  voice_consistency: "marketing",
  visual_assets: "marketing",
  visibility: "marketing",
  mixed_media_assets: "marketing",
  campaign_assets: "marketing",
  process_documentation: "operations",
  operating_procedure: "operations",
  staff_enablement: "operations",
  forecasting: "executive",
  recovery_tracking: "executive",
  kpi_baseline: "executive",
  leadership_decisions: "executive",
  owner_dependency: "executive",
  prioritisation: "executive",
  gap_fill: "technology",
  custom_module_scaffold: "technology",
};

const CATEGORY_TEAM: Record<string, TeamKey> = {
  diagnostics: "website",
  brand: "brand",
  sales: "sales",
  content: "marketing",
  systems: "operations",
  leadership: "executive",
};

export function teamForModule(m: Pick<SelectedModule, "capabilities" | "category">): TeamKey {
  for (const c of m.capabilities || []) {
    const t = CAPABILITY_TEAM[c];
    if (t) return t;
  }
  return CATEGORY_TEAM[String(m.category)] || "operations";
}

export interface DerivedTeam {
  team_key: TeamKey;
  name: string;
  summary: string;
  root_cause_ids: string[];
  module_ids: string[];
  display_order: number;
}

/**
 * Only the teams this company actually needs. Executive always exists because
 * the cockpit and the recovery ledger live there; every other team appears
 * only when a verified root cause and a selected module land on it.
 */
export function deriveTeams(modules: SelectedModule[], gaps: Gap[] = []): DerivedTeam[] {
  const acc = new Map<TeamKey, DerivedTeam>();
  const ensure = (key: TeamKey): DerivedTeam => {
    let t = acc.get(key);
    if (!t) {
      t = {
        team_key: key,
        name: TEAM_LABEL[key],
        summary: "",
        root_cause_ids: [],
        module_ids: [],
        display_order: TEAM_ORDER.indexOf(key),
      };
      acc.set(key, t);
    }
    return t;
  };

  ensure("executive");
  for (const m of modules) {
    const t = ensure(teamForModule(m));
    if (!t.module_ids.includes(m.module_id)) t.module_ids.push(m.module_id);
    for (const rc of m.root_cause_ids || []) if (!t.root_cause_ids.includes(rc)) t.root_cause_ids.push(rc);
  }
  if (gaps.length) {
    const tech = ensure("technology");
    for (const g of gaps) if (!tech.root_cause_ids.includes(g.root_cause_id)) tech.root_cause_ids.push(g.root_cause_id);
  }

  const exec = ensure("executive");
  for (const m of modules) for (const rc of m.root_cause_ids || []) {
    if (!exec.root_cause_ids.includes(rc)) exec.root_cause_ids.push(rc);
  }

  for (const t of acc.values()) {
    t.summary = t.team_key === "executive"
      ? `Cockpit for ${t.root_cause_ids.length} verified root cause${t.root_cause_ids.length === 1 ? "" : "s"} across the whole system.`
      : `${t.root_cause_ids.length} verified root cause${t.root_cause_ids.length === 1 ? "" : "s"} and ${t.module_ids.length} connected instrument${t.module_ids.length === 1 ? "" : "s"}.`;
  }

  return [...acc.values()].sort((a, b) => a.display_order - b.display_order);
}

/* ── Tasks ───────────────────────────────────────────────────────────────── */

export type TaskKind = "activation" | "measurement" | "data_connection" | "gap" | "crm" | "validation";

export interface DerivedTask {
  team_key: TeamKey;
  root_cause_id: string | null;
  module_id: string | null;
  title: string;
  detail: string;
  kind: TaskKind;
  owner_role: string;
  priority: number;
  requires_company_data: boolean;
  dedupe_key: string;
  source: string;
}

const UNMEASURED = /not measured|to be defined|to be agreed|unknown|n\/a/i;

export interface GoalLike {
  root_cause_id: string | null;
  module_id: string | null;
  title: string;
  baseline?: string | null;
  kpi?: string | null;
  target?: string | null;
  owner_role?: string | null;
  priority?: number | null;
}

/**
 * Real work items, not text cards. Every task traces back to a module, a root
 * cause or a missing data connection. Nothing here asserts a company fact.
 */
export function deriveTasks(args: {
  modules: SelectedModule[];
  gaps: Gap[];
  goals: GoalLike[];
  crmLinked: boolean;
  crmContactCount: number;
}): DerivedTask[] {
  const out: DerivedTask[] = [];
  const teamOf = new Map<string, TeamKey>();
  for (const m of args.modules) teamOf.set(m.module_id, teamForModule(m));

  for (const m of args.modules) {
    const team = teamOf.get(m.module_id)!;
    out.push({
      team_key: team,
      root_cause_id: m.root_cause_ids[0] ?? null,
      module_id: m.module_id,
      title: m.locked ? `Unlock ${m.module_name}` : `Activate ${m.module_name}`,
      detail: m.locked
        ? `${m.lock_reason || "Out of tier."} Recommended for: ${m.root_cause_ids.join(", ")}.`
        : `Connect and run ${m.module_name} against: ${m.root_cause_ids.join(", ")}.`,
      kind: "activation",
      owner_role: "Operator",
      priority: m.locked ? 4 : 2,
      requires_company_data: false,
      dedupe_key: `activate:${m.module_id}`,
      source: "blueprint",
    });
  }

  for (const g of args.goals) {
    const unmeasured = !g.baseline || UNMEASURED.test(g.baseline);
    const team = (g.module_id && teamOf.get(g.module_id)) || "executive";
    out.push({
      team_key: team,
      root_cause_id: g.root_cause_id,
      module_id: g.module_id,
      title: unmeasured ? `Capture baseline: ${g.title}` : `Track KPI: ${g.title}`,
      detail: unmeasured
        ? "Requires company data. The Golden Report proves the leak but the internal baseline has not been supplied yet."
        : `Baseline ${g.baseline}. KPI ${g.kpi || "not set"}. Target ${g.target || "not set"}.`,
      kind: unmeasured ? "measurement" : "measurement",
      owner_role: g.owner_role || "Operator",
      priority: Number(g.priority ?? 3),
      requires_company_data: unmeasured,
      dedupe_key: `baseline:${g.root_cause_id || g.title}`.slice(0, 180),
      source: "goal",
    });
  }

  for (const g of args.gaps) {
    out.push({
      team_key: "technology",
      root_cause_id: g.root_cause_id,
      module_id: null,
      title: `Scope a new instrument: ${g.title}`.slice(0, 180),
      detail: g.note,
      kind: "gap",
      owner_role: "Aetheris",
      priority: 3,
      requires_company_data: false,
      dedupe_key: `gap:${g.root_cause_id}`,
      source: "gap",
    });
  }

  if (!args.crmLinked) {
    out.push({
      team_key: "sales",
      root_cause_id: null,
      module_id: "lead-flow",
      title: "Connect the CRM company record",
      detail: "The company system has no linked CRM company. Link it so pipeline, contacts and response time can be measured. No contacts or deals are created automatically.",
      kind: "crm",
      owner_role: "Operator",
      priority: 1,
      requires_company_data: true,
      dedupe_key: "crm:link",
      source: "crm",
    });
  } else if (args.crmContactCount === 0) {
    out.push({
      team_key: "sales",
      root_cause_id: null,
      module_id: "lead-flow",
      title: "Import real CRM contacts",
      detail: "The linked CRM company has no contacts. Import the real contact list. Aetheris never fabricates contacts, deals or revenue.",
      kind: "data_connection",
      owner_role: "Operator",
      priority: 1,
      requires_company_data: true,
      dedupe_key: "crm:contacts",
      source: "crm",
    });
  }

  const seen = new Set<string>();
  return out.filter((t) => (seen.has(t.dedupe_key) ? false : (seen.add(t.dedupe_key), true)));
}

/* ── Playbooks ───────────────────────────────────────────────────────────── */

export interface DerivedPlaybook {
  team_key: TeamKey;
  title: string;
  root_cause_ids: string[];
  module_ids: string[];
  steps: string[];
  tips: string[];
  dedupe_key: string;
}

export function derivePlaybooks(modules: SelectedModule[], rootCauses: RootCauseInput[]): DerivedPlaybook[] {
  const byTeam = new Map<TeamKey, SelectedModule[]>();
  for (const m of modules) {
    const t = teamForModule(m);
    byTeam.set(t, [...(byTeam.get(t) || []), m]);
  }
  const rcTitle = new Map(rootCauses.map((r) => [r.id, r.title]));

  return [...byTeam.entries()].map(([team, mods]) => {
    const rcIds = [...new Set(mods.flatMap((m) => m.root_cause_ids))];
    return {
      team_key: team,
      title: `${TEAM_LABEL[team]} recovery playbook`,
      root_cause_ids: rcIds,
      module_ids: mods.map((m) => m.module_id),
      steps: [
        `Review the verified root causes for this team: ${rcIds.map((id) => rcTitle.get(id) || id).join("; ") || "none recorded"}.`,
        `Confirm the baseline for each goal. Where the baseline is missing, complete the data connection task before claiming any movement.`,
        ...mods.map((m) => `${m.locked ? "Unlock then run" : "Run"} ${m.module_name} and route its output to the connected instruments.`),
        "Log the result, then let the registered check measure it. Recovery is only real once the check reports.",
      ],
      tips: [
        "Every number quoted to the client comes from the Golden Report ledger. Nothing is recalculated here.",
        "Draft first, confirm second, execute third. Anything external needs an explicit confirmation.",
        "If a fact is not in the report and not approved in memory, treat it as unknown.",
      ],
      dedupe_key: `playbook:${team}`,
    };
  }).sort((a, b) => TEAM_ORDER.indexOf(a.team_key) - TEAM_ORDER.indexOf(b.team_key));
}

/* ── Memory seeding ──────────────────────────────────────────────────────── */

export interface SeedMemory {
  scope: "business" | "report" | "system" | "conversation";
  key: string;
  value: string;
  provenance: string;
  confidence: number;
  status: "inferred" | "approved";
  sensitivity: "low" | "medium" | "high";
  scan_scoped: boolean;
  system_scoped: boolean;
}

/**
 * Grounded seed memory. Report-scope entries are immutable snapshots quoted
 * straight from the canonical ledger and identity resolution. Anything derived
 * rather than evidenced is written as `inferred` and cannot drive an action
 * until an operator approves it.
 */
export function seedMemoryFromReport(args: {
  identity: { display_name?: string | null; primary_domain?: string | null; website_url?: string | null; business_summary?: string | null };
  annualLow: number | null;
  annualHigh: number | null;
  rootCauses: RootCauseInput[];
  moduleIds: string[];
  gaps: Gap[];
  scanId: string;
  reportHash: string;
  brandInferredFields: string[];
}): SeedMemory[] {
  const out: SeedMemory[] = [];
  const push = (m: SeedMemory) => out.push(m);

  if (args.identity.display_name) {
    push({
      scope: "business", key: "business.name", value: String(args.identity.display_name),
      provenance: `golden_report_archive:identity:${args.scanId}`, confidence: 0.9,
      status: "approved", sensitivity: "low", scan_scoped: false, system_scoped: false,
    });
  }
  if (args.identity.primary_domain) {
    push({
      scope: "business", key: "business.primary_domain", value: String(args.identity.primary_domain),
      provenance: `golden_report_archive:identity:${args.scanId}`, confidence: 0.95,
      status: "approved", sensitivity: "low", scan_scoped: false, system_scoped: false,
    });
  }
  if (args.identity.business_summary) {
    push({
      scope: "business", key: "business.summary", value: String(args.identity.business_summary).slice(0, 1200),
      provenance: `golden_report:executive_summary:${args.scanId}`, confidence: 0.6,
      status: "inferred", sensitivity: "low", scan_scoped: false, system_scoped: false,
    });
  }

  if (args.annualLow != null && args.annualHigh != null) {
    push({
      scope: "report", key: "report.canonical_annual_range_usd",
      value: `$${Math.round(args.annualLow).toLocaleString("en-US")} to $${Math.round(args.annualHigh).toLocaleString("en-US")} per year (canonical Golden Report ledger, never recomputed).`,
      provenance: `golden_report:financial_ledger:${args.reportHash}`, confidence: 1,
      status: "approved", sensitivity: "medium", scan_scoped: true, system_scoped: false,
    });
  }
  push({
    scope: "report", key: "report.hash", value: args.reportHash,
    provenance: `golden_report:${args.scanId}`, confidence: 1,
    status: "approved", sensitivity: "low", scan_scoped: true, system_scoped: false,
  });
  for (const rc of args.rootCauses.slice(0, 40)) {
    const grade = normalizeGrade(rc.evidence_grade);
    push({
      scope: "report", key: `report.root_cause.${rc.id}`.slice(0, 180),
      value: `[${grade.toUpperCase()}] ${rc.title}${rc.detail ? ` — ${String(rc.detail).slice(0, 400)}` : ""}`,
      provenance: `golden_report_findings_index:${args.scanId}:${rc.id}:${grade}`,
      confidence: confidenceForGrade(grade),
      status: memoryStatusForGrade(grade), sensitivity: "low", scan_scoped: true, system_scoped: false,
    });
  }


  push({
    scope: "system", key: "system.selected_modules", value: args.moduleIds.join(", ") || "none",
    provenance: "company_system_modules", confidence: 1,
    status: "approved", sensitivity: "low", scan_scoped: false, system_scoped: true,
  });
  if (args.gaps.length) {
    push({
      scope: "system", key: "system.capability_gaps",
      value: args.gaps.map((g) => g.title).join("; ").slice(0, 1200),
      provenance: "company_system_modules:gap", confidence: 1,
      status: "approved", sensitivity: "low", scan_scoped: false, system_scoped: true,
    });
  }
  if (args.brandInferredFields.length) {
    push({
      scope: "system", key: "system.brand_inferred_fields",
      value: `Inferred and NOT approved: ${args.brandInferredFields.join(", ")}. These may not drive an external action until approved.`,
      provenance: "company_brand_contexts:inferred", confidence: 0.4,
      status: "inferred", sensitivity: "medium", scan_scoped: false, system_scoped: true,
    });
  }

  return out;
}

/* ── Typed event bus ─────────────────────────────────────────────────────── */

export const EVENT_CONTRACTS = [
  "finding.verified",
  "goal.created",
  "task.created",
  "lead.created",
  "lead.unanswered",
  "crm.updated",
  "content.approved",
  "content.published",
  "website.updated",
  "metric.recorded",
  "leak.resolved",
] as const;

export type EventType = typeof EVENT_CONTRACTS[number];

export function isEventType(t: string): t is EventType {
  return (EVENT_CONTRACTS as readonly string[]).includes(t);
}

/** Deterministic key so the same logical event is only ever delivered once. */
export function eventIdempotencyKey(eventType: string, subject: string, version: string | number = 1): string {
  return `${eventType}:${subject}:${version}`.slice(0, 240);
}

export interface TypedEvent {
  event_type: EventType;
  from_module: string | null;
  to_module: string | null;
  payload: Record<string, unknown>;
  idempotency_key: string;
}

export function buildProvisioningEvents(args: {
  rootCauses: RootCauseInput[];
  goalTitles: string[];
  taskCount: number;
  reportHash: string;
}): TypedEvent[] {
  const events: TypedEvent[] = [];
  for (const rc of args.rootCauses.slice(0, 50)) {
    events.push({
      event_type: "finding.verified",
      from_module: "golden-report",
      to_module: null,
      payload: { root_cause_id: rc.id, title: rc.title, priority: rc.priority ?? 3 },
      idempotency_key: eventIdempotencyKey("finding.verified", rc.id, args.reportHash),
    });
  }
  for (const t of args.goalTitles.slice(0, 50)) {
    events.push({
      event_type: "goal.created",
      from_module: "company-system",
      to_module: null,
      payload: { title: t },
      idempotency_key: eventIdempotencyKey("goal.created", t.slice(0, 120), args.reportHash),
    });
  }
  events.push({
    event_type: "task.created",
    from_module: "company-system",
    to_module: null,
    payload: { count: args.taskCount },
    idempotency_key: eventIdempotencyKey("task.created", "provisioning", args.reportHash),
  });
  const seen = new Set<string>();
  return events.filter((e) => (seen.has(e.idempotency_key) ? false : (seen.add(e.idempotency_key), true)));
}

/* ── CRM configuration (suggested, never applied without approval) ───────── */

export interface CrmConfigSuggestion {
  stages: string[];
  qualification_fields: string[];
  response_time_goal_minutes: number | null;
  followup_cadence_days: number[];
  requires_approval: true;
  note: string;
}

export function suggestCrmConfig(rootCauses: RootCauseInput[]): CrmConfigSuggestion {
  const text = rootCauses.map((r) => `${r.title} ${r.detail || ""}`).join(" ").toLowerCase();
  const slowResponse = /response|follow.?up|slow|unanswered|reply/.test(text);
  const leakyPipeline = /pipeline|stall|dead lead|qualif/.test(text);
  return {
    stages: ["lead", "qualified", "proposal", "won", "lost"],
    qualification_fields: leakyPipeline
      ? ["budget_confirmed", "decision_maker", "timeline", "source"]
      : ["source", "decision_maker"],
    response_time_goal_minutes: slowResponse ? 15 : null,
    followup_cadence_days: slowResponse ? [0, 1, 3, 7, 14] : [0, 3, 10],
    requires_approval: true,
    note: "Suggested from verified report root causes. Live CRM behaviour is unchanged until an operator approves it.",
  };
}

/* ── Evidence grades ──────────────────────────────────────────────────────
 * golden_report_findings_index.evidence_grade is the only truth about how
 * strong a finding is. Nothing here upgrades a grade and nothing assumes
 * "verified".
 * ------------------------------------------------------------------------ */

export type EvidenceGrade =
  | "verified" | "supported" | "unverified" | "inferred"
  | "contradicted" | "clean" | "not_applicable";

const GRADE_RANK: Record<EvidenceGrade, number> = {
  verified: 6, supported: 5, unverified: 4, inferred: 3,
  contradicted: 2, clean: 1, not_applicable: 0,
};

export function normalizeGrade(raw: unknown): EvidenceGrade {
  const g = String(raw ?? "").trim().toLowerCase().replace(/[\s-]+/g, "_");
  return (g in GRADE_RANK ? g : "inferred") as EvidenceGrade;
}

/** Strongest grade wins when several findings roll up to one root cause. */
export function strongestGrade(grades: unknown[]): EvidenceGrade {
  let best: EvidenceGrade = "not_applicable";
  for (const raw of grades) {
    const g = normalizeGrade(raw);
    if (GRADE_RANK[g] > GRADE_RANK[best]) best = g;
  }
  return best;
}

/** Contradicted, clean and not-applicable findings never create corrective work. */
export function isActionableGrade(g: EvidenceGrade): boolean {
  return g === "verified" || g === "supported" || g === "unverified" || g === "inferred";
}

/** Only evidenced findings may authorise a live action or a priced claim. */
export function authorizesLiveAction(g: EvidenceGrade): boolean {
  return g === "verified" || g === "supported";
}

export function memoryStatusForGrade(g: EvidenceGrade): "approved" | "inferred" {
  return authorizesLiveAction(g) ? "approved" : "inferred";
}

export function confidenceForGrade(g: EvidenceGrade): number {
  return { verified: 0.95, supported: 0.8, unverified: 0.5, inferred: 0.35,
    contradicted: 0.1, clean: 0.1, not_applicable: 0.1 }[g];
}

export function gradeOf(rc: Pick<RootCauseInput, "evidence_grade">): EvidenceGrade {
  return normalizeGrade(rc.evidence_grade);
}

/** Root causes that may drive modules, goals and corrective tasks. */
export function actionableRootCauses(rcs: RootCauseInput[]): RootCauseInput[] {
  return rcs.filter((rc) => isActionableGrade(gradeOf(rc)));
}

/** Validation work for findings that are real but not yet evidenced. */
export function deriveValidationTasks(rcs: RootCauseInput[]): DerivedTask[] {
  return rcs
    .filter((rc) => isActionableGrade(gradeOf(rc)) && !authorizesLiveAction(gradeOf(rc)))
    .slice(0, 60)
    .map((rc) => ({
      team_key: "executive" as TeamKey,
      root_cause_id: rc.id,
      module_id: null,
      title: `Validate finding: ${rc.title}`.slice(0, 180),
      detail: `Evidence grade is ${gradeOf(rc).toUpperCase()}. This finding is labelled, not proven. It may not authorise a live action or a priced recovery claim until it is validated with company data.`,
      kind: "validation" as TaskKind,
      owner_role: "Operator",
      priority: 2,
      requires_company_data: true,
      dedupe_key: `validate:${rc.id}`.slice(0, 180),
      source: "evidence_grade",
    }));
}

/* ── Authoritative blueprint manifest ─────────────────────────────────────
 * Deterministic, structured, built only from canonical report data. No AI
 * prose, no invented company facts, no recomputed money.
 * ------------------------------------------------------------------------ */

export const COMPANY_BLUEPRINT_SCHEMA_VERSION = 2;

export interface BlueprintValidation {
  passed: boolean;
  errors: string[];
  warnings: string[];
}

export interface CompanySystemBlueprint {
  schema_version: number;
  template_version: string;
  generated_at: string;
  identity: Record<string, unknown>;
  source: {
    scan_id: string;
    archive_id: string | null;
    report_hash: string;
    report_version: number | null;
    compiler_version: string | null;
    financial_model_version: string | null;
    financial_confidence: "canonical" | "unpriced";
  };
  financials: { annual_low: number | null; annual_high: number | null; currency: "USD"; source: string };
  root_causes: Array<{
    id: string; title: string; detail: string; priority: number;
    evidence_grade: EvidenceGrade; evidence_ids: string[];
    authorizes_live_action: boolean; actionable: boolean;
    recommended_action: string | null;
  }>;
  excluded_root_causes: Array<{ id: string; title: string; evidence_grade: EvidenceGrade; reason: string }>;
  teams: DerivedTeam[];
  modules: Array<Record<string, unknown>>;
  connections: Array<Record<string, unknown>>;
  goals: Array<Record<string, unknown>>;
  tasks: DerivedTask[];
  playbooks: DerivedPlaybook[];
  checks: Array<Record<string, unknown>>;
  dashboards: Array<{ team_key: TeamKey; name: string; metrics: string[]; requires_company_data: boolean }>;
  crm: CrmConfigSuggestion & { linked_company_id: string | null };
  automations: Array<{ module_id: string; action: string; approval_level: "confirm_required" | "operator_only"; sensitivity: string }>;
  memory_seeds: SeedMemory[];
  forecast: { basis: string; assumptions: string[]; canonical_annual_low: number | null; canonical_annual_high: number | null; confidence: string };
  gaps: Gap[];
  coverage: unknown;
  validation: BlueprintValidation;
}

export function buildDashboards(teams: DerivedTeam[], goals: Array<{ team_key?: string | null; kpi?: string | null }>): CompanySystemBlueprint["dashboards"] {
  return teams.map((t) => {
    const metrics = goals
      .filter((g) => (g.team_key || "executive") === t.team_key)
      .map((g) => String(g.kpi || "").trim())
      .filter((k) => k && !/to be defined|not set/i.test(k));
    return {
      team_key: t.team_key,
      name: `${t.name} dashboard`,
      metrics: [...new Set(metrics)].slice(0, 12),
      requires_company_data: metrics.length === 0,
    };
  });
}

export function buildAutomations(
  modules: SelectedModule[],
  registry: Array<{ id: string; actions?: string[]; sensitivity?: string }>,
): CompanySystemBlueprint["automations"] {
  const byId = new Map(registry.map((m) => [m.id, m]));
  const out: CompanySystemBlueprint["automations"] = [];
  for (const m of modules) {
    const reg = byId.get(m.module_id);
    for (const a of reg?.actions || []) {
      out.push({
        module_id: m.module_id,
        action: a,
        approval_level: (reg?.sensitivity === "low" ? "operator_only" : "confirm_required"),
        sensitivity: String(reg?.sensitivity || "medium"),
      });
    }
  }
  return out;
}

export function validateBlueprint(bp: Omit<CompanySystemBlueprint, "validation">): BlueprintValidation {
  const errors: string[] = [];
  const warnings: string[] = [];
  if (!bp.source.scan_id) errors.push("missing scan_id");
  if (!bp.source.report_hash) errors.push("missing canonical report hash");
  if (!bp.identity || !(bp.identity.display_name || bp.identity.primary_domain)) {
    errors.push("no resolvable business identity");
  }
  if (!bp.root_causes.length && !bp.excluded_root_causes.length) errors.push("report has no indexed findings");
  if (!bp.teams.length && bp.root_causes.length) errors.push("no team workspace could be derived");
  const covered = new Set<string>();
  for (const m of bp.modules) for (const id of (m.root_cause_ids as string[]) || []) covered.add(id);
  for (const g of bp.gaps) covered.add(g.root_cause_id);
  const uncovered = bp.root_causes.filter((rc) => !covered.has(rc.id)).map((rc) => rc.id);
  if (uncovered.length) errors.push(`root causes neither covered nor marked GAP_REQUIRED: ${uncovered.slice(0, 10).join(", ")}`);
  if (bp.financials.annual_low == null) warnings.push("report carries no canonical priced range");
  if (!bp.memory_seeds.length) warnings.push("no memory seeds produced");
  return { passed: errors.length === 0, errors, warnings };
}
