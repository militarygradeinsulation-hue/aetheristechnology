// System Blueprint generator — turns a valid, compiled Golden Report into a
// company-specific, copy-ready master build prompt/package for a vibe coder.
//
// Hard rules:
//  - Only compiled reports. regeneration_required => "Report must be repaired first."
//  - Money is read from the canonical ledger via computeGoldenLeakage. The
//    blueprint never recomputes the Golden Report total.
//  - Generation is idempotent on (scan_id, source_report_hash, template_version).
//  - Structured output is validated before saving; failures are stored + retryable.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";
import { verifyAdminToken, getAdminTokenFromRequest } from "../_shared/admin-token.ts";
import { verifyPortalToken, getPortalTokenFromRequest } from "../_shared/portal-token.ts";
import { routedChatCompletion } from "../_shared/ai-router.ts";
import { computeGoldenLeakage } from "../_shared/golden-leakage.ts";
import {
  BLUEPRINT_TEMPLATE_VERSION,
  buildArchiveSummary,
  buildFindingRows,
  isBlueprintEligible,
  resolveBusinessIdentity,
  type ScanRow,
} from "../_shared/golden-archive.ts";
import {
  validateBlueprint,
  blueprintToMarkdown,
  buildMasterPrompt,
  BLUEPRINT_SCHEMA,
  type Blueprint,
} from "./blueprint.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-admin-token, x-portal-token, x-internal-key, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};
const json = (b: unknown, status = 200) =>
  new Response(JSON.stringify(b), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

const SCAN_COLS =
  "id, target_url, company_name, report, raw_findings, report_source, portal_source, rep_code, creator_name, creator_email, report_state, financial_model_version, completed_at, status";

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SVC = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const sb = createClient(SUPABASE_URL, SVC);

    const body = await req.json().catch(() => ({}));
    const action = String(body.action ?? "generate");

    const isAdmin = await verifyAdminToken(getAdminTokenFromRequest(req), SVC);
    const portal = isAdmin ? null : await verifyPortalToken(getPortalTokenFromRequest(req), SVC);
    const internal = req.headers.get("x-internal-key") === SVC;
    if (!isAdmin && !portal && !internal) return json({ error: "Unauthorized" }, 401);
    const repScope = portal && portal.role === "rep" ? portal.code : null;

    if (action === "get") {
      const id = String(body.blueprint_id ?? "");
      const { data } = await sb.from("golden_system_blueprints").select("*").eq("id", id).maybeSingle();
      if (!data) return json({ error: "not found" }, 404);
      if (repScope) {
        const { data: arc } = await sb.from("golden_report_archive")
          .select("rep_code").eq("id", (data as Record<string, unknown>).archive_id as string).maybeSingle();
        if (!arc || (arc as { rep_code: string }).rep_code !== repScope) return json({ error: "Forbidden" }, 403);
      }
      return json({ blueprint: data });
    }

    if (action === "approve") {
      if (!isAdmin) return json({ error: "Forbidden" }, 403);
      const id = String(body.blueprint_id ?? "");
      const state = String(body.approval_state ?? "approved");
      if (!["draft", "approved", "rejected"].includes(state)) return json({ error: "bad state" }, 400);
      const { data, error } = await sb.from("golden_system_blueprints").update({
        approval_state: state,
        approved_by: state === "approved" ? String(body.approved_by ?? "admin") : null,
        approved_at: state === "approved" ? new Date().toISOString() : null,
      }).eq("id", id).select("*").maybeSingle();
      if (error) throw error;
      return json({ blueprint: data });
    }

    if (action !== "generate") return json({ error: "Unknown action" }, 400);

    /* ───────────── generate ───────────── */
    const scanId = String(body.scan_id ?? "");
    if (!scanId) return json({ error: "scan_id required" }, 400);

    const { data: scanRow } = await sb.from("forensic_scans").select(SCAN_COLS).eq("id", scanId).maybeSingle();
    if (!scanRow) return json({ error: "scan not found" }, 404);
    const scan = scanRow as unknown as ScanRow;

    const { data: archive } = await sb.from("golden_report_archive").select("*").eq("scan_id", scanId).maybeSingle();
    if (!archive) return json({ error: "Report is not archived yet. Archive it first." }, 409);
    if (repScope && (archive as { rep_code?: string }).rep_code !== repScope) return json({ error: "Forbidden" }, 403);

    if (!isBlueprintEligible(scan.report, scan.report_state)) {
      return json({ error: "Report must be repaired first.", code: "report_invalid" }, 409);
    }

    const summary = buildArchiveSummary(scan);
    const hash = summary.report_hash;

    // Idempotency: same report + same template = same blueprint.
    const { data: existing } = await sb.from("golden_system_blueprints").select("*")
      .eq("scan_id", scanId).eq("source_report_hash", hash).eq("template_version", BLUEPRINT_TEMPLATE_VERSION)
      .maybeSingle();
    if (existing && !body.force && (existing as { status: string }).status === "complete") {
      return json({ blueprint: existing, reused: true });
    }

    const identity = resolveBusinessIdentity(scan);
    const findings = buildFindingRows(scan);
    const report = (scan.report || {}) as Record<string, unknown>;
    const rootCauses = Array.isArray(report.root_causes) ? report.root_causes as Record<string, unknown>[] : [];
    const leakage = computeGoldenLeakage(report as never);

    // Reserve/refresh the row so progress is visible and retries are possible.
    const baseRow = {
      archive_id: (archive as { id: string }).id,
      scan_id: scanId,
      company_id: (archive as { company_id: string }).company_id,
      source_report_hash: hash,
      template_version: BLUEPRINT_TEMPLATE_VERSION,
      status: "running",
      error_message: null,
    };
    const { data: reserved } = await sb.from("golden_system_blueprints")
      .upsert(baseRow, { onConflict: "scan_id,source_report_hash,template_version" })
      .select("id, blueprint_version").maybeSingle();
    const blueprintId = (reserved as { id: string }).id;

    const rcList = rootCauses.map((rc, i) => ({
      id: String(rc.root_cause_id ?? `rc_${i}`),
      title: String(rc.label ?? rc.root_cause_id ?? `Root cause ${i + 1}`),
      priced: !!rc.priced,
    }));

    const context = {
      company: {
        name: identity.display_name,
        domain: identity.primary_domain,
        website: identity.website_url,
        industry: identity.industry,
        location: identity.location,
        contact_name: identity.contact_name,
      },
      canonical_financials: leakage
        ? {
          annual_low: leakage.low,
          annual_high: leakage.high,
          currency: "USD",
          priced_leak_count: leakage.count,
          note: "CANONICAL. Do not recompute, re-total or invent other figures.",
        }
        : { note: "No canonical priced range. Do NOT state any dollar figures." },
      executive_summary: summary.executive_summary,
      root_causes: rcList,
      findings: findings.map((f) => ({
        key: f.finding_key,
        title: f.title,
        category: f.category,
        chapter: f.chapter_slug,
        root_cause_id: f.root_cause_id,
        evidence_grade: f.evidence_grade,
        priced: f.annual_low != null,
      })),
      top_leaks: summary.top_leaks,
    };

    const system = [
      "You are Aetheris, a Business Forensics Operator producing a build specification for a vibe coder.",
      "Blunt, forensic, non-corporate. No hype, no filler, no emoji.",
      "CURRENCY RULE: every money value is US Dollars with a $ prefix. Never €, £, ¥, ₹, EUR, GBP, JPY, CAD, AUD.",
      "You must NEVER recompute or restate a different Golden Report total. Use the canonical range verbatim.",
      "Every root cause supplied must map to exactly one remediation capability. No duplicates, no omissions.",
      "Classify honestly: AUTOMATABLE only for things software genuinely fixes. Leadership decisions, staffing, brand approval, credentials, compliance and offline operations are ASSISTED or HUMAN_REQUIRED.",
      "Never emit secrets or real credentials — environment variables are placeholder names only.",
      "Never emit TODO, FIXME, placeholder or 'coming soon' text.",
      "Return ONLY the tool call arguments matching the schema.",
    ].join("\n");

    let blueprint: Blueprint | null = null;
    let provider = "", model = "", lastErr = "";

    for (let attempt = 0; attempt < 2 && !blueprint; attempt++) {
      try {
        const res = await routedChatCompletion({
          tier: "heavy",
          temperature: 0.3,
          max_tokens: 8000,
          timeoutMs: 180000,
          messages: [
            { role: "system", content: system },
            {
              role: "user",
              content:
                `Build the System Blueprint for this company from its Golden Report evidence.\n\n${JSON.stringify(context)}\n\n` +
                `Cover every root cause id exactly once in capability_map. Ground every goal, check, dashboard metric, automation and forecast in the findings above.`,
            },
          ],
          tools: [{ type: "function", function: BLUEPRINT_SCHEMA }],
          tool_choice: { type: "function", function: { name: BLUEPRINT_SCHEMA.name } },
        });
        provider = res.provider;
        model = res.model;
        const call = res.message?.tool_calls?.[0];
        const args = call?.function?.arguments;
        blueprint = typeof args === "string" ? JSON.parse(args) : (args ?? JSON.parse(res.content || "{}"));
      } catch (e) {
        lastErr = (e as Error).message;
      }
    }

    if (!blueprint) {
      await sb.from("golden_system_blueprints").update({
        status: "failed",
        error_message: lastErr || "AI returned no structured blueprint",
        validation_passed: false,
      }).eq("id", blueprintId);
      return json({ error: "Blueprint generation failed", detail: lastErr }, 502);
    }

    const validation = validateBlueprint(blueprint, {
      rootCauseIds: rcList.map((r) => r.id),
      canonical: leakage ? { low: leakage.low, high: leakage.high } : null,
    });

    const markdown = blueprintToMarkdown(blueprint, context, validation);
    const masterPrompt = buildMasterPrompt(blueprint, context);

    const { data: saved, error: saveErr } = await sb.from("golden_system_blueprints").update({
      status: validation.ok ? "complete" : "needs_review",
      output_json: blueprint as unknown as Record<string, unknown>,
      output_markdown: markdown,
      master_prompt: masterPrompt,
      validation,
      validation_passed: validation.ok,
      ai_provider: provider,
      ai_model: model,
      error_message: validation.ok ? null : validation.errors.slice(0, 5).join(" | "),
    }).eq("id", blueprintId).select("*").maybeSingle();
    if (saveErr) throw saveErr;

    return json({ blueprint: saved, validation });
  } catch (e) {
    console.error("golden-system-blueprint error:", e);
    return json({ error: e instanceof Error ? e.message : "Unknown error" }, 500);
  }
});
