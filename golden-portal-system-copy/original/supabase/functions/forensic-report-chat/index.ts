// Golden Report advisor — "Fix this for me".
// POST /forensic-report-chat { scan_id, question, history?, mode? }
//   → { answer, citations: [{ chapter_no, slug, title }] }
//
// The report is the evidence base, not the ceiling: the operator gives real
// consultative strategy for the company, grounded in the scan.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";
import { buildReportEvidence, guardAnswer, citationsFor, moneyRules, OPERATOR_VOICE } from "../_shared/report-brain.ts";
import { routedChatCompletion } from "../_shared/ai-router.ts";
import { verifyAdminToken, getAdminTokenFromRequest } from "../_shared/admin-token.ts";
import { verifyPortalToken, getPortalTokenFromRequest } from "../_shared/portal-token.ts";
import { selectMemory, findModule, type StoredMemoryItem } from "../_shared/universe-system.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-admin-token, x-portal-token",
};

const SVC = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const sb = createClient(Deno.env.get("SUPABASE_URL")!, SVC);

/**
 * Control-plane context for the report advisor.
 *
 * The public/shared report chat stays advice-only: it never sees the company
 * system, its memory or its action surface. Only an authenticated admin, or a
 * rep scoped to their own report, gets the operator layer — and even then this
 * endpoint only ever PLANS. Execution lives behind company-system's
 * Plan -> Confirm -> Execute bus, which is the single audited action path.
 */
