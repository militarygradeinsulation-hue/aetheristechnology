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

export interface ModuleAction {
  /** Stable action id used by the operator action bus. */
  id: string;
  label: string;
  /** Existing edge function invoked through the adapter. Never new tool code. */
  fn: string;
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
      { id: "draft_contradictions", label: "Draft brand contradiction review", fn: "generate-tool-output", risk: "draft", confirm: false, input: ["company_context"], rollback: "Draft only. Discard the record." },
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
      { id: "draft_friction_audit", label: "Draft friction audit", fn: "generate-tool-output", risk: "draft", confirm: false, input: ["company_context"], rollback: "Draft only. Discard the record." },
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
      { id: "run_rescan", label: "Run recovery re-scan", fn: "website-scan", risk: "write", confirm: true, input: ["website_url"], rollback: "Scan records are additive. Delete the scan row." },
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
      { id: "draft_questions", label: "Draft boardroom questions", fn: "generate-tool-output", risk: "draft", confirm: false, input: ["company_context"], rollback: "Draft only." },
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
      { id: "draft_scripts", label: "Draft sales scripts", fn: "generate-tool-output", risk: "draft", confirm: false, input: ["company_context", "approved_messaging_context"], rollback: "Draft only." },
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
      { id: "draft_sequence", label: "Draft follow-up sequence", fn: "generate-tool-output", risk: "draft", confirm: false, input: ["company_context"], rollback: "Draft only." },
      { id: "send_sequence", label: "Send follow-up sequence", fn: "send-email", risk: "external", confirm: true, input: ["sequence_id", "recipients"], rollback: "Sent email cannot be recalled. Suppress the recipients and stop the sequence." },
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
      { id: "draft_calendar", label: "Draft 30-day calendar", fn: "generate-tool-output", risk: "draft", confirm: false, input: ["company_context"], rollback: "Draft only." },
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
      { id: "draft_posts", label: "Draft social posts", fn: "generate-tool-output", risk: "draft", confirm: false, input: ["company_context"], rollback: "Draft only." },
      { id: "schedule_posts", label: "Schedule social posts", fn: "social-scheduler", risk: "external", confirm: true, input: ["post_ids", "scheduled_for"], rollback: "Unschedule the queued posts before their send time." },
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
      { id: "draft_images", label: "Generate on-brand imagery", fn: "generate-image", risk: "draft", confirm: false, input: ["prompt"], rollback: "Delete the generated asset." },
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
      { id: "draft_assets", label: "Draft campaign assets", fn: "generate-tool-output", risk: "draft", confirm: false, input: ["company_context"], rollback: "Draft only." },
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
      { id: "draft_playbook", label: "Draft operating playbook", fn: "generate-tool-output", risk: "draft", confirm: false, input: ["company_context"], rollback: "Draft only." },
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
      { id: "draft_hygiene_plan", label: "Draft CRM hygiene plan", fn: "generate-tool-output", risk: "draft", confirm: false, input: ["company_context"], rollback: "Draft only." },
      { id: "apply_hygiene_action", label: "Apply CRM hygiene action", fn: "hygiene-execute", risk: "external", confirm: true, input: ["action_id"], rollback: "Hygiene actions log prior values; re-apply the logged snapshot." },
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
      { id: "refresh_forecast", label: "Refresh recovery forecast", fn: "company-system", risk: "write", confirm: true, input: ["system_id"], rollback: "Forecast rows are versioned; restore the prior version." },
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
      { id: "draft_module_scaffold", label: "Propose module scaffold", fn: "generate-tool-output", risk: "draft", confirm: false, input: ["capability_brief"], rollback: "Proposal only. Requires operator approval before enabling." },
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

/* ── Action bus validation ───────────────────────────────────────────────── */

export interface ActionRequest {
  module_id: string;
  action_id: string;
  input?: Record<string, unknown>;
  confirmed?: boolean;
}

export interface ActionDecision {
  ok: boolean;
  error?: string;
  requires_confirmation: boolean;
  preview?: {
    module: string;
    action: string;
    fn: string;
    risk: RiskLevel;
    rollback: string;
    affects: string[];
  };
}

/**
 * The operator may only call registered, permissioned module actions with
 * validated schemas. Never arbitrary code, never an unlisted function.
 */
export function validateAction(
  req: ActionRequest,
  ctx: { clientTier: ModuleTier | null | undefined; enabledModuleIds: string[]; role: "admin" | "operator" | "viewer" },
): ActionDecision {
  const mod = findModule(req.module_id);
  if (!mod) return { ok: false, requires_confirmation: false, error: "Unknown module" };
  const action = mod.actions.find((a) => a.id === req.action_id);
  if (!action) return { ok: false, requires_confirmation: false, error: "Unknown action for module" };
  if (!ctx.enabledModuleIds.includes(mod.id)) {
    return { ok: false, requires_confirmation: false, error: "Module is not enabled in this company system" };
  }
  if (!moduleAllowedForTier(mod.id, ctx.clientTier)) {
    return { ok: false, requires_confirmation: false, error: `Locked. Requires the ${mod.requiredTier} tier.` };
  }
  if (ctx.role === "viewer" && action.risk !== "read") {
    return { ok: false, requires_confirmation: false, error: "Viewer role may not execute actions" };
  }
  const input = req.input || {};
  const extra = Object.keys(input).filter((k) => !action.input.includes(k));
  if (extra.length) return { ok: false, requires_confirmation: false, error: `Unexpected input keys: ${extra.join(", ")}` };
  const missing = action.input.filter((k) => input[k] === undefined || input[k] === null || input[k] === "");
  if (missing.length) return { ok: false, requires_confirmation: false, error: `Missing required input: ${missing.join(", ")}` };

  const preview = {
    module: mod.name,
    action: action.label,
    fn: action.fn,
    risk: action.risk,
    rollback: action.rollback,
    affects: mod.outputs,
  };
  if (action.confirm && !req.confirmed) {
    return { ok: false, requires_confirmation: true, preview, error: "Confirmation required" };
  }
  return { ok: true, requires_confirmation: false, preview };
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

/** Retrieval is always scoped to the authenticated company/report/system. */
export function memoryRetrievalFilter(ctx: { companyId: string; scanId?: string | null; systemId?: string | null }) {
  if (!ctx.companyId) throw new Error("companyId required for memory retrieval");
  return {
    company_id: ctx.companyId,
    scan_id: ctx.scanId ?? null,
    system_id: ctx.systemId ?? null,
  };
}

/** Only approved (or high-confidence inferred, clearly labelled) memory is used. */
export function activeMemory(items: MemoryItem[]): MemoryItem[] {
  return items.filter((i) => i.status === "approved" || (i.status === "inferred" && i.confidence >= 0.6));
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
