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
import { sanitizedGoldenReport, guardChatMoney } from "../_shared/golden-money-sanitizer.ts";
import { reportHash, isBlueprintEligible, resolveBusinessIdentity, type ScanRow } from "../_shared/golden-archive.ts";
import {
  UNIVERSE_MODULE_REGISTRY,
  COMPANY_SYSTEM_TEMPLATE_VERSION,
  composeCompanySystem,
  buildBrandContext,
  validateAction,
  validateMemoryItem,
  activeMemory,
  findModule,
  shouldRecompose,
  type ModuleTier,
  type RootCauseInput,
  type MemoryItem,
} from "../_shared/universe-system.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-admin-token, x-portal-token, x-internal-key, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};
const json = (b: unknown, status = 200) =>
  new Response(JSON.stringify(b), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

const SCAN_COLS =
  "id, target_url, company_name, report, raw_findings, brand_kit, brand_kit_status, report_source, portal_source, rep_code, creator_name, creator_email, report_state, financial_model_version, completed_at, status";

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
    const repScope = portal && portal.role === "rep" ? portal.code : null;
    const role: "admin" | "operator" | "viewer" = isAdmin || internal ? "admin" : repScope ? "operator" : "viewer";
    const actor = isAdmin ? "admin" : repScope ? `rep:${repScope}` : "internal";

    /** Rep scoping: a rep may only touch systems for their own reports. */
    async function loadSystem(systemId: string) {
      const { data } = await sb.from("company_systems").select("*").eq("id", systemId).maybeSingle();
      if (!data) return null;
      if (repScope && (data as { rep_code: string | null }).rep_code !== repScope) return "forbidden" as const;
      return data as Record<string, unknown>;
    }

    async function logEvent(row: Record<string, unknown>) {
      await sb.from("company_system_events").insert({ actor, actor_role: role, ...row });
    }

    /* ── registry ─────────────────────────────────────────────────────── */
    if (action === "registry") {
      return json({ modules: UNIVERSE_MODULE_REGISTRY, template_version: COMPANY_SYSTEM_TEMPLATE_VERSION });
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
      if (repScope && (scan as { rep_code?: string | null }).rep_code !== repScope) return json({ error: "Forbidden" }, 403);

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
      if (goalRows.length) await sb.from("company_system_goals").insert(goalRows);

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

      await logEvent({
        system_id: systemId, company_id: companyId, scan_id: scanId,
        kind: "system_composed", status: "logged",
        result: { modules: composed.modules.length, gaps: composed.gaps.length, coverage: composed.coverage },
      });

      return json({ system, composed, reused: false });
    }

    /* ── workspace payload ────────────────────────────────────────────── */
    if (action === "get") {
      const systemId = String(body.system_id ?? "");
      const sys = await loadSystem(systemId);
      if (sys === "forbidden") return json({ error: "Forbidden" }, 403);
      if (!sys) return json({ error: "Not found" }, 404);

      const [mods, conns, goals, checks, forecasts, events, memory, company, archive, brand] = await Promise.all([
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
      ]);

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
        registry: UNIVERSE_MODULE_REGISTRY,
      });
    }

    if (action === "list") {
      let q = sb.from("company_systems").select("*").order("created_at", { ascending: false }).limit(100);
      if (repScope) q = q.eq("rep_code", repScope);
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
      const { data } = await sb.from("company_system_modules")
        .update({ enabled: !!body.enabled }).eq("id", (row as { id: string }).id).select("*").maybeSingle();
      await logEvent({ system_id: systemId, kind: "module_toggle", module_id: moduleId, result: { enabled: !!body.enabled } });
      return json({ module: data });
    }

    if (action === "approve_system") {
      if (!isAdmin) return json({ error: "Forbidden" }, 403);
      const systemId = String(body.system_id ?? "");
      const state = String(body.approval_state ?? "approved");
      if (!["draft", "approved", "rejected"].includes(state)) return json({ error: "bad state" }, 400);
      const { data } = await sb.from("company_systems").update({
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
      if (repScope) {
        const { data: own } = await sb.from("company_systems").select("id").eq("company_id", companyId).eq("rep_code", repScope).limit(1);
        if (!own?.length) return json({ error: "Forbidden" }, 403);
      }
      let q = sb.from("company_system_memory").select("*").eq("company_id", companyId);
      if (body.scope) q = q.eq("scope", String(body.scope));
      const { data } = await q.order("updated_at", { ascending: false }).limit(300);
      return json({ memory: data || [] });
    }

    if (action === "memory_upsert") {
      const item = (body.item || {}) as Partial<MemoryItem> & { company_id?: string; scan_id?: string; system_id?: string };
      const v = validateMemoryItem(item);
      if (!v.ok) return json({ error: v.error }, 400);
      const companyId = String(item.company_id ?? body.company_id ?? "");
      if (!companyId) return json({ error: "company_id required" }, 400);
      if (repScope) {
        const { data: own } = await sb.from("company_systems").select("id").eq("company_id", companyId).eq("rep_code", repScope).limit(1);
        if (!own?.length) return json({ error: "Forbidden" }, 403);
      }
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
      if (repScope) {
        const { data: own } = await sb.from("company_systems").select("id")
          .eq("company_id", (row as { company_id: string }).company_id).eq("rep_code", repScope).limit(1);
        if (!own?.length) return json({ error: "Forbidden" }, 403);
      }
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
        sb.from("company_system_memory").select("*").eq("company_id", sys.company_id as string).limit(200),
        sb.from("company_system_checks").select("*").eq("system_id", systemId),
      ]);
      if (!scan?.report) return json({ error: "Report not found" }, 404);

      const unpublishable = (scan as { report_state?: string }).report_state === "regeneration_required";
      const report = sanitizedGoldenReport(scan.report as never) as Record<string, unknown>;

      const memItems: MemoryItem[] = ((mem || []) as Array<Record<string, unknown>>).map((m) => ({
        scope: m.scope as MemoryItem["scope"],
        key: String(m.memory_key),
        value: String(m.value),
        provenance: String(m.provenance),
        confidence: Number(m.confidence),
        status: m.status as MemoryItem["status"],
      }));
      const usable = activeMemory(memItems);

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
        unpublishable
          ? "FINANCIALS WITHHELD: this report failed validation. State no dollar figures."
          : "Quote only canonical figures present in the report context. Never add, sum or derive a new dollar amount. USD only.",
        "Blunt operator voice. Short sentences. No filler, no emoji, no em-dashes.",
        "",
        `ENABLED MODULES + ALLOWED ACTIONS:\n${JSON.stringify(catalogue)}`,
        locked.length ? `RECOMMENDED BUT LOCKED (cannot execute): ${JSON.stringify(locked)}` : "",
        `GOALS:\n${JSON.stringify((goals || []).slice(0, 30))}`,
        `CHECKS:\n${JSON.stringify((checks || []).slice(0, 20))}`,
        `ACTIVE MEMORY (approved or high-confidence, labelled):\n${JSON.stringify(usable.slice(0, 60))}`,
        `CANONICAL FINANCIALS:\n${unpublishable ? "withheld" : JSON.stringify(report.overall_leakage || {})}`,
        `EXECUTIVE SUMMARY:\n${String(report.executive_summary || "").slice(0, 6000)}`,
        `TOP LEAKS:\n${JSON.stringify(report.top_leaks || []).slice(0, 8000)}`,
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
      const answer = guardChatMoney(res.content || "", unpublishable ? null : (report as never)).text;
      await logEvent({ system_id: systemId, company_id: sys.company_id, scan_id: sys.scan_id, kind: "operator_turn", input: { question }, result: { answer: answer.slice(0, 4000) } });
      return json({ answer });
    }

    if (action === "action_preview" || action === "action_execute") {
      const systemId = String(body.system_id ?? "");
      const sys = await loadSystem(systemId);
      if (sys === "forbidden") return json({ error: "Forbidden" }, 403);
      if (!sys) return json({ error: "Not found" }, 404);

      const { data: mods } = await sb.from("company_system_modules").select("module_id, enabled").eq("system_id", systemId);
      const enabledIds = ((mods || []) as Array<{ module_id: string; enabled: boolean }>)
        .filter((m) => m.enabled).map((m) => m.module_id);

      const decision = validateAction(
        {
          module_id: String(body.module_id ?? ""),
          action_id: String(body.action_id ?? ""),
          input: (body.input || {}) as Record<string, unknown>,
          confirmed: action === "action_execute" ? !!body.confirmed : false,
        },
        { clientTier: sys.tier as ModuleTier, enabledModuleIds: enabledIds, role },
      );

      if (action === "action_preview" || !decision.ok) {
        await logEvent({
          system_id: systemId, kind: "action_planned", module_id: String(body.module_id ?? ""),
          action_id: String(body.action_id ?? ""), input: body.input || {}, preview: decision.preview || null,
          status: decision.ok ? "ready" : decision.requires_confirmation ? "awaiting_confirmation" : "rejected",
          error_message: decision.ok ? null : decision.error,
        });
        return json(decision, decision.ok || decision.requires_confirmation ? 200 : 400);
      }

      // Execute: the bus only ever invokes the registered function for the
      // registered action, with the validated input. No arbitrary code.
      const mod = findModule(String(body.module_id))!;
      const act = mod.actions.find((a) => a.id === String(body.action_id))!;
      let result: unknown = null;
      let status = "executed";
      let errorMessage: string | null = null;
      try {
        const r = await fetch(`${SUPABASE_URL}/functions/v1/${act.fn}`, {
          method: "POST",
          headers: { "Content-Type": "application/json", "x-internal-key": SVC, Authorization: `Bearer ${SVC}` },
          body: JSON.stringify({ ...(body.input || {}), company_system_id: systemId, scan_id: sys.scan_id }),
        });
        const text = await r.text();
        result = { status: r.status, body: text.slice(0, 4000) };
        if (!r.ok) { status = "failed"; errorMessage = `${act.fn} returned ${r.status}`; }
      } catch (e) {
        status = "failed";
        errorMessage = (e as Error).message;
      }

      await logEvent({
        system_id: systemId, company_id: sys.company_id, scan_id: sys.scan_id,
        kind: "action_executed", module_id: mod.id, action_id: act.id,
        input: body.input || {}, preview: decision.preview, result, status,
        error_message: errorMessage, rollback_note: act.rollback,
      });

      return json({ ok: status === "executed", status, result, rollback: act.rollback, error: errorMessage });
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
