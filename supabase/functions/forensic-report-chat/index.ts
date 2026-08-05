// Golden Report advisor — "Fix this for me".
// POST /forensic-report-chat { scan_id, question, history?, mode? }
//   → { answer, citations: [{ chapter_no, slug, title }] }
//
// The report is the evidence base, not the ceiling: the operator gives real
// consultative strategy for the company, grounded in the scan.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";
import { sanitizedGoldenReport, guardChatMoney } from "../_shared/golden-money-sanitizer.ts";
import { routedChatCompletion } from "../_shared/ai-router.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

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

REPORT:
${context}` },
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
    const answer = guardChatMoney(raw, report as never).text;
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
