// Admin lead enrichment: scrapes lead website + AI scores weak points, talking points, refined score.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";
import { verifyAdminToken, getAdminTokenFromRequest } from "../_shared/admin-token.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-admin-token, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SYSTEM = `You are a B2B sales forensics analyst. Given scraped website content for a prospect, return STRICT JSON:
{
  "score": 0-100 (how strong a fit they are for an AI consulting / forensic ops engagement; weight: business size, signs of friction, industry leverage, contact-ability),
  "score_reason": short 1-line justification,
  "weak_points": [3-5 short bullets — observable problems, gaps, friction, missing automation, slow processes, outdated tech],
  "talking_points": [3-5 short bullets — what a sales rep should LEAD with on the first call to grab attention],
  "icebreaker": "1-2 sentence opener the rep can paste into an email or use on a cold call",
  "decision_makers": [{"role":"...", "why":"..."}],
  "industry_refined": "best-fit industry label",
  "estimated_revenue_band": "<$1M | $1-5M | $5-25M | $25M+",
  "confidence": "low|medium|high"
}
Be blunt and specific. No fluff. If the site is empty or low-info, say so in score_reason and lower confidence.`;

async function firecrawl(url: string, key: string): Promise<string> {
  try {
    const r = await fetch("https://api.firecrawl.dev/v2/scrape", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
      body: JSON.stringify({ url, formats: ["markdown"], onlyMainContent: true, timeout: 25000 }),
    });
    const j = await r.json().catch(() => ({}));
    const md = j?.data?.markdown || j?.markdown || "";
    return String(md).slice(0, 15000);
  } catch {
    return "";
  }
}

async function aiAnalyze(payload: Record<string, unknown>, content: string, key: string) {
  const r = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash",
      messages: [
        { role: "system", content: SYSTEM },
        { role: "user", content: `Lead:\n${JSON.stringify(payload)}\n\n--- Website content ---\n${content || "(no content scraped)"}` },
      ],
      response_format: { type: "json_object" },
    }),
  });
  if (!r.ok) throw new Error(`AI ${r.status}: ${await r.text()}`);
  const j = await r.json();
  const txt = j?.choices?.[0]?.message?.content || "{}";
  try { return JSON.parse(txt); } catch { return { raw: txt }; }
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const SERVICE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const ok = await verifyAdminToken(getAdminTokenFromRequest(req), SERVICE);
    if (!ok) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const FIRECRAWL = Deno.env.get("FIRECRAWL_API_KEY") || "";
    const LOVABLE = Deno.env.get("LOVABLE_API_KEY")!;
    if (!LOVABLE) throw new Error("Missing LOVABLE_API_KEY");

    const body = await req.json().catch(() => ({}));
    const ids: string[] = Array.isArray(body.ids) ? body.ids : (body.id ? [body.id] : []);
    if (ids.length === 0) return new Response(JSON.stringify({ error: "Missing id(s)" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const admin = createClient(Deno.env.get("SUPABASE_URL")!, SERVICE);
    const { data: leads, error } = await admin.from("rep_leads")
      .select("id,business_name,website,industry,location,contact_name,email,phone,why_fit")
      .in("id", ids);
    if (error) throw error;

    const results: Array<{ id: string; ok: boolean; error?: string; score?: number }> = [];

    for (const lead of leads || []) {
      try {
        let content = "";
        if (lead.website && FIRECRAWL) {
          const url = lead.website.startsWith("http") ? lead.website : `https://${lead.website}`;
          content = await firecrawl(url, FIRECRAWL);
        }
        const enriched = await aiAnalyze(lead, content, LOVABLE);
        const newScore = Number(enriched?.score);
        const patch: Record<string, unknown> = {
          enrichment: enriched,
          enriched_at: new Date().toISOString(),
        };
        if (Number.isFinite(newScore)) patch.score = Math.max(0, Math.min(100, Math.round(newScore)));
        if (enriched?.industry_refined && !lead.industry) patch.industry = String(enriched.industry_refined).slice(0, 100);

        const { error: uErr } = await admin.from("rep_leads").update(patch).eq("id", lead.id);
        if (uErr) throw uErr;
        results.push({ id: lead.id, ok: true, score: Number.isFinite(newScore) ? newScore : undefined });
      } catch (e) {
        results.push({ id: lead.id, ok: false, error: e instanceof Error ? e.message : String(e) });
      }
    }

    return new Response(JSON.stringify({ ok: true, results }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    console.error("admin-enrich-lead error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Server error" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
