import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { verifyAdminToken } from "../_shared/admin-token.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-admin-token",
};

const FIRECRAWL_API_KEY = Deno.env.get("FIRECRAWL_API_KEY");
const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

async function scrapeUrl(url: string): Promise<string> {
  if (!FIRECRAWL_API_KEY) return "";
  try {
    const r = await fetch("https://api.firecrawl.dev/v2/scrape", {
      method: "POST",
      headers: { Authorization: `Bearer ${FIRECRAWL_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({ url, formats: ["markdown"] }),
    });
    if (!r.ok) return "";
    const j = await r.json();
    return (j?.data?.markdown || "").slice(0, 20000);
  } catch {
    return "";
  }
}

async function fetchTextDirect(url: string): Promise<string> {
  try {
    const r = await fetch(url);
    const ct = r.headers.get("content-type") || "";
    if (ct.startsWith("text/") || ct.includes("json") || ct.includes("markdown")) {
      const t = await r.text();
      return t.slice(0, 20000);
    }
  } catch { /* ignore */ }
  return "";
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    // Admin auth via x-admin-token (matches other admin functions in this project)
    const adminToken = req.headers.get("x-admin-token");
    if (!adminToken) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const { data: tokenRow } = await supabase
      .from("admin_tokens").select("user_id, expires_at").eq("token", adminToken).maybeSingle();
    if (!tokenRow || new Date(tokenRow.expires_at).getTime() < Date.now()) {
      return new Response(JSON.stringify({ error: "Invalid admin token" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY missing");

    const body = await req.json();
    const attachments: Array<{ name: string; url: string }> = body.attachments || [];
    const referenceText: string = body.referenceText || "";
    const kind: "mcq" | "open" = body.kind === "open" ? "open" : "mcq";
    const count: number = Math.min(Math.max(Number(body.count) || 5, 1), 20);
    const focus: string = body.focus || "";
    const title: string = body.title || "Training";

    // Pull text from each attachment
    const sources: string[] = [];
    for (const a of attachments.slice(0, 8)) {
      let text = await fetchTextDirect(a.url);
      if (!text) text = await scrapeUrl(a.url);
      if (text) sources.push(`### Source: ${a.name}\n${text}`);
    }

    const combined = [
      referenceText ? `### Reference notes\n${referenceText}` : "",
      ...sources,
    ].filter(Boolean).join("\n\n---\n\n").slice(0, 60000);

    if (!combined.trim()) {
      return new Response(JSON.stringify({ error: "No readable content in uploads or reference text." }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const schema = kind === "mcq"
      ? `Each question object: { "question_text": string, "options": [4 strings], "correct_index": 0..3, "weight": 1 }`
      : `Each question object: { "question_text": string, "rubric": "what a strong answer must cover (2-4 sentences)", "weight": 1 }`;

    const systemPrompt = `You are a sales training designer. Build a rigorous, fair quiz from the provided source material.
Rules:
- Generate exactly ${count} questions.
- Test understanding and application — not trivia.
- Stay strictly inside the source. Do not invent facts.
- ${kind === "mcq" ? "For MCQ: 4 plausible options. Exactly ONE correct answer. Distractors must be tempting." : "For open: a concrete rubric the AI grader can score against."}
- Output STRICT JSON only: { "questions": [ ${schema} ] }. No prose, no markdown fences.`;

    const userPrompt = `Training title: ${title}
${focus ? `Focus area: ${focus}\n` : ""}Quiz type: ${kind === "mcq" ? "Multiple Choice" : "Open Answer (AI-graded)"}
Question count: ${count}

SOURCE MATERIAL:
${combined}

Return JSON only.`;

    const aiResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-pro",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        response_format: { type: "json_object" },
      }),
    });

    if (!aiResp.ok) {
      const t = await aiResp.text();
      return new Response(JSON.stringify({ error: `AI ${aiResp.status}: ${t}` }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const aiJson = await aiResp.json();
    let content = aiJson.choices?.[0]?.message?.content || "{}";
    // Strip code fences if present
    content = content.replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/i, "").trim();
    let parsed: { questions?: unknown[] } = {};
    try { parsed = JSON.parse(content); } catch { parsed = {}; }
    const questions = Array.isArray(parsed.questions) ? parsed.questions : [];

    return new Response(JSON.stringify({ questions, sourcesUsed: sources.length }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
