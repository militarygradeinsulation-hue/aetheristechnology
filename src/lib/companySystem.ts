// Client access to the Aetheris Company System control plane.
// Admin surfaces pass the admin PIN token; portal surfaces pass the portal token.

import { supabase } from "@/integrations/supabase/client";
import { getAdminToken } from "@/lib/adminAuth";
import type { UniverseModule } from "@/lib/universeSystem";

export interface CompanySystemRow {
  id: string;
  company_id: string;
  archive_id: string | null;
  scan_id: string;
  blueprint_id: string | null;
  system_version: number;
  template_version: string;
  source_report_hash: string;
  brand_context_id: string | null;
  brand_version: number | null;
  tier: string;
  status: string;
  approval_state: string;
  manifest: Record<string, unknown>;
  coverage: { total?: number; covered?: number; uncovered?: string[] };
  rep_code: string | null;
  created_at: string;
}

export interface SystemModuleRow {
  id: string;
  module_id: string;
  module_name: string;
  route: string | null;
  category: string | null;
  required_tier: string | null;
  capabilities: string[];
  root_cause_ids: string[];
  display_order: number;
  enabled: boolean;
  locked: boolean;
  lock_reason: string | null;
  gap_status: string | null;
}

export interface SystemConnectionRow { id: string; from_module: string; to_module: string; payload: string }
export interface SystemGoalRow {
  id: string; root_cause_id: string | null; module_id: string | null; title: string;
  classification: string | null; baseline: string | null; kpi: string | null; target: string | null;
  owner_role: string | null; priority: number; review_cadence: string | null; status: string;
}
export interface SystemCheckRow {
  id: string; name: string; evidence_basis: string | null; threshold: string | null;
  alert: string | null; last_status: string | null; last_run_at: string | null;
}
export interface SystemForecastRow {
  id: string; version: number; basis: string | null; assumptions: string[];
  canonical_annual_low: number | null; canonical_annual_high: number | null; currency: string;
  scenarios: Array<{ name: string; recovery_percent: number; rationale: string }>;
}
export interface SystemEventRow {
  id: string; actor: string | null; actor_role: string | null; kind: string; module_id: string | null;
  action_id: string | null; status: string; error_message: string | null; rollback_note: string | null;
  preview: Record<string, unknown> | null; result: Record<string, unknown> | null; created_at: string;
}
export interface MemoryRow {
  id: string; company_id: string; scope: string; memory_key: string; value: string;
  provenance: string; confidence: number; status: string; sensitivity: string;
  author: string | null; last_verified_at: string | null; updated_at: string;
}
export interface BrandContextRow {
  id: string; version: number; status: string; logo_urls: string[]; colors: string[];
  typography: string[]; imagery_direction: string | null; tone: string | null; terminology: string[];
  audience: string | null; cta_style: string | null; inferred_fields: string[];
  approved_by: string | null; approved_at: string | null;
}

export interface WorkspacePayload {
  system: CompanySystemRow;
  company: { id: string; display_name: string; primary_domain: string | null; website_url: string | null; business_summary: string | null } | null;
  archive: { annual_low: number | null; annual_high: number | null; executive_summary: string | null; report_state: string | null; scan_id: string } | null;
  brand: BrandContextRow | null;
  modules: SystemModuleRow[];
  connections: SystemConnectionRow[];
  goals: SystemGoalRow[];
  checks: SystemCheckRow[];
  forecasts: SystemForecastRow[];
  events: SystemEventRow[];
  memory: MemoryRow[];
  registry: UniverseModule[];
}

function headers(portalToken?: string | null): Record<string, string> {
  if (portalToken) return { "x-portal-token": portalToken };
  const t = getAdminToken();
  return t ? { "x-admin-token": t } : {};
}

async function call<T>(body: Record<string, unknown>, portalToken?: string | null): Promise<T> {
  const { data, error } = await supabase.functions.invoke("company-system", { body, headers: headers(portalToken) });
  if (error) throw new Error((data as { error?: string })?.error || error.message);
  if ((data as { error?: string })?.error) throw new Error((data as { error: string }).error);
  return data as T;
}

export const seedRegistry = () => call<{ seeded: number }>({ action: "seed_registry" });

export const composeSystem = (scanId: string, tier = "diagnostic", force = false, portalToken?: string | null) =>
  call<{ system: CompanySystemRow; reused: boolean }>({ action: "compose", scan_id: scanId, tier, force }, portalToken);

export interface BatchResult {
  processed: number;
  created: number;
  reused: number;
  failed: Array<{ scan_id: string; error?: string }>;
  eligible_total: number;
  systems_total: number;
}

/** Controlled historical queue: bounded per call, resumable, idempotent. */
export const composeBatch = (limit = 5, tier = "diagnostic") =>
  call<BatchResult>({ action: "compose_batch", limit, tier });


export const getWorkspace = (systemId: string, portalToken?: string | null) =>
  call<WorkspacePayload>({ action: "get", system_id: systemId }, portalToken);

export const listSystems = (companyId?: string, portalToken?: string | null) =>
  call<{ systems: CompanySystemRow[] }>({ action: "list", company_id: companyId }, portalToken);

export const setModuleEnabled = (systemId: string, moduleId: string, enabled: boolean, portalToken?: string | null) =>
  call<{ module: SystemModuleRow }>({ action: "module_set_enabled", system_id: systemId, module_id: moduleId, enabled }, portalToken);

export const approveSystem = (systemId: string, approvalState: "draft" | "approved" | "rejected") =>
  call<{ system: CompanySystemRow }>({ action: "approve_system", system_id: systemId, approval_state: approvalState });

