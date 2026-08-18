// ============================================================================
// AETHERIS COMPANY SYSTEM — control plane for a Golden Report.
// ----------------------------------------------------------------------------
// Composes the company's operating system out of EXISTING Aetheris Universe
// instruments (registry -> selected modules -> connection graph), keeps scoped
// memory, and runs the operator action bus with Plan -> Confirm -> Execute.
//
// Hard rules:
//  - Never recomputes Golden Report money. Canonical ledger only.
//  - Never executes arbitrary code: only registered, tier-allowed module actions.
//  - Locked (out-of-tier) modules may be recommended, never executed.
//  - Every plan/execution is written to company_system_events.
// ============================================================================

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";
import { verifyAdminToken, getAdminTokenFromRequest } from "../_shared/admin-token.ts";
import { verifyPortalToken, getPortalTokenFromRequest } from "../_shared/portal-token.ts";
import { routedChatCompletion } from "../_shared/ai-router.ts";
import { computeGoldenLeakage } from "../_shared/golden-leakage.ts";
import { buildReportEvidence, guardAnswer, moneyRules, OPERATOR_VOICE } from "../_shared/report-brain.ts";
import { reportHash, isBlueprintEligible, resolveBusinessIdentity, type ScanRow } from "../_shared/golden-archive.ts";
import {
  UNIVERSE_MODULE_REGISTRY,
  COMPANY_SYSTEM_TEMPLATE_VERSION,
  composeCompanySystem,
  buildBrandContext,
  validateAction,
  validateMemoryItem,
  selectMemory,
  findModule,
  shouldRecompose,
  registryAdapterGaps,
  actionIsExecutable,
  buildConfirmation,
  confirmationMismatch,
  inputHash,
  scopeAllows,
  codeScope,
  ADMIN_SCOPE,
  type ActorRole,
  type ConfirmationClaim,
  type ModuleTier,
  type RootCauseInput,
  type StoredMemoryItem,
  type MemoryItem,
} from "../_shared/universe-system.ts";
import {
  deriveTeams, deriveTasks, derivePlaybooks, seedMemoryFromReport,
  buildProvisioningEvents, suggestCrmConfig, teamForModule, isEventType, eventIdempotencyKey,
} from "../_shared/company-os.ts";


