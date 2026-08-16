// ============================================================================
// AETHERIS COMPANY OPERATING SYSTEM — composition core
// ----------------------------------------------------------------------------
// The Golden Report is the control plane. This module does NOT invent an app:
// it selects, configures and connects instruments that already exist inside the
// Aetheris Universe (SHOP_TOOLS routes + existing edge functions).
//
// Pure logic only — no network, no Supabase. The identical logic is mirrored in
// `supabase/functions/_shared/universe-system.ts` for the edge runtime; the
// test suite guards both against drift with aetherisTiers / tool-shop-catalog.
// ============================================================================

export type ModuleTier = "free" | "signal" | "revenue" | "suite" | "diagnostic" | "active";

/** Mirrors aetherisTiers.TIER_ORDER. Drift is asserted in tests. */
export const SYSTEM_TIER_ORDER: ModuleTier[] = ["free", "signal", "revenue", "suite", "diagnostic", "active"];

export function systemTierRank(t: ModuleTier | null | undefined): number {
  const i = SYSTEM_TIER_ORDER.indexOf((t || "free") as ModuleTier);
  return i < 0 ? 0 : i;
}

export type RiskLevel = "read" | "draft" | "write" | "external";

/** Adapter shapes. Every one targets a function that already ships. */
export type PayloadKind = "tool_sandbox" | "scan" | "passthrough" | "internal_forecast";

/**
 * Edge functions that actually exist in this repo. An action whose `fn` is not
 * in this list is NOT executable: it degrades to a GAP_REQUIRED proposal
 * instead of pretending a placeholder adapter works.
 */
export const EXISTING_EDGE_FUNCTIONS: string[] = [
  "try-tool-sandbox",
  "scan-website",
  "send-transactional-email",
  "social-scheduler",
  "hygiene-execute",
  "company-system",
];

export function actionIsExecutable(a: Pick<ModuleAction, "fn">): boolean {
  return EXISTING_EDGE_FUNCTIONS.includes(a.fn);
}

/** Registry entries whose adapter target does not exist. Must always be empty. */
export function registryAdapterGaps(): Array<{ module_id: string; action_id: string; fn: string }> {
  const out: Array<{ module_id: string; action_id: string; fn: string }> = [];
  for (const m of UNIVERSE_MODULE_REGISTRY) {
    for (const a of m.actions) if (!actionIsExecutable(a)) out.push({ module_id: m.id, action_id: a.id, fn: a.fn });
  }
  return out;
}

export interface ModuleAction {
  /** Stable action id used by the operator action bus. */
  id: string;
  label: string;
  /** Existing edge function invoked through the adapter. Never new tool code. */
  fn: string;
  /** How the bus shapes the payload for that existing function. */
  payload_kind: PayloadKind;
  risk: RiskLevel;
  /** Required confirmation before execution (any non-read/draft action). */
  confirm: boolean;
  /** Validated input keys. Extra keys are rejected by the bus. */
  input: string[];
  rollback: string;
}

export interface UniverseModule {
  id: string;
  name: string;
  /** Existing Universe route. Never a newly invented page. */
  route: string;
  category: "diagnostics" | "brand" | "sales" | "content" | "systems" | "leadership";
  requiredTier: ModuleTier;
  capabilities: string[];
  inputs: string[];
  outputs: string[];
  actions: ModuleAction[];
  sensitivity: "low" | "medium" | "high";
}

/**
 * Registry of reusable Universe instruments. Every entry points at a route and
 * edge function that already exists — the company system composes these, it
 * never re-implements them.
 */