async function loadControlPlane(scanId: string, req: Request) {
  const isAdmin = await verifyAdminToken(getAdminTokenFromRequest(req), SVC);
  const portal = isAdmin ? null : await verifyPortalToken(getPortalTokenFromRequest(req), SVC);
  const repScope = portal && portal.role === "rep" ? portal.code : null;
  if (!isAdmin && !repScope) return null;

  const { data: sys } = await sb.from("company_systems").select("*").eq("scan_id", scanId)
    .order("system_version", { ascending: false }).limit(1).maybeSingle();
  if (!sys) return null;
  if (repScope && (sys as { rep_code: string | null }).rep_code !== repScope) return null;

  const [{ data: mods }, { data: goals }, { data: mem }, { data: events }] = await Promise.all([
    sb.from("company_system_modules").select("*").eq("system_id", sys.id).order("display_order"),
    sb.from("company_system_goals").select("*").eq("system_id", sys.id).order("priority").limit(30),
    sb.from("company_system_memory").select("*").eq("company_id", sys.company_id).limit(200),
    sb.from("company_system_events").select("kind, module_id, action_id, status, created_at")
      .eq("system_id", sys.id).order("created_at", { ascending: false }).limit(15),
  ]);

  // Scoped: business memory for the company, report memory only for THIS scan,
  // system/conversation memory only for THIS system.
  const usable = selectMemory(
    ((mem || []) as Array<Record<string, unknown>>).map((m) => ({
      company_id: String(m.company_id),
      scan_id: (m.scan_id as string | null) ?? null,
      system_id: (m.system_id as string | null) ?? null,
      scope: m.scope, key: String(m.memory_key), value: String(m.value),
      provenance: String(m.provenance), confidence: Number(m.confidence), status: m.status,
      sensitivity: m.sensitivity, expires_at: (m.expires_at as string | null) ?? null,
    })) as StoredMemoryItem[],
    { companyId: String(sys.company_id), scanId, systemId: String(sys.id), role: "operator" },
  );

  const rows = (mods || []) as Array<Record<string, unknown>>;
  const enabled = rows.filter((m) => m.enabled && !m.locked).map((m) => {
    const reg = findModule(String(m.module_id));
    return {
      module_id: m.module_id, name: m.module_name, route: m.route, addresses: m.root_cause_ids,
      actions: (reg?.actions || []).map((a) => ({ id: a.id, label: a.label, risk: a.risk, confirm: a.confirm, input: a.input })),
    };
  });
  const locked = rows.filter((m) => m.locked).map((m) => ({ name: m.module_name, reason: m.lock_reason }));

  return {
    system_id: sys.id as string,
    status: sys.status as string,
    block: [
      `## COMPANY SYSTEM (control plane, version ${sys.system_version}, status ${sys.status})`,
      `Workspace: /company-system/${sys.id}`,
      `ENABLED MODULES + ALLOWED ACTIONS:\n${JSON.stringify(enabled)}`,
      locked.length ? `RECOMMENDED BUT LOCKED (never claim these can run): ${JSON.stringify(locked)}` : "",
      `GOALS:\n${JSON.stringify(goals || [])}`,
      `ACTIVE MEMORY (approved or high-confidence only):\n${JSON.stringify(usable.slice(0, 60))}`,
      `RECENT ACTIONS:\n${JSON.stringify(events || [])}`,
    ].filter(Boolean).join("\n\n"),
  };
}


Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const { scan_id, question, history } = await req.json();
    if (!scan_id || !question) {
      return new Response(JSON.stringify({ error: "scan_id and question required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const { data: row, error } = await sb.from("forensic_scans").select("report,target_url,company_name,report_state").eq("id", scan_id).single();
    if (error || !row?.report) {
      return new Response(JSON.stringify({ error: "Report not found" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    // Shared brain: one evidence builder, one sanitised ledger, one money guard.
    const ev = buildReportEvidence(row as never);
    const { company, report, unpublishable, context } = ev;

    // Same advisor, upgraded: for an authorized operator it also knows the
    // composed company system, its memory and its allowed actions. Public and
    // shared report readers get exactly the advice-only behaviour as before.
    const control = await loadControlPlane(scan_id, req).catch(() => null);

    const messages = [
      { role: "system", content:
`You are the Aetheris Operator advising ${company} live, on screen, while they read their forensic report.

WHAT YOU ARE: a revenue-leak operator giving real consulting. The report is your evidence base, NOT your ceiling. You are expected to go beyond it with practical strategy, sequencing, tooling, staffing, pricing, outreach and process advice that fits this specific company.

HOW YOU ANSWER:
- ${OPERATOR_VOICE}
- If the report has no signal on something, say so and give the best operator play anyway.
- ${moneyRules(unpublishable)}
- Keep answers tight: under 400 words unless they ask for a full plan, then use numbered steps.
${control ? `
CONTROL PLANE: this company has a composed Aetheris Company System. Use its modules, goals, memory and recent actions as fact. Treat active memory as approved company truth and never contradict it silently.
- You may read, explain and draft here. You may NOT execute anything from this chat.
- When the operator asks you to do something, answer with the plan: which module, which action id, the inputs still missing, what it affects, the rollback path and the check you will run after. Then tell them to confirm it in the system workspace, where the action is executed and logged.
- Only reference the module actions listed below. Never claim a locked module can run. Never invent credentials, integrations or results.
` : ""}
REPORT:
${context}${control ? `\n\n${control.block}` : ""}` },
      ...(Array.isArray(history) ? history.slice(-6) : []),
      { role: "user", content: question },
    ];


    const res = await routedChatCompletion({
      tier: "heavy",
      messages,
      temperature: 0.4,
      max_tokens: 1800,
      timeoutMs: 55_000,
    });
    const raw = res.content || "";
    if (!raw.trim()) throw new Error("No answer produced. Try again.");
    // Validate the OUTPUT, not just the input: the model may quote canonical
    // scoped values but must never compute, add, extrapolate or invent money.
    // For an unpublishable report the allowed set is empty by construction, so
    // every leak figure the model might still produce is redacted here.
    const answer = guardAnswer(raw, ev);
    const cites = citationsFor(answer, report);
    return new Response(JSON.stringify({
      answer,
      citations: cites,
      // Advice-only for everyone; an authorized operator additionally gets the
      // workspace pointer where a planned action can be confirmed and executed.
      mode: control ? "operator" : "advice_only",
      system_id: control?.system_id ?? null,
      workspace_url: control ? `/company-system/${control.system_id}` : null,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (e) {
    return new Response(JSON.stringify({ error: String((e as Error).message || e) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