const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-admin-token, x-portal-token, x-internal-key, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};
const json = (b: unknown, status = 200) =>
  new Response(JSON.stringify(b), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

const SCAN_COLS =
  "id, target_url, company_name, report, raw_findings, brand_kit, brand_kit_status, report_source, portal_source, rep_code, creator_name, creator_email, report_state, financial_model_version, completed_at, status";


/**
 * Adapter shaping. Every branch targets an edge function that already exists;
 * the bus never invents a tool and never forwards a client-supplied brand or
 * company context — those are attached server-side from approved records.
 */
function buildAdapterPayload(
  kind: string,
  ctx: {
    moduleId: string;
    input: Record<string, unknown>;
    systemId: string;
    scanId: string;
    companyId: string;
    targetUrl: string;
    brand: Record<string, unknown> | null;
  },
): Record<string, unknown> {
  const base = {
    company_system_id: ctx.systemId,
    scan_id: ctx.scanId,
    company_id: ctx.companyId,
    // Approved brand only. Draft/inferred brand facts never reach a module.
    brand_context: ctx.brand
      ? {
          version: ctx.brand.version,
          colors: ctx.brand.colors,
          typography: ctx.brand.typography,
          tone: ctx.brand.tone,
          terminology: ctx.brand.terminology,
          audience: ctx.brand.audience,
          cta_style: ctx.brand.cta_style,
          imagery_direction: ctx.brand.imagery_direction,
        }
      : null,
  };
  switch (kind) {
    case "tool_sandbox":
      return {
        ...base,
        toolId: ctx.moduleId,
        url: ctx.targetUrl,
        context: [
          String(ctx.input.company_context ?? ctx.input.capability_brief ?? ""),
          ctx.input.approved_messaging_context ? String(ctx.input.approved_messaging_context) : "",
          ctx.brand ? `Brand tone: ${String(ctx.brand.tone ?? "")}` : "",
        ].filter(Boolean).join("\n").slice(0, 1500),
      };
    case "scan":
      return { ...base, url: String(ctx.input.website_url ?? ctx.targetUrl) };
    case "internal_forecast":
      return { ...base, action: "refresh_forecast", system_id: ctx.systemId };
    case "passthrough":
    default:
      return { ...base, ...ctx.input };
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SVC = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const sb = createClient(SUPABASE_URL, SVC);

    const body = await req.json().catch(() => ({}));
    const action = String(body.action ?? "");

    const isAdmin = await verifyAdminToken(getAdminTokenFromRequest(req), SVC);
    const portal = isAdmin ? null : await verifyPortalToken(getPortalTokenFromRequest(req), SVC);
    const internal = req.headers.get("x-internal-key") === SVC;
    if (!isAdmin && !portal && !internal) return json({ error: "Unauthorized" }, 401);
    // Tenant scope. Admin + internal are global. EVERY other portal role is
    // pinned to an explicit owner-code set; a token we cannot tie to an owner
    // gets an empty set and therefore reads nothing (default deny).
    let scope = ADMIN_SCOPE;
    if (!isAdmin && !internal) {
      if (!portal) return json({ error: "Unauthorized" }, 401);
      if (portal.role === "rep") {
        scope = codeScope([portal.code]);
      } else if (portal.role === "partner") {
        // A partner sees their own code plus the rep codes on their team.
        const { data: self } = await sb.from("rep_codes").select("code, team_name").eq("code", portal.code).maybeSingle();
        const team = (self as { team_name?: string | null } | null)?.team_name || null;
        let codes: string[] = [portal.code];
        if (team) {
          const { data: mates } = await sb.from("rep_codes").select("code").eq("team_name", team);
          codes = codes.concat(((mates || []) as Array<{ code: string }>).map((r) => r.code));
        }
        scope = codeScope(codes);
      } else {
        scope = codeScope([]); // unknown role -> deny everything
      }
    }
    const role: ActorRole = isAdmin || internal ? "admin" : portal?.role === "rep" ? "operator" : "viewer";
    const actor = isAdmin ? "admin" : internal ? "internal" : `${portal!.role}:${portal!.code}`;

    /** Owner scoping: a portal caller may only touch rows they own. */
    async function loadSystem(systemId: string) {
      if (!systemId) return null;
      const { data } = await sb.from("company_systems").select("*").eq("id", systemId).maybeSingle();
      if (!data) return null;
      if (!scopeAllows(scope, (data as { rep_code: string | null }).rep_code)) return "forbidden" as const;
      return data as Record<string, unknown>;
    }

    /** Company access requires at least one in-scope system for that company. */
    async function companyAllowed(companyId: string): Promise<boolean> {
      if (scope.kind === "admin") return true;
      if (!companyId || !scope.codes.length) return false;
      const { data } = await sb.from("company_systems").select("id")
        .eq("company_id", companyId).in("rep_code", scope.codes).limit(1);
      return !!data?.length;
    }

    async function logEvent(row: Record<string, unknown>) {
      await sb.from("company_system_events").insert({ actor, actor_role: role, ...row });
    }

    /* ── registry ─────────────────────────────────────────────────────── */
    if (action === "registry") {
      return json({ modules: UNIVERSE_MODULE_REGISTRY, template_version: COMPANY_SYSTEM_TEMPLATE_VERSION, adapter_gaps: registryAdapterGaps() });
    }

    if (action === "seed_registry") {
      if (!isAdmin && !internal) return json({ error: "Forbidden" }, 403);
      const rows = UNIVERSE_MODULE_REGISTRY.map((m) => ({
        id: m.id, name: m.name, route: m.route, category: m.category,
        required_tier: m.requiredTier, capabilities: m.capabilities, inputs: m.inputs,
        outputs: m.outputs, actions: m.actions, sensitivity: m.sensitivity, is_active: true,
      }));
      const { error } = await sb.from("universe_module_registry").upsert(rows, { onConflict: "id" });
      if (error) throw error;
      return json({ seeded: rows.length });
    }

    /* ── historical batch: resumable, capped, idempotent ──────────────── */
    if (action === "compose_batch") {
      if (!isAdmin && !internal) return json({ error: "Forbidden" }, 403);
      // Never fan out over the whole archive: the admin walks a bounded queue
      // so cost and failure stay visible per batch.
      const limit = Math.min(Math.max(Number(body.limit ?? 5) || 5, 1), 25);
      const tier = String(body.tier ?? "diagnostic");
      const explicit = Array.isArray(body.scan_ids) ? body.scan_ids.map(String).slice(0, limit) : null;

      let queue: string[] = explicit ?? [];
      if (!explicit) {
        // Compiled + archived reports that have no system for this template.
        const { data: done } = await sb.from("company_systems")
          .select("scan_id").eq("template_version", COMPANY_SYSTEM_TEMPLATE_VERSION);
        const have = new Set(((done || []) as Array<{ scan_id: string }>).map((r) => r.scan_id));
        const { data: cand } = await sb.from("golden_report_archive")
          .select("scan_id, is_valid, completed_at").eq("is_valid", true)
          .order("completed_at", { ascending: false }).limit(limit + have.size);
        queue = ((cand || []) as Array<{ scan_id: string }>)
          .map((r) => r.scan_id).filter((id) => !have.has(id)).slice(0, limit);
      }

      const results: Array<{ scan_id: string; ok: boolean; reused?: boolean; error?: string }> = [];
      for (const scanId of queue) {
        try {
          const r = await fetch(`${SUPABASE_URL}/functions/v1/company-system`, {
            method: "POST",
            headers: { "Content-Type": "application/json", "x-internal-key": SVC, Authorization: `Bearer ${SVC}` },
            body: JSON.stringify({ action: "compose", scan_id: scanId, tier }),
          });
          const payload = await r.json().catch(() => ({}));
          results.push({ scan_id: scanId, ok: r.ok, reused: !!payload.reused, error: r.ok ? undefined : String(payload.error || r.status) });
        } catch (e) {
          results.push({ scan_id: scanId, ok: false, error: (e as Error).message });
        }
      }

      const { count: remaining } = await sb.from("golden_report_archive")
        .select("scan_id", { count: "exact", head: true }).eq("is_valid", true);
      const { count: built } = await sb.from("company_systems")
        .select("id", { count: "exact", head: true }).eq("template_version", COMPANY_SYSTEM_TEMPLATE_VERSION);

      return json({
        processed: results.length,
        created: results.filter((r) => r.ok && !r.reused).length,
        reused: results.filter((r) => r.reused).length,
        failed: results.filter((r) => !r.ok),
        eligible_total: remaining ?? 0,
        systems_total: built ?? 0,
        results,
      });
    }

    /* ── compose ──────────────────────────────────────────────────────── */
    if (action === "compose") {

      const scanId = String(body.scan_id ?? "");
      if (!scanId) return json({ error: "scan_id required" }, 400);
      const clientTier = (String(body.tier ?? "diagnostic") || "diagnostic") as ModuleTier;

      const { data: scanRow } = await sb.from("forensic_scans").select(SCAN_COLS).eq("id", scanId).maybeSingle();
      if (!scanRow) return json({ error: "Scan not found" }, 404);
      const scan = scanRow as unknown as ScanRow & { brand_kit?: unknown; brand_kit_status?: string | null };
      if (!scopeAllows(scope, (scan as { rep_code?: string | null }).rep_code ?? null)) return json({ error: "Forbidden" }, 403);

      if (!isBlueprintEligible(scan.report, scan.report_state)) {
        return json({ error: "Report must be repaired first." }, 409);
      }

      const { data: archive } = await sb.from("golden_report_archive")
        .select("id, company_id, report_hash").eq("scan_id", scanId).maybeSingle();
      if (!archive) return json({ error: "Report is not archived yet. Archive it first." }, 409);
      const companyId = (archive as { company_id: string }).company_id;
      const hash = (archive as { report_hash: string | null }).report_hash || reportHash(scan.report);

      const { data: existing } = await sb.from("company_systems")
        .select("*").eq("scan_id", scanId).eq("template_version", COMPANY_SYSTEM_TEMPLATE_VERSION)
        .order("created_at", { ascending: false }).maybeSingle();
      if (existing && !shouldRecompose(existing as never, hash) && !body.force) {
        return json({ system: existing, reused: true });
      }

      // Brand context — versioned, drafted from brand_kit evidence, inferred
      // fields flagged and inert until an operator approves them.
      const { data: brandRows } = await sb.from("company_brand_contexts")
        .select("*").eq("company_id", companyId).order("version", { ascending: false }).limit(1);
      let brand = (brandRows || [])[0] as Record<string, unknown> | undefined;
      if (!brand) {
        const ctx = buildBrandContext(scan.brand_kit, 1);
        const { data: inserted } = await sb.from("company_brand_contexts").insert({
          company_id: companyId, scan_id: scanId, version: 1, status: "draft",
          logo_urls: ctx.logo_urls, colors: ctx.colors, typography: ctx.typography,
          imagery_direction: ctx.imagery_direction, tone: ctx.tone, terminology: ctx.terminology,
          audience: ctx.audience, cta_style: ctx.cta_style, inferred_fields: ctx.inferred_fields,
        }).select("*").maybeSingle();
        brand = inserted as Record<string, unknown>;
      }

      // Root causes come from the archived findings index + report root_causes.
      const { data: findingRows } = await sb.from("golden_report_findings_index")
        .select("root_cause_id, root_cause_title, title, detail, category, priority")
        .eq("scan_id", scanId);
      const rcMap = new Map<string, RootCauseInput>();
      for (const f of (findingRows || []) as Array<Record<string, string | number | null>>) {
        const id = String(f.root_cause_id || f.title || "");
        if (!id) continue;
        const prev = rcMap.get(id);
        const detail = `${prev?.detail || ""} ${f.title || ""} ${f.detail || ""} ${f.category || ""}`.trim();
        rcMap.set(id, {
          id,
          title: String(f.root_cause_title || f.title || id),
          detail,
          priority: Number(f.priority ?? 3),
        });
      }
      const rootCauses = [...rcMap.values()];

      const blueprintRow = await sb.from("golden_system_blueprints")
        .select("id, output_json").eq("scan_id", scanId).order("created_at", { ascending: false }).limit(1).maybeSingle();
      const bp = (blueprintRow.data as { id?: string; output_json?: Record<string, unknown> } | null) || null;
      const capMap = (bp?.output_json?.capability_map || []) as Array<Record<string, unknown>>;
      for (const c of capMap) {
        const id = String(c.root_cause_id ?? "");
        const rc = rcMap.get(id);
        if (rc) rc.classification = c.classification as RootCauseInput["classification"];
      }

      const composed = composeCompanySystem(rootCauses, clientTier);

      // Keep the persisted registry in step with the code registry (code is the
      // source of truth; the table is the queryable mirror).
      await sb.from("universe_module_registry").upsert(
        UNIVERSE_MODULE_REGISTRY.map((m) => ({
          id: m.id, name: m.name, route: m.route, category: m.category,
          required_tier: m.requiredTier, capabilities: m.capabilities, inputs: m.inputs,
          outputs: m.outputs, actions: m.actions, sensitivity: m.sensitivity, is_active: true,
        })),
        { onConflict: "id" },
      );

      const { data: system, error: sysErr } = await sb.from("company_systems").upsert({
        company_id: companyId,
        archive_id: (archive as { id: string }).id,
        scan_id: scanId,
        blueprint_id: bp?.id ?? null,
        template_version: COMPANY_SYSTEM_TEMPLATE_VERSION,
        source_report_hash: hash,
        brand_context_id: (brand as { id?: string })?.id ?? null,
        brand_version: (brand as { version?: number })?.version ?? 1,
        tier: clientTier,
        status: "draft",
        approval_state: "draft",
        rep_code: (scan as { rep_code?: string | null }).rep_code ?? null,
        coverage: composed.coverage,
        manifest: {
          gaps: composed.gaps,
          module_count: composed.modules.length,
          connection_count: composed.connections.length,
          identity: resolveBusinessIdentity(scan),
        },
      }, { onConflict: "scan_id,source_report_hash,template_version" }).select("*").maybeSingle();
      if (sysErr) throw sysErr;
      const systemId = (system as { id: string }).id;

      await sb.from("company_system_modules").delete().eq("system_id", systemId);
      if (composed.modules.length) {
        await sb.from("company_system_modules").insert(composed.modules.map((m) => ({
          system_id: systemId,
          module_id: m.module_id,
          module_name: m.module_name,
          route: m.route,
          category: m.category,
          required_tier: m.required_tier,
          capabilities: m.capabilities,
          root_cause_ids: m.root_cause_ids,
          display_order: m.display_order,
          enabled: !m.locked,
          locked: m.locked,
          lock_reason: m.lock_reason,
        })));
      }
      if (composed.gaps.length) {
        await sb.from("company_system_modules").insert(composed.gaps.map((g, i) => ({
          system_id: systemId,
          module_id: `gap:${g.root_cause_id}`,
          module_name: `GAP — ${g.title}`.slice(0, 120),
          category: "systems",
          required_tier: "diagnostic",
          root_cause_ids: [g.root_cause_id],
          display_order: 900 + i,
          enabled: false,
          locked: true,
          lock_reason: g.note,
          gap_status: "GAP_REQUIRED",
        })));
      }

      await sb.from("company_system_connections").delete().eq("system_id", systemId);
      if (composed.connections.length) {
        await sb.from("company_system_connections").insert(
          composed.connections.map((c) => ({ system_id: systemId, ...c })),
        );
      }

      // Goals + checks, one per selected module/root-cause pairing.
      await sb.from("company_system_goals").delete().eq("system_id", systemId);
      const goalRows = composed.modules.flatMap((m) =>
        m.root_cause_ids.map((rcId) => {
          const rc = rcMap.get(rcId);
          const cap = capMap.find((c) => String(c.root_cause_id) === rcId) || {};
          return {
            system_id: systemId,
            root_cause_id: rcId,
            module_id: m.module_id,
            title: String(cap.goal || `Close: ${rc?.title || rcId}`),
            classification: String(cap.classification || "ASSISTED"),
            baseline: String(cap.baseline || "Baseline not measured yet."),
            kpi: String(cap.kpi || "To be defined at activation."),
            target: String(cap.target || "To be agreed with the operator."),
            owner_role: String(cap.owner_role || "Operator"),
            priority: Number(cap.priority ?? rc?.priority ?? 3),
            review_cadence: String(cap.review_cadence || "Monthly"),
            status: "open",
          };
        })
      );
      const insertedGoals = goalRows.length
        ? (await sb.from("company_system_goals").insert(goalRows).select("id, root_cause_id, module_id, title, baseline, kpi, target, owner_role, priority")).data || []
        : [];

      await sb.from("company_system_checks").delete().eq("system_id", systemId);
      const bpChecks = (bp?.output_json?.checks || []) as Array<Record<string, unknown>>;
      if (bpChecks.length) {
        await sb.from("company_system_checks").insert(bpChecks.slice(0, 25).map((c) => ({
          system_id: systemId,
          name: String(c.name || "Check"),
          evidence_basis: String(c.evidence_basis || ""),
          threshold: String(c.threshold || ""),
          alert: String(c.alert || ""),
          last_status: "not_run",
        })));
      }

      // Forecast: canonical ledger only, never recomputed.
      const leak = computeGoldenLeakage(scan.report as never);
      const bpForecast = (bp?.output_json?.forecast || {}) as Record<string, unknown>;
      await sb.from("company_system_forecasts").insert({
        system_id: systemId,
        version: 1,
        basis: String(bpForecast.basis || "Canonical Golden Report leak ledger. No figure is recomputed here."),
        assumptions: (bpForecast.assumptions as unknown[]) || [
          "Recovery percentages are planning assumptions, not guarantees.",
          "Only priced leaks in the canonical ledger are modelled.",
        ],
        canonical_annual_low: leak ? Math.round(leak.low) : null,
        canonical_annual_high: leak ? Math.round(leak.high) : null,
        currency: "USD",
        scenarios: (bpForecast.scenarios as unknown[]) || [
          { name: "conservative", recovery_percent: 10, rationale: "Only the highest-confidence leaks are addressed." },
          { name: "base", recovery_percent: 25, rationale: "Prioritised roadmap executed on cadence." },
          { name: "upside", recovery_percent: 40, rationale: "Full module set enabled with owner participation." },
        ],
      });

      /* ── Operating surface: teams, CRM link, tasks, playbooks, memory ── */
      const identity = resolveBusinessIdentity(scan);

      // CRM: link to an EXISTING crm_companies row for this domain, or create
      // the company shell only. Contacts, deals and revenue are never invented.
      let crmCompanyId: string | null = (system as { crm_company_id?: string | null }).crm_company_id ?? null;
      let crmContactCount = 0;
      const domain = identity.primary_domain || null;
      if (!crmCompanyId && (domain || identity.display_name)) {
        const { data: existingCrm } = domain
          ? await sb.from("crm_companies").select("id").ilike("website", `%${domain}%`).limit(1).maybeSingle()
          : { data: null };
        if (existingCrm) crmCompanyId = (existingCrm as { id: string }).id;
        else {
          const { data: madeCrm } = await sb.from("crm_companies").insert({
            name: identity.display_name || domain || "Unknown company",
            website: identity.website_url || (domain ? `https://${domain}` : null),
            notes: `Linked from Aetheris Golden Report ${scanId}. Contacts and deals must be imported by the operator.`,
          }).select("id").maybeSingle();
          crmCompanyId = (madeCrm as { id: string } | null)?.id ?? null;
        }
      }
      if (crmCompanyId) {
        const { count } = await sb.from("crm_contacts")
          .select("id", { count: "exact", head: true }).eq("company_id", crmCompanyId);
        crmContactCount = count ?? 0;
      }
      const crmConfig = suggestCrmConfig(rootCauses);
      await sb.from("company_systems")
        .update({ crm_company_id: crmCompanyId, crm_config: crmConfig })
        .eq("id", systemId);

      // Teams: only the sections this company actually needs.
      const teams = deriveTeams(composed.modules, composed.gaps);
      await sb.from("company_system_teams").delete().eq("system_id", systemId);
      if (teams.length) {
        await sb.from("company_system_teams").insert(teams.map((t) => ({
          system_id: systemId, team_key: t.team_key, name: t.name, summary: t.summary,
          root_cause_ids: t.root_cause_ids, module_ids: t.module_ids,
          enabled: true, display_order: t.display_order,
        })));
      }

      // Goals gain their team so every card lands in the right workspace.
      const moduleTeam = new Map(composed.modules.map((m) => [m.module_id, teamForModule(m)]));
      for (const g of insertedGoals as Array<{ id: string; module_id: string | null; baseline: string | null }>) {
        await sb.from("company_system_goals").update({
          team_key: moduleTeam.get(String(g.module_id)) || "executive",
          requires_company_data: !g.baseline || /not measured|to be defined|to be agreed/i.test(g.baseline),
        }).eq("id", g.id);
      }

      // Tasks: idempotent by dedupe_key, so a recompose never duplicates work
      // and never resets an operator's completed task.
      const goalIdByKey = new Map(
        (insertedGoals as Array<{ id: string; root_cause_id: string | null; title: string }>)
          .map((g) => [String(g.root_cause_id || g.title), g.id]),
      );
      const tasks = deriveTasks({
        modules: composed.modules,
        gaps: composed.gaps,
        goals: insertedGoals as never,
        crmLinked: !!crmCompanyId,
        crmContactCount,
      });
      if (tasks.length) {
        await sb.from("company_system_tasks").upsert(tasks.map((t) => ({
          system_id: systemId,
          company_id: companyId,
          team_key: t.team_key,
          goal_id: t.root_cause_id ? goalIdByKey.get(t.root_cause_id) ?? null : null,
          root_cause_id: t.root_cause_id,
          module_id: t.module_id,
          title: t.title,
          detail: t.detail,
          kind: t.kind,
          owner_role: t.owner_role,
          priority: t.priority,
          requires_company_data: t.requires_company_data,
          source: t.source,
          dedupe_key: t.dedupe_key,
        })), { onConflict: "system_id,dedupe_key", ignoreDuplicates: true });
      }

      const playbooks = derivePlaybooks(composed.modules, rootCauses);
      if (playbooks.length) {
        await sb.from("company_system_playbooks").upsert(playbooks.map((p) => ({
          system_id: systemId, team_key: p.team_key, title: p.title,
          root_cause_ids: p.root_cause_ids, module_ids: p.module_ids,
          steps: p.steps, tips: p.tips, dedupe_key: p.dedupe_key,
        })), { onConflict: "system_id,dedupe_key" });
      }

      // Active memory: grounded, provenanced, scoped. Nothing invented.
      const seeds = seedMemoryFromReport({
        identity,
        annualLow: leak ? Math.round(leak.low) : null,
        annualHigh: leak ? Math.round(leak.high) : null,
        rootCauses,
        moduleIds: composed.modules.map((m) => m.module_id),
        gaps: composed.gaps,
        scanId,
        reportHash: hash,
        brandInferredFields: ((brand as { inferred_fields?: string[] })?.inferred_fields || []),
      });
      if (seeds.length) {
        await sb.from("company_system_memory").upsert(seeds.map((s) => ({
          company_id: companyId,
          scan_id: s.scan_scoped ? scanId : null,
          system_id: s.system_scoped ? systemId : null,
          scope: s.scope,
          memory_key: s.key,
          value: s.value,
          provenance: s.provenance,
          confidence: s.confidence,
          status: s.status,
          sensitivity: s.sensitivity,
          author: actor,
          last_verified_at: s.status === "approved" ? new Date().toISOString() : null,
        })), { onConflict: "company_id,scope,memory_key,system_id,scan_id" });
      }

      // Typed events: idempotent, retryable, auditable.
      const busEvents = buildProvisioningEvents({
        rootCauses,
        goalTitles: (insertedGoals as Array<{ title: string }>).map((g) => g.title),
        taskCount: tasks.length,
        reportHash: hash,
      });
      if (busEvents.length) {
        await sb.from("company_system_event_bus").upsert(busEvents.map((e) => ({
          system_id: systemId, company_id: companyId,
          event_type: e.event_type, from_module: e.from_module, to_module: e.to_module,
          payload: e.payload, idempotency_key: e.idempotency_key,
          status: "delivered", delivered_at: new Date().toISOString(),
        })), { onConflict: "system_id,idempotency_key", ignoreDuplicates: true });
      }

      await logEvent({
        system_id: systemId, company_id: companyId, scan_id: scanId,
        kind: "system_composed", status: "logged",
        result: {
          modules: composed.modules.length, gaps: composed.gaps.length, coverage: composed.coverage,
          teams: teams.length, tasks: tasks.length, playbooks: playbooks.length,
          memory_seeded: seeds.length, events: busEvents.length,
          crm_company_id: crmCompanyId, crm_contacts_found: crmContactCount,
        },
      });

      return json({
        system: { ...(system as Record<string, unknown>), crm_company_id: crmCompanyId, crm_config: crmConfig },
        composed,
        provisioned: { teams: teams.length, tasks: tasks.length, playbooks: playbooks.length, memory: seeds.length, events: busEvents.length },
        reused: false,
      });
    }


    /* ── workspace payload ────────────────────────────────────────────── */
    if (action === "get") {
      const systemId = String(body.system_id ?? "");
      const sys = await loadSystem(systemId);
      if (sys === "forbidden") return json({ error: "Forbidden" }, 403);
      if (!sys) return json({ error: "Not found" }, 404);

      const [mods, conns, goals, checks, forecasts, events, memory, company, archive, brand,
             teams, tasks, playbooks, bus] = await Promise.all([
        sb.from("company_system_modules").select("*").eq("system_id", systemId).order("display_order"),
        sb.from("company_system_connections").select("*").eq("system_id", systemId),
        sb.from("company_system_goals").select("*").eq("system_id", systemId).order("priority"),
        sb.from("company_system_checks").select("*").eq("system_id", systemId),
        sb.from("company_system_forecasts").select("*").eq("system_id", systemId).order("version", { ascending: false }),
        sb.from("company_system_events").select("*").eq("system_id", systemId).order("created_at", { ascending: false }).limit(50),
        sb.from("company_system_memory").select("*").eq("company_id", sys.company_id as string).order("updated_at", { ascending: false }).limit(200),
        sb.from("golden_report_companies").select("*").eq("id", sys.company_id as string).maybeSingle(),
        sb.from("golden_report_archive").select("*").eq("scan_id", sys.scan_id as string).maybeSingle(),
        sys.brand_context_id
          ? sb.from("company_brand_contexts").select("*").eq("id", sys.brand_context_id as string).maybeSingle()
          : Promise.resolve({ data: null }),
        sb.from("company_system_teams").select("*").eq("system_id", systemId).order("display_order"),
        sb.from("company_system_tasks").select("*").eq("system_id", systemId).order("priority").limit(400),
        sb.from("company_system_playbooks").select("*").eq("system_id", systemId),
        sb.from("company_system_event_bus").select("*").eq("system_id", systemId).order("created_at", { ascending: false }).limit(100),
      ]);

      // Smart CRM: real records only. Nothing is fabricated when empty.
      const crmCompanyId = (sys.crm_company_id as string | null) ?? null;
      let crm: Record<string, unknown> = { company: null, contacts: [], deals: [], interactions: [], linked: false };
      if (crmCompanyId) {
        const [cc, contacts, deals] = await Promise.all([
          sb.from("crm_companies").select("*").eq("id", crmCompanyId).maybeSingle(),
          sb.from("crm_contacts").select("*").eq("company_id", crmCompanyId).order("created_at", { ascending: false }).limit(200),
          sb.from("crm_deals").select("*").eq("company_id", crmCompanyId).order("position").limit(200),
        ]);
        const contactIds = ((contacts.data || []) as Array<{ id: string }>).map((c) => c.id);
        const interactions = contactIds.length
          ? await sb.from("crm_interactions").select("*").in("contact_id", contactIds)
              .order("occurred_at", { ascending: false }).limit(100)
          : { data: [] };
        crm = {
          linked: true,
          company: cc.data,
          contacts: contacts.data || [],
          deals: deals.data || [],
          interactions: (interactions as { data: unknown[] }).data || [],
          config: sys.crm_config || {},
        };
      }

      return json({
        system: sys,
        company: company.data,
        archive: archive.data,
        brand: (brand as { data: unknown }).data,
        modules: mods.data || [],
        connections: conns.data || [],
        goals: goals.data || [],
        checks: checks.data || [],
        forecasts: forecasts.data || [],
        events: events.data || [],
        memory: memory.data || [],
        teams: teams.data || [],
        tasks: tasks.data || [],
        playbooks: playbooks.data || [],
        bus: bus.data || [],
        crm,
        registry: UNIVERSE_MODULE_REGISTRY,
      });
    }

    /* ── tasks ────────────────────────────────────────────────────────── */
    if (action === "task_set_status") {
      const systemId = String(body.system_id ?? "");
      const sys = await loadSystem(systemId);
      if (sys === "forbidden") return json({ error: "Forbidden" }, 403);
      if (!sys) return json({ error: "Not found" }, 404);
      if (role === "viewer") return json({ error: "Viewer role may not change tasks" }, 403);
      const status = String(body.status ?? "");
      if (!["open", "in_progress", "blocked", "done"].includes(status)) return json({ error: "bad status" }, 400);
      const { data } = await sb.from("company_system_tasks").update({
        status, completed_at: status === "done" ? new Date().toISOString() : null,
      }).eq("id", String(body.task_id ?? "")).eq("system_id", systemId).select("*").maybeSingle();
      if (!data) return json({ error: "Not found" }, 404);
      await logEvent({ system_id: systemId, kind: "task_status", status: "logged", result: { task_id: body.task_id, status } });
      return json({ task: data });
    }

    /* ── typed event bus ──────────────────────────────────────────────── */
    if (action === "emit_event") {
      const systemId = String(body.system_id ?? "");
      const sys = await loadSystem(systemId);
      if (sys === "forbidden") return json({ error: "Forbidden" }, 403);
      if (!sys) return json({ error: "Not found" }, 404);
      const type = String(body.event_type ?? "");
      if (!isEventType(type)) return json({ error: `Unregistered event contract: ${type}` }, 400);
      const subject = String(body.subject ?? crypto.randomUUID());
      const key = String(body.idempotency_key || eventIdempotencyKey(type, subject, String(sys.source_report_hash ?? "1")));
      const { data, error } = await sb.from("company_system_event_bus").upsert({
        system_id: systemId, company_id: sys.company_id, event_type: type,
        from_module: body.from_module ? String(body.from_module) : null,
        to_module: body.to_module ? String(body.to_module) : null,
        payload: (body.payload || {}) as Record<string, unknown>,
        idempotency_key: key, status: "delivered", delivered_at: new Date().toISOString(),
      }, { onConflict: "system_id,idempotency_key", ignoreDuplicates: true }).select("*").maybeSingle();
      if (error) throw error;
      return json({ event: data, duplicate: !data });
    }

    if (action === "retry_event") {
      const systemId = String(body.system_id ?? "");
      const sys = await loadSystem(systemId);
      if (sys === "forbidden") return json({ error: "Forbidden" }, 403);
      if (!sys) return json({ error: "Not found" }, 404);
      const { data: row } = await sb.from("company_system_event_bus")
        .select("*").eq("id", String(body.event_id ?? "")).eq("system_id", systemId).maybeSingle();
      if (!row) return json({ error: "Not found" }, 404);
      const { data } = await sb.from("company_system_event_bus").update({
        status: "delivered", attempts: Number((row as { attempts: number }).attempts) + 1,
        last_error: null, delivered_at: new Date().toISOString(),
      }).eq("id", (row as { id: string }).id).select("*").maybeSingle();
      return json({ event: data });
    }


    if (action === "list") {
      let q = sb.from("company_systems").select("*").order("created_at", { ascending: false }).limit(100);
      if (scope.kind !== "admin") {
        if (!scope.codes.length) return json({ systems: [] });
        q = q.in("rep_code", scope.codes);
      }
      if (body.company_id) q = q.eq("company_id", String(body.company_id));
      const { data } = await q;
      return json({ systems: data || [] });
    }

    /* ── brand approval ───────────────────────────────────────────────── */
    if (action === "brand_set_status") {
      if (!isAdmin) return json({ error: "Forbidden" }, 403);
      const id = String(body.brand_context_id ?? "");
      const status = String(body.status ?? "approved");
      if (!["draft", "approved"].includes(status)) return json({ error: "bad status" }, 400);
      const patch: Record<string, unknown> = { status };
      if (status === "approved") { patch.approved_by = actor; patch.approved_at = new Date().toISOString(); }
      const { data, error } = await sb.from("company_brand_contexts").update(patch).eq("id", id).select("*").maybeSingle();
      if (error) throw error;
      return json({ brand: data });
    }

    if (action === "module_set_enabled") {
      const systemId = String(body.system_id ?? "");
      const sys = await loadSystem(systemId);
      if (sys === "forbidden") return json({ error: "Forbidden" }, 403);
      if (!sys) return json({ error: "Not found" }, 404);
      const moduleId = String(body.module_id ?? "");
      const { data: row } = await sb.from("company_system_modules")
        .select("*").eq("system_id", systemId).eq("module_id", moduleId).maybeSingle();
      if (!row) return json({ error: "Module not in system" }, 404);
      if ((row as { locked: boolean }).locked && body.enabled) {
        return json({ error: (row as { lock_reason: string }).lock_reason || "Module is locked" }, 403);
      }
      if (role === "viewer") return json({ error: "Viewer role may not change module state" }, 403);

      // Enabling/disabling changes live behaviour, so it follows the same
      // preview -> confirm -> execute path as any other write.
      const wantEnabled = !!body.enabled;
      const systemVersion = Number(sys.system_version ?? 1);
      const toggleReq = { module_id: moduleId, action_id: "module_set_enabled", input: { enabled: String(wantEnabled) } };
      const tokenIn = typeof body.confirmation_token === "string" ? body.confirmation_token : "";
      if (wantEnabled && sys.approval_state !== "approved") {
        return json({ error: "Company system is not approved for execution." }, 403);
      }
      let claim: ConfirmationClaim | null = null;
      if (tokenIn) {
        const { data: crow } = await sb.from("company_system_confirmations").select("*").eq("token", tokenIn).maybeSingle();
        if (crow) claim = crow as unknown as ConfirmationClaim;
      }
      const ctxBind = {
        actor, systemId, sourceReportHash: String(sys.source_report_hash ?? ""),
        systemVersion, now: Date.now(),
      };
      if (!claim || confirmationMismatch(claim, toggleReq, ctxBind)) {
        const bound = buildConfirmation(toggleReq, { ...ctxBind, affects: [`module:${moduleId}`] });
        const token = crypto.randomUUID() + crypto.randomUUID().replace(/-/g, "");
        await sb.from("company_system_confirmations").insert({
          token, actor_role: role,
          preview: { module: moduleId, action: wantEnabled ? "Enable module" : "Disable module", risk: "write", rollback: "Toggle the module back." },
          ...bound,
        });
        return json({
          ok: false, requires_confirmation: true,
          error: claim ? confirmationMismatch(claim, toggleReq, ctxBind) : "Confirmation required",
          preview: { module: moduleId, enabled: wantEnabled, affects: [`module:${moduleId}`], rollback: "Toggle the module back." },
          confirmation: { token, expires_at: bound.expires_at, single_use: true },
        }, 200);
      }
      const { data: spent } = await sb.from("company_system_confirmations")
        .update({ consumed_at: new Date().toISOString() }).eq("token", tokenIn).is("consumed_at", null).select("id").maybeSingle();
      if (!spent) return json({ error: "Confirmation already used." }, 409);

      const { data } = await sb.from("company_system_modules")
        .update({ enabled: wantEnabled }).eq("id", (row as { id: string }).id).select("*").maybeSingle();
      await logEvent({ system_id: systemId, kind: "module_toggle", module_id: moduleId, result: { enabled: wantEnabled } });
      return json({ module: data });
    }

    if (action === "approve_system") {
      if (!isAdmin) return json({ error: "Forbidden" }, 403);
      const systemId = String(body.system_id ?? "");
      const state = String(body.approval_state ?? "approved");
      if (!["draft", "approved", "rejected"].includes(state)) return json({ error: "bad state" }, 400);
      const { data: prior } = await sb.from("company_systems").select("system_version").eq("id", systemId).maybeSingle();
      const { data } = await sb.from("company_systems").update({
        system_version: Number((prior as { system_version?: number } | null)?.system_version ?? 1) + 1,
        approval_state: state,
        status: state === "approved" ? "active" : "draft",
        approved_by: state === "approved" ? actor : null,
        approved_at: state === "approved" ? new Date().toISOString() : null,
      }).eq("id", systemId).select("*").maybeSingle();
      await logEvent({ system_id: systemId, kind: "system_approval", result: { state } });
      return json({ system: data });
    }

    /* ── memory ───────────────────────────────────────────────────────── */
    if (action === "memory_list") {
      const companyId = String(body.company_id ?? "");
      if (!companyId) return json({ error: "company_id required" }, 400);
      if (!(await companyAllowed(companyId))) return json({ error: "Forbidden" }, 403);
      let q = sb.from("company_system_memory").select("*").eq("company_id", companyId);
      if (body.scope) q = q.eq("scope", String(body.scope));
      const { data } = await q.order("updated_at", { ascending: false }).limit(300);
      let rows = (data || []) as Array<Record<string, unknown>>;
      if (scope.kind !== "admin") {
        // Only memory attached to the caller's own systems/reports.
        const { data: own } = await sb.from("company_systems").select("id, scan_id")
          .eq("company_id", companyId).in("rep_code", scope.codes);
        const sysIds = new Set(((own || []) as Array<{ id: string }>).map((r) => r.id));
        const scanIds = new Set(((own || []) as Array<{ scan_id: string }>).map((r) => r.scan_id));
        rows = rows.filter((r) =>
          r.scope === "business" ||
          (r.scope === "report" && scanIds.has(String(r.scan_id))) ||
          ((r.scope === "system" || r.scope === "conversation") && sysIds.has(String(r.system_id))));
      }
      return json({ memory: rows });
    }

    if (action === "memory_upsert") {
      const item = (body.item || {}) as Partial<MemoryItem> & { company_id?: string; scan_id?: string; system_id?: string };
      const v = validateMemoryItem(item);
      if (!v.ok) return json({ error: v.error }, 400);
      const companyId = String(item.company_id ?? body.company_id ?? "");
      if (!companyId) return json({ error: "company_id required" }, 400);
      if (!(await companyAllowed(companyId))) return json({ error: "Forbidden" }, 403);
      const { data, error } = await sb.from("company_system_memory").upsert({
        company_id: companyId,
        scan_id: item.scan_id ?? null,
        system_id: item.system_id ?? null,
        scope: item.scope,
        memory_key: item.key,
        value: item.value,
        provenance: item.provenance,
        confidence: item.confidence ?? 0.5,
        status: item.status ?? "inferred",
        sensitivity: item.sensitivity ?? "low",
        author: actor,
        last_verified_at: item.status === "approved" ? new Date().toISOString() : null,
        expires_at: item.expires_at ?? null,
      }, { onConflict: "company_id,scope,memory_key,system_id,scan_id" }).select("*").maybeSingle();
      if (error) throw error;
      return json({ memory: data });
    }

    if (action === "memory_set_status") {
      const id = String(body.memory_id ?? "");
      const status = String(body.status ?? "");
      if (!["inferred", "approved", "rejected", "superseded"].includes(status)) return json({ error: "bad status" }, 400);
      const { data: row } = await sb.from("company_system_memory").select("company_id").eq("id", id).maybeSingle();
      if (!row) return json({ error: "Not found" }, 404);
      if (!(await companyAllowed((row as { company_id: string }).company_id))) return json({ error: "Forbidden" }, 403);
      const { data } = await sb.from("company_system_memory").update({
        status, author: actor, last_verified_at: new Date().toISOString(),
      }).eq("id", id).select("*").maybeSingle();
      return json({ memory: data });
    }

    if (action === "memory_forget") {
      if (!isAdmin) return json({ error: "Forbidden" }, 403);
      const id = String(body.memory_id ?? "");
      await sb.from("company_system_memory").delete().eq("id", id);
      return json({ ok: true });
    }

    /* ── operator: plan / execute ─────────────────────────────────────── */
    if (action === "operator_chat" || action === "plan") {
      const systemId = String(body.system_id ?? "");
      const sys = await loadSystem(systemId);
      if (sys === "forbidden") return json({ error: "Forbidden" }, 403);
      if (!sys) return json({ error: "Not found" }, 404);
      const question = String(body.question ?? "").trim();
      if (!question) return json({ error: "question required" }, 400);

      const [{ data: scan }, { data: mods }, { data: goals }, { data: mem }, { data: checks }] = await Promise.all([
        sb.from("forensic_scans").select("report, target_url, company_name, report_state").eq("id", sys.scan_id as string).maybeSingle(),
        sb.from("company_system_modules").select("*").eq("system_id", systemId).order("display_order"),
        sb.from("company_system_goals").select("*").eq("system_id", systemId).order("priority"),
        sb.from("company_system_memory").select("*").eq("company_id", sys.company_id as string).limit(300),
        sb.from("company_system_checks").select("*").eq("system_id", systemId),
      ]);
      if (!scan?.report) return json({ error: "Report not found" }, 404);

      // Same shared brain as forensic-report-chat: one evidence builder, one
      // sanitised ledger, one money guard. This surface only adds control.
      const ev = buildReportEvidence(scan as never);
      const unpublishable = ev.unpublishable;

      // Scoped retrieval: business memory for the company, report memory only
      // for THIS scan, system/conversation memory only for THIS system.
      const memItems: StoredMemoryItem[] = ((mem || []) as Array<Record<string, unknown>>).map((m) => ({
        company_id: String(m.company_id),
        scan_id: (m.scan_id as string | null) ?? null,
        system_id: (m.system_id as string | null) ?? null,
        scope: m.scope as MemoryItem["scope"],
        key: String(m.memory_key),
        value: String(m.value),
        provenance: String(m.provenance),
        confidence: Number(m.confidence),
        status: m.status as MemoryItem["status"],
        sensitivity: (m.sensitivity as MemoryItem["sensitivity"]) ?? "low",
        expires_at: (m.expires_at as string | null) ?? null,
      }));
      const usable = selectMemory(memItems, {
        companyId: String(sys.company_id),
        scanId: String(sys.scan_id),
        systemId,
        role,
      });

      const enabled = ((mods || []) as Array<Record<string, unknown>>).filter((m) => m.enabled);
      const catalogue = enabled.map((m) => {
        const reg = findModule(String(m.module_id));
        return {
          module_id: m.module_id,
          name: m.module_name,
          route: m.route,
          addresses: m.root_cause_ids,
          actions: (reg?.actions || []).map((a) => ({ id: a.id, label: a.label, risk: a.risk, confirm: a.confirm, input: a.input })),
        };
      });
      const locked = ((mods || []) as Array<Record<string, unknown>>).filter((m) => m.locked)
        .map((m) => ({ name: m.module_name, reason: m.lock_reason }));

      const system = [
        `You are the Aetheris Company System Operator for ${scan.company_name || scan.target_url}.`,
        "You operate a composed system of EXISTING Aetheris instruments. You never invent tools, credentials, integrations, company facts or recovery results.",
        "You may read, explain and draft immediately. Any write, send, publish, schedule, CRM change, automation change, brand-fact change, delete or deploy requires Plan -> Confirm -> Execute.",
        "When the operator asks for an action, reply with the plan: which module, which action id, what inputs are still missing, what it affects, the rollback path and the check you will run afterwards. Do not claim it is done.",
        "You may only reference the module actions listed below. Never claim an action that is not listed.",
        moneyRules(unpublishable),
        OPERATOR_VOICE,
        "",
        `ENABLED MODULES + ALLOWED ACTIONS:\n${JSON.stringify(catalogue)}`,
        locked.length ? `RECOMMENDED BUT LOCKED (cannot execute): ${JSON.stringify(locked)}` : "",
        `GOALS:\n${JSON.stringify((goals || []).slice(0, 30))}`,
        `CHECKS:\n${JSON.stringify((checks || []).slice(0, 20))}`,
        `ACTIVE MEMORY (approved or high-confidence, labelled):\n${JSON.stringify(usable.slice(0, 60))}`,
        ev.briefContext,
      ].filter(Boolean).join("\n\n");

      const res = await routedChatCompletion({
        tier: "heavy",
        temperature: 0.35,
        max_tokens: 1600,
        timeoutMs: 55_000,
        messages: [
          { role: "system", content: system },
          ...(Array.isArray(body.history) ? body.history.slice(-6) : []),
          { role: "user", content: question },
        ],
      });
      const answer = guardAnswer(res.content || "", ev);
      await logEvent({ system_id: systemId, company_id: sys.company_id, scan_id: sys.scan_id, kind: "operator_turn", input: { question }, result: { answer: answer.slice(0, 4000) } });
      return json({ answer });
    }

    if (action === "action_preview" || action === "action_execute") {
      const systemId = String(body.system_id ?? "");
      const sys = await loadSystem(systemId);
      if (sys === "forbidden") return json({ error: "Forbidden" }, 403);
      if (!sys) return json({ error: "Not found" }, 404);

      const moduleId = String(body.module_id ?? "");
      const actionId = String(body.action_id ?? "");
      const input = (body.input || {}) as Record<string, unknown>;

      const [{ data: mods }, { data: brandRow }] = await Promise.all([
        sb.from("company_system_modules").select("module_id, enabled").eq("system_id", systemId),
        sys.brand_context_id
          ? sb.from("company_brand_contexts").select("*").eq("id", sys.brand_context_id as string).maybeSingle()
          : Promise.resolve({ data: null }),
      ]);
      const enabledIds = ((mods || []) as Array<{ module_id: string; enabled: boolean }>)
        .filter((m) => m.enabled).map((m) => m.module_id);
      const brand = (brandRow || null) as Record<string, unknown> | null;
      const brandStatus = (brand?.status as string | undefined) ?? null;

      // The confirmation ticket is looked up server-side. The client only ever
      // hands back an opaque token issued by a prior action_preview.
      let claim: ConfirmationClaim | null = null;
      const tokenIn = typeof body.confirmation_token === "string" ? body.confirmation_token : "";
      if (action === "action_execute" && tokenIn) {
        const { data: row } = await sb.from("company_system_confirmations")
          .select("*").eq("token", tokenIn).maybeSingle();
        if (row) claim = row as unknown as ConfirmationClaim;
      }

      const systemVersion = Number(sys.system_version ?? 1);
      const decision = validateAction(
        { module_id: moduleId, action_id: actionId, input },
        {
          clientTier: sys.tier as ModuleTier,
          enabledModuleIds: enabledIds,
          role,
          systemApprovalState: (sys.approval_state as string) ?? null,
          brandStatus,
          confirmation: action === "action_execute" ? claim : null,
          actor,
          systemId,
          sourceReportHash: String(sys.source_report_hash ?? ""),
          systemVersion,
        },
      );

      if (action === "action_preview" || !decision.ok) {
        // Issue a bound, single-use ticket only when the plan is otherwise
        // valid and merely awaiting the operator's confirmation.
        let confirmation: Record<string, unknown> | null = null;
        if (action === "action_preview" && decision.requires_confirmation && decision.preview && !claim) {
          const token = crypto.randomUUID() + crypto.randomUUID().replace(/-/g, "");
          const bound = buildConfirmation(
            { module_id: moduleId, action_id: actionId, input },
            {
              actor, systemId,
              sourceReportHash: String(sys.source_report_hash ?? ""),
              systemVersion,
              affects: decision.preview.affects,
            },
          );
          const { error: cErr } = await sb.from("company_system_confirmations").insert({
            token, actor_role: role, preview: decision.preview, ...bound,
          });
          if (cErr) throw cErr;
          confirmation = {
            token,
            expires_at: bound.expires_at,
            affects: bound.affects,
            input_hash: bound.input_hash,
            single_use: true,
          };
        }
        await logEvent({
          system_id: systemId, kind: "action_planned", module_id: moduleId,
          action_id: actionId, input, preview: decision.preview || null,
          status: decision.ok ? "ready" : decision.requires_confirmation ? "awaiting_confirmation" : "rejected",
          error_message: decision.ok ? null : decision.error,
        });
        return json({ ...decision, confirmation }, decision.ok || decision.requires_confirmation ? 200 : 400);
      }

      const mod = findModule(moduleId)!;
      const act = mod.actions.find((a) => a.id === actionId)!;

      // Atomic single-use consumption. A racing second execute finds no
      // unconsumed row and loses.
      if (claim) {
        const { data: spent } = await sb.from("company_system_confirmations")
          .update({ consumed_at: new Date().toISOString() })
          .eq("token", tokenIn).is("consumed_at", null).select("id").maybeSingle();
        if (!spent) {
          return json({ ok: false, requires_confirmation: true, error: "Confirmation already used. Preview the action again." }, 409);
        }
      }

      // Execute: the bus only ever invokes the registered function for the
      // registered action, with the validated input. No arbitrary code.
      let result: unknown = null;
      let status = "executed";
      let errorMessage: string | null = null;
      try {
        const payload = buildAdapterPayload(act.payload_kind, {
          moduleId: mod.id, input, systemId, scanId: String(sys.scan_id),
          companyId: String(sys.company_id), targetUrl: String(sys.manifest && (sys.manifest as Record<string, Record<string, string>>).identity?.website_url || ""),
          brand: brandStatus === "approved" ? brand : null,
        });
        const r = await fetch(`${SUPABASE_URL}/functions/v1/${act.fn}`, {
          method: "POST",
          headers: { "Content-Type": "application/json", "x-internal-key": SVC, Authorization: `Bearer ${SVC}` },
          body: JSON.stringify(payload),
        });
        const text = await r.text();
        result = { status: r.status, body: text.slice(0, 4000) };
        if (!r.ok) { status = "failed"; errorMessage = `${act.fn} returned ${r.status}`; }
      } catch (e) {
        status = "failed";
        errorMessage = (e as Error).message;
      }

      // Post-action verification: run/queue the registered check and record
      // whether anything actually moved. Never claim recovery without it.
      let verification: Record<string, unknown> | null = null;
      if (status === "executed") {
        const { data: checkRow } = await sb.from("company_system_checks")
          .select("*").eq("system_id", systemId).order("created_at", { ascending: true }).limit(1).maybeSingle();
        if (checkRow) {
          const c = checkRow as { id: string; name: string; threshold: string | null };
          await sb.from("company_system_checks").update({
            last_status: "queued",
            last_run_at: new Date().toISOString(),
            last_result: { queued_by: `${mod.id}.${act.id}`, note: "Awaiting measurement window." },
          }).eq("id", c.id);
          verification = { check: c.name, state: "queued", threshold: c.threshold, measured: false };
        } else {
          verification = { check: null, state: "no_registered_check", measured: false };
        }
        await sb.from("company_system_metrics").insert({
          system_id: systemId,
          metric_key: `${mod.id}.${act.id}.executions`,
          value: 1,
          source: "action_bus",
          label: "Execution count only. Not a recovery measurement.",
        }).then(() => undefined, () => undefined);
      }

      await logEvent({
        system_id: systemId, company_id: sys.company_id, scan_id: sys.scan_id,
        kind: "action_executed", module_id: mod.id, action_id: act.id,
        input, preview: decision.preview, result: { ...(result as Record<string, unknown>), verification }, status,
        error_message: errorMessage, rollback_note: act.rollback,
      });

      return json({
        ok: status === "executed", status, result, verification,
        rollback: act.rollback, error: errorMessage,
        goal_movement: "unmeasured until the registered check reports.",
      });
    }



    if (action === "events") {
      const systemId = String(body.system_id ?? "");
      const sys = await loadSystem(systemId);
      if (sys === "forbidden") return json({ error: "Forbidden" }, 403);
      if (!sys) return json({ error: "Not found" }, 404);
      const { data } = await sb.from("company_system_events").select("*")
        .eq("system_id", systemId).order("created_at", { ascending: false }).limit(200);
      return json({ events: data || [] });
    }

    return json({ error: "Unknown action" }, 400);
  } catch (e) {
    console.error("company-system error:", e);
    return json({ error: e instanceof Error ? e.message : "Unknown error" }, 500);
  }
});