export const UNIVERSE_MODULE_REGISTRY: UniverseModule[] = [
  {
    id: "brand-contradictions",
    name: "Brand Contradictions",
    route: "/brand-contradictions",
    category: "brand",
    requiredTier: "signal",
    capabilities: ["brand_consistency", "messaging_alignment", "positioning_clarity"],
    inputs: ["company_context", "brand_kit", "report_findings"],
    outputs: ["approved_messaging_context", "brand_conflicts"],
    actions: [
      { id: "draft_contradictions", label: "Draft brand contradiction review", fn: "try-tool-sandbox", payload_kind: "tool_sandbox", risk: "draft", confirm: false, input: ["company_context"], rollback: "Draft only. Discard the record." },
    ],
    sensitivity: "low",
  },
  {
    id: "friction-audit",
    name: "Friction Audit",
    route: "/friction-audit",
    category: "diagnostics",
    requiredTier: "signal",
    capabilities: ["conversion_friction", "buyer_journey", "form_and_cta_quality"],
    inputs: ["company_context", "report_findings"],
    outputs: ["friction_list", "approved_messaging_context"],
    actions: [
      { id: "draft_friction_audit", label: "Draft friction audit", fn: "try-tool-sandbox", payload_kind: "tool_sandbox", risk: "draft", confirm: false, input: ["company_context"], rollback: "Draft only. Discard the record." },
    ],
    sensitivity: "low",
  },
  {
    id: "website-scanner",
    name: "Website Leak Scanner",
    route: "/scan",
    category: "diagnostics",
    requiredTier: "signal",
    capabilities: ["site_health", "recovery_measurement", "re_scan"],
    inputs: ["website_url"],
    outputs: ["scan_result", "check_signal"],
    actions: [
      { id: "run_rescan", label: "Run recovery re-scan", fn: "scan-website", payload_kind: "scan", risk: "write", confirm: true, input: ["website_url"], rollback: "Scan records are additive. Delete the scan row." },
    ],
    sensitivity: "low",
  },
  {
    id: "strategic-questions",
    name: "Strategic Questions",
    route: "/strategic-questions",
    category: "leadership",
    requiredTier: "revenue",
    capabilities: ["leadership_decisions", "owner_dependency", "prioritisation"],
    inputs: ["company_context", "report_findings"],
    outputs: ["decision_queue"],
    actions: [
      { id: "draft_questions", label: "Draft boardroom questions", fn: "try-tool-sandbox", payload_kind: "tool_sandbox", risk: "draft", confirm: false, input: ["company_context"], rollback: "Draft only." },
    ],
    sensitivity: "low",
  },
  {
    id: "sales-scripts",
    name: "Sales Scripts",
    route: "/sales-scripts",
    category: "sales",
    requiredTier: "revenue",
    capabilities: ["sales_conversion", "objection_handling", "lead_response"],
    inputs: ["approved_messaging_context", "brand_kit", "company_context"],
    outputs: ["sales_assets"],
    actions: [
      { id: "draft_scripts", label: "Draft sales scripts", fn: "try-tool-sandbox", payload_kind: "tool_sandbox", risk: "draft", confirm: false, input: ["company_context", "approved_messaging_context"], rollback: "Draft only." },
    ],
    sensitivity: "low",
  },
  {
    id: "follow-up-plan",
    name: "Follow-Up Sequences",
    route: "/follow-up-plan",
    category: "sales",
    requiredTier: "revenue",
    capabilities: ["lead_response", "pipeline_followup", "dead_lead_recovery"],
    inputs: ["approved_messaging_context", "company_context"],
    outputs: ["sequence_assets"],
    actions: [
      { id: "draft_sequence", label: "Draft follow-up sequence", fn: "try-tool-sandbox", payload_kind: "tool_sandbox", risk: "draft", confirm: false, input: ["company_context"], rollback: "Draft only." },
      { id: "send_sequence", label: "Send follow-up sequence", fn: "send-transactional-email", payload_kind: "passthrough", risk: "external", confirm: true, input: ["sequence_id", "recipients"], rollback: "Sent email cannot be recalled. Suppress the recipients and stop the sequence." },
    ],
    sensitivity: "high",
  },
  {
    id: "content-calendar",
    name: "Content Calendar Builder",
    route: "/content-calendar",
    category: "content",
    requiredTier: "revenue",
    capabilities: ["publishing_cadence", "content_planning", "visibility"],
    inputs: ["approved_messaging_context", "brand_kit"],
    outputs: ["content_plan"],
    actions: [
      { id: "draft_calendar", label: "Draft 30-day calendar", fn: "try-tool-sandbox", payload_kind: "tool_sandbox", risk: "draft", confirm: false, input: ["company_context"], rollback: "Draft only." },
    ],
    sensitivity: "low",
  },
  {
    id: "social-content",
    name: "Social Content Studio",
    route: "/try/social-content",
    category: "content",
    requiredTier: "suite",
    capabilities: ["content_production", "voice_consistency"],
    inputs: ["content_plan", "approved_messaging_context", "brand_kit"],
    outputs: ["social_posts"],
    actions: [
      { id: "draft_posts", label: "Draft social posts", fn: "try-tool-sandbox", payload_kind: "tool_sandbox", risk: "draft", confirm: false, input: ["company_context"], rollback: "Draft only." },
      { id: "schedule_posts", label: "Schedule social posts", fn: "social-scheduler", payload_kind: "passthrough", risk: "external", confirm: true, input: ["post_ids", "scheduled_for"], rollback: "Unschedule the queued posts before their send time." },
    ],
    sensitivity: "high",
  },
  {
    id: "image-studio",
    name: "Image Studio",
    route: "/try/image-studio",
    category: "content",
    requiredTier: "suite",
    capabilities: ["visual_assets", "brand_imagery"],
    inputs: ["brand_kit", "content_plan"],
    outputs: ["image_assets"],
    actions: [
      { id: "draft_images", label: "Draft imagery direction brief", fn: "try-tool-sandbox", payload_kind: "tool_sandbox", risk: "draft", confirm: false, input: ["company_context"], rollback: "Draft only. Discard the brief." },
    ],
    sensitivity: "low",
  },
  {
    id: "creation-studio",
    name: "Creation Studio",
    route: "/try/creation-studio",
    category: "content",
    requiredTier: "diagnostic",
    capabilities: ["mixed_media_assets", "campaign_assets"],
    inputs: ["brand_kit", "content_plan"],
    outputs: ["campaign_assets"],
    actions: [
      { id: "draft_assets", label: "Draft campaign assets", fn: "try-tool-sandbox", payload_kind: "tool_sandbox", risk: "draft", confirm: false, input: ["company_context"], rollback: "Draft only." },
    ],
    sensitivity: "low",
  },
  {
    id: "playbook-generator",
    name: "Playbook Generator",
    route: "/try/playbook-generator",
    category: "systems",
    requiredTier: "diagnostic",
    capabilities: ["process_documentation", "operating_procedure", "staff_enablement"],
    inputs: ["company_context", "report_findings"],
    outputs: ["playbooks"],
    actions: [
      { id: "draft_playbook", label: "Draft operating playbook", fn: "try-tool-sandbox", payload_kind: "tool_sandbox", risk: "draft", confirm: false, input: ["company_context"], rollback: "Draft only." },
    ],
    sensitivity: "low",
  },
  {
    id: "lead-flow",
    name: "Lead Flow & CRM Hygiene",
    route: "/admin",
    category: "systems",
    requiredTier: "diagnostic",
    capabilities: ["lead_capture", "crm_data_quality", "lead_response_time", "pipeline_hygiene"],
    inputs: ["company_context", "report_findings"],
    outputs: ["hygiene_actions", "check_signal"],
    actions: [
      { id: "draft_hygiene_plan", label: "Draft CRM hygiene plan", fn: "try-tool-sandbox", payload_kind: "tool_sandbox", risk: "draft", confirm: false, input: ["company_context"], rollback: "Draft only." },
      { id: "apply_hygiene_action", label: "Apply CRM hygiene action", fn: "hygiene-execute", payload_kind: "passthrough", risk: "external", confirm: true, input: ["action_id"], rollback: "Hygiene actions log prior values; re-apply the logged snapshot." },
    ],
    sensitivity: "high",
  },
  {
    id: "forecasting",
    name: "Recovery Forecasting",
    route: "/admin",
    category: "leadership",
    requiredTier: "diagnostic",
    capabilities: ["forecasting", "recovery_tracking", "kpi_baseline"],
    inputs: ["canonical_ledger", "check_signal"],
    outputs: ["forecast_scenarios"],
    actions: [
      { id: "refresh_forecast", label: "Refresh recovery forecast", fn: "company-system", payload_kind: "internal_forecast", risk: "write", confirm: true, input: ["system_id"], rollback: "Forecast rows are versioned; restore the prior version." },
    ],
    sensitivity: "medium",
  },
  {
    id: "tool-generator",
    name: "Tool Generator",
    route: "/try/tool-generator",
    category: "systems",
    requiredTier: "diagnostic",
    capabilities: ["gap_fill", "custom_module_scaffold"],
    inputs: ["capability_brief"],
    outputs: ["module_scaffold"],
    actions: [
      { id: "draft_module_scaffold", label: "Propose module scaffold", fn: "try-tool-sandbox", payload_kind: "tool_sandbox", risk: "draft", confirm: false, input: ["capability_brief"], rollback: "Proposal only. Requires operator approval before enabling." },
    ],
    sensitivity: "medium",
  },
];