export const setBrandStatus = (brandContextId: string, status: "draft" | "approved") =>
  call<{ brand: BrandContextRow }>({ action: "brand_set_status", brand_context_id: brandContextId, status });

export const operatorChat = (
  systemId: string,
  question: string,
  history: Array<{ role: string; content: string }> = [],
  portalToken?: string | null,
) => call<{ answer: string }>({ action: "operator_chat", system_id: systemId, question, history }, portalToken);

export const previewAction = (
  systemId: string, moduleId: string, actionId: string, input: Record<string, unknown>, portalToken?: string | null,
) => call<{ ok: boolean; requires_confirmation: boolean; error?: string; preview?: Record<string, unknown> }>(
  { action: "action_preview", system_id: systemId, module_id: moduleId, action_id: actionId, input }, portalToken);

export const executeAction = (
  systemId: string, moduleId: string, actionId: string, input: Record<string, unknown>, portalToken?: string | null,
) => call<{ ok: boolean; status: string; rollback: string; error?: string }>(
  { action: "action_execute", system_id: systemId, module_id: moduleId, action_id: actionId, input, confirmed: true }, portalToken);

export const upsertMemory = (
  companyId: string,
  item: { scope: string; key: string; value: string; provenance: string; confidence?: number; status?: string; system_id?: string; scan_id?: string },
  portalToken?: string | null,
) => call<{ memory: MemoryRow }>({ action: "memory_upsert", company_id: companyId, item: { ...item, company_id: companyId } }, portalToken);

export const setMemoryStatus = (memoryId: string, status: string, portalToken?: string | null) =>
  call<{ memory: MemoryRow }>({ action: "memory_set_status", memory_id: memoryId, status }, portalToken);

export const forgetMemory = (memoryId: string) => call<{ ok: boolean }>({ action: "memory_forget", memory_id: memoryId });

/* ── Export ──────────────────────────────────────────────────────────────── */

/**
 * Composition export. Describes which existing Aetheris modules were selected
 * and how they connect. It never duplicates private Aetheris source code and
 * carries no secrets — environment names are placeholders only.
 */
export function buildCompositionMarkdown(p: WorkspacePayload): string {
  const money = (v: number | null) => (v == null ? "n/a" : `$${Math.round(v).toLocaleString("en-US")}`);
  const lines: string[] = [];
  lines.push(`# Aetheris Company System — ${p.company?.display_name || "Company"}`);
  lines.push(`Domain: ${p.company?.primary_domain || p.company?.website_url || "unknown"}`);
  lines.push(`Source report hash: ${p.system.source_report_hash}`);
  lines.push(`Template: ${p.system.template_version} · Tier: ${p.system.tier} · Status: ${p.system.status}`);
  lines.push("");
  lines.push(`## Canonical exposure (Golden Report ledger, not recomputed)`);
  lines.push(`${money(p.archive?.annual_low ?? null)} – ${money(p.archive?.annual_high ?? null)} USD / year`);
  lines.push("");
  lines.push("## Selected Aetheris Universe modules");
  for (const m of p.modules) {
    lines.push(`- **${m.module_name}** (${m.module_id}) · route \`${m.route || "n/a"}\` · tier ${m.required_tier} · ${m.locked ? `LOCKED — ${m.lock_reason}` : m.enabled ? "enabled" : "disabled"}`);
    if (m.root_cause_ids?.length) lines.push(`  - addresses: ${m.root_cause_ids.join(", ")}`);
  }
  lines.push("");
  lines.push("## Connection graph");
  for (const c of p.connections) lines.push(`- ${c.from_module} --[${c.payload}]--> ${c.to_module}`);
  lines.push("");
  lines.push("## Goals");
  for (const g of p.goals) lines.push(`- [${g.classification}] ${g.title} — KPI ${g.kpi} · target ${g.target} · owner ${g.owner_role} · ${g.review_cadence}`);
  lines.push("");
  lines.push("## Checks");
  for (const c of p.checks) lines.push(`- ${c.name}: ${c.threshold || ""} (${c.evidence_basis || "report evidence"})`);
  const f = p.forecasts[0];
  if (f) {
    lines.push("");
    lines.push("## Forecast (planning assumptions, not guarantees)");
    lines.push(`Basis: ${f.basis}`);
    for (const s of f.scenarios || []) lines.push(`- ${s.name}: ${s.recovery_percent}% — ${s.rationale}`);
  }
  return lines.join("\n");
}

/** Copy-ready build prompt describing the composed system and its contracts. */
export function buildCompositionPrompt(p: WorkspacePayload): string {
  return [
    `Build the operating workspace for ${p.company?.display_name || "this company"} by COMPOSING existing Aetheris Universe instruments. Do not re-implement any tool.`,
    "",
    buildCompositionMarkdown(p),
    "",
    "## Integration contracts",
    "- Each module is invoked through its existing route/edge function adapter. Outputs are structured records, never parsed prose.",
    "- All modules share one approved company context, brand context version and canonical Golden Report ledger.",
    "- Any write, send, publish, schedule, CRM change or automation change is Plan -> Confirm -> Execute with an audit log entry and a rollback note.",
    "- Tier entitlement is enforced from aetherisTiers. Locked modules are shown as recommended, never executed.",
    "- Environment variables are placeholder names only. No secrets, no credentials, no private source code.",
    "- Ship working code. No TODO placeholders.",
  ].join("\n");
}

export function downloadText(filename: string, text: string, type = "text/plain") {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const a = document.createElement("a");
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}
