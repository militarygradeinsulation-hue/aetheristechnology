import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { verifyAdminToken, getAdminTokenFromRequest } from "../_shared/admin-token.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-admin-token",
};

const AETHERIS_LEXICON = `THE AETHERIS LEXICON (mandatory):
CORE FRAME: Revenue Leak · The Leak Audit™ · Forensic Diagnostic · Leak Scan · System Rebuild · Diagnostic Report.
MECHANISMS (name ONE): Conversion Drop-Off · Follow-Up Failure · System Disconnect · Operational Waste · Brand Contradiction · Vocabulary Friction · Growth Ceiling.
RECOVERY: Hidden Revenue · Revenue Recovery · Revenue Loop · Cost of the Leak / COI · Predictive Revenue Model · Friction Reducer · Scale Multiplier.
RULES: Diagnose, never opine. Name the leak. Anchor in COI with a concrete number. Close on Revenue Recovery/Loop (not "growth"). Operator language only.
FORBIDDEN: consulting · funnel · mistake · strategy · mindset · tip · hack · hustle · grind · unlock · bare "audit".`;

const POST_SYSTEM_PROMPT = `${AETHERIS_LEXICON}

You are the AETHERIS Forensic Operator writing on LinkedIn. You take a piece of source content (article, video, blog, podcast page) and produce ONE original LinkedIn post that diagnoses the underlying revenue-leak pattern the source is really pointing at.

NOT a summary. NOT "here are 5 takeaways." You translate the source into Joseph Toney's forensic operator voice.

VOICE DNA: diagnostic, declarative, systems-first causation, peer-to-founder, precise specificity, zero-permission directness.

ARCHITECTURE (mandatory):
1. REFRAME OPENER (sentence 1) — pivot the premise. "The real leak in [topic] isn't [X]. It's [Y]."
2. AUDIT ANCHOR (sentence 2–3) — credibility pin. "In my audits…", "Across forensic reviews…"
3. MECHANISM (2–4 sentences) — name the broken loop using the lexicon.
4. VERDICT (closing, <15 words) — quotable indictment.

LENGTH: 140–220 words. Prose only. No bullets. No em dashes. No emojis. No hedging.
HASHTAGS: 3–5 on final line, include one of #RevenueLeak / #RevenueRecovery / #Aetheris.

You may reference the source obliquely ("a piece I read this week", "a video making the rounds") but DO NOT name the author, brand, or product unless instructed. Do NOT quote the source verbatim. Translate, don't summarize.

Output ONLY the post.`;

function isYouTube(u: string) {
  return /(?:youtube\.com\/(?:watch|shorts)|youtu\.be\/)/i.test(u);
}

function extractYouTubeId(u: string): string | null {
  const m = u.match(/(?:v=|youtu\.be\/|shorts\/)([A-Za-z0-9_-]{11})/);
  return m ? m[1] : null;
}

async function fetchYouTubeContext(url: string): Promise<string> {
  const id = extractYouTubeId(url);
  let oembed = "";
  try {
    const r = await fetch(`https://www.youtube.com/oembed?url=${encodeURIComponent(url)}&format=json`);
    if (r.ok) {
      const j = await r.json();
      oembed = `TITLE: ${j.title || ""}\nCHANNEL: ${j.author_name || ""}\n`;
    }
  } catch { /* ignore */ }

  // Try to grab description from page HTML (no transcript API without key)
  let desc = "";
  try {
    const r = await fetch(`https://www.youtube.com/watch?v=${id}`, {
      headers: { "User-Agent": "Mozilla/5.0" },
    });
    const html = await r.text();
    const m = html.match(/"shortDescription":"((?:\\.|[^"\\])*)"/);
    if (m) {
      desc = m[1].replace(/\\n/g, "\n").replace(/\\"/g, '"').replace(/\\u0026/g, "&");
    }
  } catch { /* ignore */ }

  return `[YouTube video]\n${oembed}\nDESCRIPTION:\n${desc.slice(0, 4000)}`;
}

async function fetchUrlContext(url: string, firecrawlKey: string): Promise<string> {
  const r = await fetch("https://api.firecrawl.dev/v2/scrape", {
    method: "POST",
    headers: { Authorization: `Bearer ${firecrawlKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({ url, formats: ["markdown"], onlyMainContent: true }),
  });
  const data = await r.json();
  const md: string = data?.data?.markdown || data?.markdown || "";
  const meta = data?.data?.metadata || data?.metadata || {};
  if (!md) throw new Error("Could not read URL content");
  return `TITLE: ${meta.title || ""}\nDESCRIPTION: ${meta.description || ""}\n\nCONTENT:\n${md.slice(0, 12000)}`;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const SERVICE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const FIRECRAWL_API_KEY = Deno.env.get("FIRECRAWL_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const token = getAdminTokenFromRequest(req);
    const ok = await verifyAdminToken(token, SERVICE);
    if (!ok) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const rawUrl: string = (body?.url || "").toString().trim();
    const extra: string = (body?.extraPrompt || "").toString().trim();
    if (!rawUrl) {
      return new Response(JSON.stringify({ error: "url required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const url = /^https?:\/\//i.test(rawUrl) ? rawUrl : `https://${rawUrl}`;

    let context = "";
    let kind: "youtube" | "web" = "web";
    if (isYouTube(url)) {
      kind = "youtube";
      context = await fetchYouTubeContext(url);
    } else {
      if (!FIRECRAWL_API_KEY) throw new Error("FIRECRAWL_API_KEY not configured");
      context = await fetchUrlContext(url, FIRECRAWL_API_KEY);
    }

    const userPrompt = `Source URL: ${url}
Source type: ${kind}

==== SCRAPED SOURCE ====
${context.slice(0, 12000)}
========================

Translate the diagnostic core of this source into ONE original Aetheris LinkedIn post. Do NOT summarize or quote. Apply the Aetheris Lexicon strictly. Name ONE leak category, anchor in a concrete number (COI), close on Revenue Recovery / Revenue Loop.
${extra ? `\nEXTRA DIRECTION: ${extra}` : ""}

Output only the post.`;

    const r = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: POST_SYSTEM_PROMPT },
          { role: "user", content: userPrompt },
        ],
      }),
    });

    if (!r.ok) {
      const t = await r.text();
      console.error("AI gateway error:", r.status, t);
      if (r.status === 429) return new Response(JSON.stringify({ error: "Rate limited" }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      if (r.status === 402) return new Response(JSON.stringify({ error: "AI credits exhausted" }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      throw new Error(`AI gateway error: ${r.status}`);
    }

    const data = await r.json();
    const post = data?.choices?.[0]?.message?.content?.trim() || "";
    if (!post) throw new Error("Empty response from AI");

    return new Response(JSON.stringify({ post, sourceKind: kind, sourceUrl: url }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("linkedin-post-from-url error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