export function findModule(id: string): UniverseModule | undefined {
  return UNIVERSE_MODULE_REGISTRY.find((m) => m.id === id);
}

export function moduleAllowedForTier(moduleId: string, clientTier: ModuleTier | null | undefined): boolean {
  const m = findModule(moduleId);
  if (!m) return false;
  return systemTierRank(clientTier) >= systemTierRank(m.requiredTier);
}

/* ── Capability matching ─────────────────────────────────────────────────── */

/** Keyword → capability signals used to map report root causes onto modules. */
const CAPABILITY_SIGNALS: Array<{ capability: string; words: string[] }> = [
  { capability: "brand_consistency", words: ["brand", "message", "messaging", "positioning", "voice", "inconsistent", "identity"] },
  { capability: "conversion_friction", words: ["friction", "conversion", "form", "cta", "checkout", "navigation", "ux", "mobile"] },
  { capability: "site_health", words: ["website", "site", "page speed", "seo", "broken", "load", "meta"] },
  { capability: "lead_capture", words: ["lead", "capture", "inquiry", "contact form", "intake"] },
  { capability: "lead_response_time", words: ["response", "follow up", "follow-up", "slow", "reply", "speed to lead"] },
  { capability: "pipeline_followup", words: ["pipeline", "nurture", "sequence", "stalled", "dormant"] },
  { capability: "dead_lead_recovery", words: ["dead lead", "cold", "lost", "unworked", "reactivation"] },
  { capability: "crm_data_quality", words: ["crm", "data", "duplicate", "missing", "record", "hygiene", "tracking"] },
  { capability: "sales_conversion", words: ["sales", "close", "quote", "proposal", "objection", "script", "pitch"] },
  { capability: "publishing_cadence", words: ["content", "publishing", "blog", "cadence", "posting", "inactive"] },
  { capability: "content_production", words: ["social", "post", "linkedin", "engagement", "audience"] },
  { capability: "visual_assets", words: ["image", "photo", "visual", "creative", "design"] },
  { capability: "process_documentation", words: ["process", "playbook", "sop", "training", "onboarding", "handoff"] },
  { capability: "leadership_decisions", words: ["owner", "leadership", "decision", "strategy", "priority", "accountability", "hiring", "staff"] },
  { capability: "forecasting", words: ["forecast", "revenue", "projection", "growth", "target"] },
];

