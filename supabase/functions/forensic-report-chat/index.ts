// Golden Report advisor — "Fix this for me".
// POST /forensic-report-chat { scan_id, question, history?, mode? }
//   → { answer, citations: [{ chapter_no, slug, title }] }
//
// The report is the evidence base, not the ceiling: the operator gives real
// consultative strategy for the company, grounded in the scan.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";
import { sanitizedGoldenReport, guardChatMoney } from "../_shared/golden-money-sanitizer.ts";
import { routedChatCompletion } from "../_shared/ai-router.ts";
import { verifyAdminToken, getAdminTokenFromRequest } from "../_shared/admin-token.ts";
import { verifyPortalToken, getPortalTokenFromRequest } from "../_shared/portal-token.ts";
import { activeMemory, findModule, type MemoryItem } from "../_shared/universe-system.ts";

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

  const usable = activeMemory(((mem || []) as Array<Record<string, unknown>>).map((m) => ({
    scope: m.scope, key: String(m.memory_key), value: String(m.value),
    provenance: String(m.provenance), confidence: Number(m.confidence), status: m.status,
  })) as MemoryItem[]);

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


interface Chapter { no: number; slug: string; title: string; verdict?: string;
  what_we_found?: string; why_its_leaking?: string; what_its_costing?: string;
  what_to_do?: unknown; evidence?: unknown }

function chapterToContext(c: Chapter) {
  return `### CH ${c.no} — ${c.title} [slug:${c.slug}]
Verdict: ${c.verdict || ""}
${c.what_we_found || ""}

Why it's leaking: ${c.why_its_leaking || ""}
What it's costing: ${c.what_its_costing || ""}
Actions: ${JSON.stringify(c.what_to_do || {})}
Evidence: ${JSON.stringify(c.evidence || [])}`;
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
    // Never let the advisor quote a stale leak amount: it reads the same
    // ledger-sanitized report the client sees on screen.
    const report = sanitizedGoldenReport(row.report as never) as {
      executive_summary?: string;
      top_leaks?: unknown;
      overall_leakage?: unknown;
      deliverables?: unknown;
      chapters?: Chapter[];
    };
    const company = row.company_name || row.target_url;
    // A report whose financials failed the compiler has no publishable money.
    // The advisor still gives strategy, but it is forbidden to state any leak
    // figure for it, and the client is told why rather than being shown a
    // number nobody can stand behind.
    const unpublishable = row.report_state === "regeneration_required";
    const context = [
      `# Forensic Report — ${company}`,
      `Website: ${row.target_url}`,
      unpublishable
        ? "## Total annual leakage\nNOT AVAILABLE. This scan's financial model did not pass validation and is queued for regeneration. State no dollar figures for this report."
        : `## Total annual leakage\n${JSON.stringify(report.overall_leakage || {})}`,
      `## Executive Summary\n${report.executive_summary || ""}`,
      `## Top Leaks\n${JSON.stringify(report.top_leaks || [])}`,
      ...((report.chapters || []).map(chapterToContext)),
    ].join("\n\n").slice(0, 160_000);

    // Same advisor, upgraded: for an authorized operator it also knows the
    // composed company system, its memory and its allowed actions. Public and
    // shared report readers get exactly the advice-only behaviour as before.
    const control = await loadControlPlane(scan_id, req).catch(() => null);

    const messages = [
      { role: "system", content:
`You are the Aetheris Operator advising ${company} live, on screen, while they read their forensic report.

WHAT YOU ARE: a revenue-leak operator giving real consulting. The report is your evidence base, NOT your ceiling. You are expected to go beyond it with practical strategy, sequencing, tooling, staffing, pricing, outreach and process advice that fits this specific company.

HOW YOU ANSWER:
- Lead with the answer. No preamble, no restating the question.
- Be concrete: exact steps, who does it, what tool or vendor, how long it takes, rough cost, and how they will know it worked.
- When you use a report finding, cite it as [Ch <no> — <title>]. When you go beyond the report, say plainly that it is your recommendation rather than a scan finding.
- Never invent scan data, numbers, client names or results that are not in the report. Judgement and strategy are yours to give; facts about this company are not.
- If the report has no signal on something, say so and give the best operator play anyway.
${unpublishable ? "- FINANCIALS WITHHELD: this scan's pricing did not pass validation. Do not state, estimate or imply ANY dollar figure for this company. Say the financial model is being regenerated and give the non-financial operator advice instead.\n" : ""}- USD only, every amount as $X,XXX. Quote only figures present in the report above, in the same scope they appear in. Never add, sum, average, annualize or otherwise derive a new dollar amount. Blunt operator voice, short sentences, no em-dashes, no rhetorical questions, no corporate filler.
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
    const answer = guardChatMoney(raw, unpublishable ? null : (report as never)).text;
    const cites: { chapter_no: number; slug: string; title: string }[] = [];
    for (const c of report.chapters || []) {
      const re = new RegExp(`Ch\\s*${c.no}\\b`, "i");
      if (re.test(answer)) cites.push({ chapter_no: c.no, slug: c.slug, title: c.title });
    }
    return new Response(JSON.stringify({ answer, citations: cites }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String((e as Error).message || e) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
