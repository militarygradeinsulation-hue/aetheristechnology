// Smart-PDF chat — answers questions about a specific forensic_scans row.
// POST /forensic-report-chat { scan_id, question, history? }
//   → { answer, citations: [{ chapter_no, slug, title }] }

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY")!;

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
    const { data: row, error } = await sb.from("forensic_scans").select("report,target_url,company_name").eq("id", scan_id).single();
    if (error || !row?.report) {
      return new Response(JSON.stringify({ error: "Report not found" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const report = row.report as { executive_summary?: string; top_leaks?: unknown; chapters?: Chapter[] };
    const context = [
      `# Forensic Report — ${row.company_name || row.target_url}`,
      `## Executive Summary\n${report.executive_summary || ""}`,
      `## Top Leaks\n${JSON.stringify(report.top_leaks || [])}`,
      ...((report.chapters || []).map(chapterToContext)),
    ].join("\n\n").slice(0, 180_000);

    const messages = [
      { role: "system", content:
`You are the Aetheris Operator answering questions about THIS forensic report ONLY.
Use only the report content. If a question is outside the report, say so.
Cite chapters as [Ch <no> — <title>]. USD only. Blunt, operator voice. No em-dashes.

REPORT:
${context}` },
      ...(Array.isArray(history) ? history.slice(-6) : []),
      { role: "user", content: question },
    ];

    const r = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({ model: "google/gemini-2.5-flash", messages, temperature: 0.3 }),
    });
    if (r.status === 429) return new Response(JSON.stringify({ error: "Rate limited, try again shortly." }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    if (r.status === 402) return new Response(JSON.stringify({ error: "Workspace AI credits exhausted." }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    if (!r.ok) throw new Error(await r.text());
    const j = await r.json();
    const answer = j.choices?.[0]?.message?.content || "";
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