export function capabilitiesForText(text: string): string[] {
  const t = (text || "").toLowerCase();
  const hits = new Set<string>();
  for (const sig of CAPABILITY_SIGNALS) {
    if (sig.words.some((w) => t.includes(w))) hits.add(sig.capability);
  }
  return [...hits];
}

export interface RootCauseInput {
  id: string;
  title: string;
  detail?: string;
  priority?: number;
  classification?: "AUTOMATABLE" | "ASSISTED" | "HUMAN_REQUIRED";
}

export interface SelectedModule {
  module_id: string;
  module_name: string;
  route: string;
  required_tier: ModuleTier;
  category: UniverseModule["category"];
  capabilities: string[];
  root_cause_ids: string[];
  locked: boolean;
  lock_reason: string | null;
  display_order: number;
}

export interface Gap {
  root_cause_id: string;
  title: string;
  status: "GAP_REQUIRED";
  proposed_capability: string;
  note: string;
}

export interface Connection {
  from_module: string;
  to_module: string;
  payload: string;
}

export interface CompositionResult {
  modules: SelectedModule[];
  gaps: Gap[];
  connections: Connection[];
  coverage: { total: number; covered: number; uncovered: string[] };
}

const FALLBACK_BY_CLASSIFICATION: Record<string, string> = {
  HUMAN_REQUIRED: "strategic-questions",
  ASSISTED: "playbook-generator",
};

/**
 * Maps every unique root cause onto existing Universe modules and builds the
 * directed connection graph. Locked modules are still surfaced (recommended)
 * but flagged so the live system never executes outside the client's tier.
 */
export function composeCompanySystem(
  rootCauses: RootCauseInput[],
  clientTier: ModuleTier | null | undefined,
): CompositionResult {
  const byModule = new Map<string, SelectedModule>();
  const gaps: Gap[] = [];
  const uncovered: string[] = [];

  const seen = new Set<string>();
  const unique = rootCauses.filter((rc) => {
    if (!rc?.id || seen.has(rc.id)) return false;
    seen.add(rc.id);
    return true;
  });

  for (const rc of unique) {
    const caps = capabilitiesForText(`${rc.title} ${rc.detail || ""}`);
    let matched = UNIVERSE_MODULE_REGISTRY.filter((m) => m.capabilities.some((c) => caps.includes(c)));

    if (!matched.length) {
      const fb = FALLBACK_BY_CLASSIFICATION[rc.classification || ""];
      if (fb) matched = UNIVERSE_MODULE_REGISTRY.filter((m) => m.id === fb);
    }

    if (!matched.length) {
      uncovered.push(rc.id);
      gaps.push({
        root_cause_id: rc.id,
        title: rc.title,
        status: "GAP_REQUIRED",
        proposed_capability: rc.title.toLowerCase().slice(0, 80),
        note: "No existing Universe instrument covers this. Tool Generator may scaffold a proposed module. Operator approval required before enabling.",
      });
      continue;
    }

    for (const m of matched) {
      const existing = byModule.get(m.id);
      if (existing) {
        if (!existing.root_cause_ids.includes(rc.id)) existing.root_cause_ids.push(rc.id);
        continue;
      }
      const allowed = moduleAllowedForTier(m.id, clientTier);
      byModule.set(m.id, {
        module_id: m.id,
        module_name: m.name,
        route: m.route,
        required_tier: m.requiredTier,
        category: m.category,
        capabilities: m.capabilities.filter((c) => caps.includes(c)),
        root_cause_ids: [rc.id],
        locked: !allowed,
        lock_reason: allowed ? null : `Recommended but locked. Requires the ${m.requiredTier} tier.`,
        display_order: 0,
      });
    }
  }

  const ORDER: UniverseModule["category"][] = ["diagnostics", "brand", "sales", "content", "systems", "leadership"];
  const modules = [...byModule.values()].sort(
    (a, b) => ORDER.indexOf(a.category) - ORDER.indexOf(b.category) || a.module_id.localeCompare(b.module_id),
  );
  modules.forEach((m, i) => { m.display_order = i; });

  const ids = new Set(modules.map((m) => m.module_id));
  const connections: Connection[] = [];
  for (const m of modules) {
    const mod = findModule(m.module_id)!;
    for (const other of modules) {
      if (other.module_id === m.module_id) continue;
      const target = findModule(other.module_id)!;
      const payload = mod.outputs.find((o) => target.inputs.includes(o));
      if (payload) connections.push({ from_module: m.module_id, to_module: other.module_id, payload });
    }
  }
  // Deterministic, de-duplicated graph over existing nodes only.
  const dedup = new Map<string, Connection>();
  for (const c of connections) {
    if (!ids.has(c.from_module) || !ids.has(c.to_module)) continue;
    dedup.set(`${c.from_module}>${c.to_module}>${c.payload}`, c);
  }

  return {
    modules,
    gaps,
    connections: [...dedup.values()].sort((a, b) => `${a.from_module}${a.to_module}`.localeCompare(`${b.from_module}${b.to_module}`)),
    coverage: { total: unique.length, covered: unique.length - uncovered.length, uncovered },
  };
}

/* ── Tenant scope ────────────────────────────────────────────────────────── */

export type ActorRole = "admin" | "operator" | "viewer";

/**
 * Every non-admin, non-internal caller is pinned to an explicit set of owner
 * codes. There is no "authenticated therefore global" state: a scope with no
 * codes can read nothing, and a row with no owner is admin-only.
 */
export interface TenantScope {
  kind: "admin" | "codes";
  codes: string[];
}

export const ADMIN_SCOPE: TenantScope = { kind: "admin", codes: [] };

export function codeScope(codes: Array<string | null | undefined>): TenantScope {
  return { kind: "codes", codes: [...new Set(codes.filter((c): c is string => !!c))] };
}

/** Default deny: unowned rows and out-of-scope owners are both refused. */
export function scopeAllows(scope: TenantScope, ownerCode: string | null | undefined): boolean {
  if (scope.kind === "admin") return true;
  if (!ownerCode) return false;
  return scope.codes.includes(ownerCode);
}

/* ── Deterministic hashing (shared by confirmation binding) ──────────────── */

export function stableStringify(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value ?? null);
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(",")}]`;
  const obj = value as Record<string, unknown>;
  return `{${Object.keys(obj).sort().map((k) => `${JSON.stringify(k)}:${stableStringify(obj[k])}`).join(",")}}`;
}

export function hashString(s: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; }
  let g = 0x811c9dc5;
  for (let i = s.length - 1; i >= 0; i--) { g ^= s.charCodeAt(i); g = Math.imul(g, 0x01000193) >>> 0; }
  return `${h.toString(16).padStart(8, "0")}${g.toString(16).padStart(8, "0")}${s.length.toString(16)}`;
}

export function inputHash(input: Record<string, unknown> | undefined | null): string {
  return hashString(stableStringify(input ?? {}));
}

/* ── Action bus validation ───────────────────────────────────────────────── */

export interface ActionRequest {
  module_id: string;
  action_id: string;
  input?: Record<string, unknown>;
}

/** Server-issued, single-use plan record. The client never mints one. */
export interface ConfirmationClaim {
  token: string;
  actor: string;
  system_id: string;
  module_id: string;
  action_id: string;
  input_hash: string;
  source_report_hash: string;
  system_version: number;
  affects: string[];
  expires_at: string;
  consumed_at?: string | null;
}

export const CONFIRMATION_TTL_MS = 5 * 60 * 1000;

export interface ActionPreview {
  module: string;
  action: string;
  fn: string;
  risk: RiskLevel;
  rollback: string;
  affects: string[];
  check_after: string;
}

export interface ActionDecision {
  ok: boolean;
  error?: string;
  requires_confirmation: boolean;
  preview?: ActionPreview;
}

export interface ActionContext {
  clientTier: ModuleTier | null | undefined;
  enabledModuleIds: string[];
  role: ActorRole;
  /** Company system approval_state; writes need "approved". */
  systemApprovalState?: string | null;
  /** Active brand context status; writes need "approved". */
  brandStatus?: string | null;
  /** Present only on execute. Must have been issued by action_preview. */
  confirmation?: ConfirmationClaim | null;
  actor?: string;
  systemId?: string;
  sourceReportHash?: string;
  systemVersion?: number;
  now?: number;
}

const deny = (error: string): ActionDecision => ({ ok: false, requires_confirmation: false, error });

/**
 * The operator may only call registered, permissioned module actions with
 * validated schemas. Never arbitrary code, never an unlisted function, and
 * never a write without a server-issued confirmation bound to this exact plan.
 */
export function validateAction(req: ActionRequest, ctx: ActionContext): ActionDecision {
  const mod = findModule(req.module_id);
  if (!mod) return deny("Unknown module");
  const action = mod.actions.find((a) => a.id === req.action_id);
  if (!action) return deny("Unknown action for module");
  if (!actionIsExecutable(action)) {
    return deny("Capability is not implemented yet (GAP_REQUIRED). Propose a module scaffold instead.");
  }
  if (!ctx.enabledModuleIds.includes(mod.id)) return deny("Module is not enabled in this company system");
  if (!moduleAllowedForTier(mod.id, ctx.clientTier)) {
    return deny(`Locked. Requires the ${mod.requiredTier} tier.`);
  }
  if (ctx.role === "viewer" && action.risk !== "read") return deny("Viewer role may not execute actions");

  const input = req.input || {};
  const extra = Object.keys(input).filter((k) => !action.input.includes(k));
  if (extra.length) return deny(`Unexpected input keys: ${extra.join(", ")}`);
  const missing = action.input.filter((k) => input[k] === undefined || input[k] === null || input[k] === "");
  if (missing.length) return deny(`Missing required input: ${missing.join(", ")}`);

  const preview: ActionPreview = {
    module: mod.name,
    action: action.label,
    fn: action.fn,
    risk: action.risk,
    rollback: action.rollback,
    affects: mod.outputs,
    check_after: `Run the registered check for ${mod.name} and record whether the goal moved.`,
  };

  // Reads and drafts stay immediate: they produce nothing live and nothing external.
  if (!action.confirm) return { ok: true, requires_confirmation: false, preview };

  // Everything that changes live behaviour needs an approved system + brand.
  if (ctx.systemApprovalState !== "approved") {
    return { ok: false, requires_confirmation: false, preview, error: "Company system is not approved for execution." };
  }
  if (ctx.brandStatus !== "approved") {
    return { ok: false, requires_confirmation: false, preview, error: "Brand facts must be approved before live actions." };
  }

  const c = ctx.confirmation;
  if (!c) return { ok: false, requires_confirmation: true, preview, error: "Confirmation required" };
  const bad = confirmationMismatch(c, req, ctx);
  if (bad) return { ok: false, requires_confirmation: true, preview, error: bad };

  return { ok: true, requires_confirmation: false, preview };
}

/** Returns the reason a confirmation token cannot be spent, or null when valid. */
export function confirmationMismatch(
  c: ConfirmationClaim,
  req: ActionRequest,
  ctx: ActionContext,
): string | null {
  const now = ctx.now ?? Date.now();
  if (c.consumed_at) return "Confirmation already used.";
  if (new Date(c.expires_at).getTime() <= now) return "Confirmation expired. Preview the action again.";
  if (ctx.actor && c.actor !== ctx.actor) return "Confirmation was issued to a different operator.";
  if (ctx.systemId && c.system_id !== ctx.systemId) return "Confirmation belongs to a different system.";
  if (c.module_id !== req.module_id || c.action_id !== req.action_id) return "Confirmation does not match this action.";
  if (c.input_hash !== inputHash(req.input)) return "Inputs changed after confirmation. Preview again.";
  if (ctx.sourceReportHash && c.source_report_hash !== ctx.sourceReportHash) {
    return "Source report changed after confirmation. Preview again.";
  }
  if (ctx.systemVersion !== undefined && c.system_version !== ctx.systemVersion) {
    return "System version changed after confirmation. Preview again.";
  }
  return null;
}

/** Issues the claim body that the server persists for single-use consumption. */
export function buildConfirmation(
  req: ActionRequest,
  ctx: Required<Pick<ActionContext, "actor" | "systemId" | "sourceReportHash" | "systemVersion">> & { affects: string[]; now?: number },
): Omit<ConfirmationClaim, "token"> {
  const now = ctx.now ?? Date.now();
  return {
    actor: ctx.actor,
    system_id: ctx.systemId,
    module_id: req.module_id,
    action_id: req.action_id,
    input_hash: inputHash(req.input),
    source_report_hash: ctx.sourceReportHash,
    system_version: ctx.systemVersion,
    affects: ctx.affects,
    expires_at: new Date(now + CONFIRMATION_TTL_MS).toISOString(),
    consumed_at: null,
  };
}



/* ── Memory ──────────────────────────────────────────────────────────────── */

export type MemoryScope = "business" | "report" | "system" | "conversation";
export type MemoryStatus = "inferred" | "approved" | "rejected" | "superseded";

export interface MemoryItem {
  scope: MemoryScope;
  key: string;
  value: string;
  provenance: string;
  confidence: number;
  status: MemoryStatus;
  sensitivity?: "low" | "medium" | "high";
  expires_at?: string | null;
}

export function validateMemoryItem(item: Partial<MemoryItem>): { ok: boolean; error?: string } {
  const scopes: MemoryScope[] = ["business", "report", "system", "conversation"];
  const statuses: MemoryStatus[] = ["inferred", "approved", "rejected", "superseded"];
  if (!item.scope || !scopes.includes(item.scope)) return { ok: false, error: "Invalid memory scope" };
  if (!item.key || !String(item.key).trim()) return { ok: false, error: "Memory key required" };
  if (item.value === undefined || item.value === null || !String(item.value).trim()) return { ok: false, error: "Memory value required" };
  if (!item.provenance || !String(item.provenance).trim()) return { ok: false, error: "Provenance required" };
  if (item.status && !statuses.includes(item.status)) return { ok: false, error: "Invalid memory status" };
  const c = item.confidence;
  if (c !== undefined && (typeof c !== "number" || c < 0 || c > 1)) return { ok: false, error: "Confidence must be 0..1" };
  return { ok: true };
}

export interface StoredMemoryItem extends MemoryItem {
  company_id: string;
  scan_id?: string | null;
  system_id?: string | null;
  updated_at?: string | null;
}

export interface MemoryRetrievalContext {
  companyId: string;
  scanId?: string | null;
  systemId?: string | null;
  /** high-sensitivity memory is withheld from viewers. */
  role?: ActorRole;
  now?: number;
}

/** Retrieval is always scoped to the authenticated company/report/system. */
export function memoryRetrievalFilter(ctx: { companyId: string; scanId?: string | null; systemId?: string | null }) {
  if (!ctx.companyId) throw new Error("companyId required for memory retrieval");
  return {
    company_id: ctx.companyId,
    scan_id: ctx.scanId ?? null,
    system_id: ctx.systemId ?? null,
  };
}

/**
 * Scope gate. business memory belongs to the company; report memory only to
 * the current scan; system + conversation memory only to the current system.
 * Two reports under one company can never read each other's memory.
 */
export function memoryInScope(item: StoredMemoryItem, ctx: MemoryRetrievalContext): boolean {
  if (!ctx.companyId || item.company_id !== ctx.companyId) return false;
  switch (item.scope) {
    case "business":
      return true;
    case "report":
      return !!ctx.scanId && item.scan_id === ctx.scanId;
    case "system":
    case "conversation":
      return !!ctx.systemId && item.system_id === ctx.systemId;
    default:
      return false;
  }
}

/** Only approved (or high-confidence inferred, clearly labelled) memory is used. */
export function activeMemory(items: MemoryItem[], now = Date.now()): MemoryItem[] {
  return items.filter((i) => {
    if (i.status === "rejected" || i.status === "superseded") return false;
    if (i.expires_at && new Date(i.expires_at).getTime() <= now) return false;
    return i.status === "approved" || (i.status === "inferred" && i.confidence >= 0.6);
  });
}

/** The single retrieval entry point used by the report AI / operator. */
export function selectMemory(items: StoredMemoryItem[], ctx: MemoryRetrievalContext): StoredMemoryItem[] {
  const now = ctx.now ?? Date.now();
  const scoped = items.filter((i) => memoryInScope(i, ctx));
  const live = activeMemory(scoped, now) as StoredMemoryItem[];
  return ctx.role === "viewer" ? live.filter((i) => i.sensitivity !== "high") : live;
}


/* ── Idempotency ─────────────────────────────────────────────────────────── */

export const COMPANY_SYSTEM_TEMPLATE_VERSION = "aetheris-company-system-1";

/** Deterministic identity for a composed system: same report + template = same system. */
export function systemFingerprint(sourceReportHash: string, templateVersion = COMPANY_SYSTEM_TEMPLATE_VERSION): string {
  return `${sourceReportHash}:${templateVersion}`;
}

export function shouldRecompose(
  existing: { source_report_hash?: string | null; template_version?: string | null } | null,
  sourceReportHash: string,
  templateVersion = COMPANY_SYSTEM_TEMPLATE_VERSION,
): boolean {
  if (!existing) return true;
  return systemFingerprint(existing.source_report_hash || "", existing.template_version || "") !==
    systemFingerprint(sourceReportHash, templateVersion);
}

/* ── Brand context ───────────────────────────────────────────────────────── */

export interface BrandContext {
  version: number;
  status: "draft" | "approved";
  logo_urls: string[];
  colors: string[];
  typography: string[];
  imagery_direction: string | null;
  tone: string | null;
  terminology: string[];
  audience: string | null;
  cta_style: string | null;
  inferred_fields: string[];
}

/** Builds a versioned design context from forensic_scans.brand_kit evidence. */
export function buildBrandContext(brandKit: unknown, version = 1): BrandContext {
  const bk = (brandKit || {}) as Record<string, unknown>;
  const arr = (v: unknown): string[] =>
    Array.isArray(v) ? v.map((x) => String(x)).filter(Boolean) : typeof v === "string" && v ? [v] : [];
  const str = (v: unknown): string | null => (typeof v === "string" && v.trim() ? v.trim() : null);

  const colors = arr(bk.colors ?? bk.palette);
  const typography = arr(bk.fonts ?? bk.typography);
  const logos = arr(bk.logo_urls ?? bk.logos ?? bk.logo);
  const tone = str(bk.tone ?? bk.voice);
  const audience = str(bk.audience);
  const cta = str(bk.cta_style ?? bk.cta);
  const imagery = str(bk.imagery ?? bk.imagery_direction);

  const inferred: string[] = [];
  if (!colors.length) inferred.push("colors");
  if (!typography.length) inferred.push("typography");
  if (!tone) inferred.push("tone");
  if (!audience) inferred.push("audience");
  if (!cta) inferred.push("cta_style");
  if (!imagery) inferred.push("imagery_direction");

  return {
    version,
    status: "draft",
    logo_urls: logos,
    colors,
    typography,
    imagery_direction: imagery,
    tone,
    terminology: arr(bk.terminology ?? bk.keywords),
    audience,
    cta_style: cta,
    inferred_fields: inferred,
  };
}

/** Inferred brand values never become active facts without operator approval. */
export function brandContextIsActive(ctx: Pick<BrandContext, "status">): boolean {
  return ctx.status === "approved";
}
