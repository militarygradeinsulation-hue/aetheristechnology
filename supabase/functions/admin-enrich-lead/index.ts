// Admin lead enrichment: scrapes lead website + AI scores weak points, talking points, refined score.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";
import { verifyAdminToken, getAdminTokenFromRequest } from "../_shared/admin-token.ts";
import { computeWebsiteScore } from "../_shared/lead-scoring.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-admin-token, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SYSTEM = `You are a B2B sales forensics analyst. CURRENCY RULE (NON-NEGOTIABLE): every monetary figure, estimate, ROI, leak, deal size, fee, or cost must be in US Dollars (USD), formatted like $1,200 or $1.4M. Never use €, £, ¥, EUR, GBP, CAD, AUD, or any other currency. Given scraped website content for a prospect, return STRICT JSON:
{
  "score": 0-100 (how strong a fit they are for an AI consulting / forensic ops engagement; weight: business size, signs of friction, industry leverage, contact-ability),
  "score_reason": short 1-line justification,
  "weak_points": [3-5 short bullets — observable problems, gaps, friction, missing automation, slow processes, outdated tech],
  "talking_points": [3-5 short bullets — what a sales rep should LEAD with on the first call to grab attention],
  "icebreaker": "1-2 sentence opener the rep can paste into an email or use on a cold call",
  "decision_makers": [{"role":"...", "why":"..."}],
  "industry_refined": "best-fit industry label",
  "estimated_revenue_band": "<$1M | $1-5M | $5-25M | $25M+",
  "confidence": "low|medium|high",
  "outreach": {
    "recommended_channel": "call | email | linkedin | text",
    "channel_confidence": "low|medium|high",
    "why_this_channel": "2-3 sentences grounded in OBSERVABLE evidence from the site — tone, formality, industry norms, contact availability, company size, decision-maker persona. Cite specifics you saw.",
    "secondary_channel": "call | email | linkedin | text",
    "best_time_to_reach": "e.g. 'Tue-Thu 7-9am local — trades start early' or 'After 2pm Mon-Wed — professional services post-lunch'",
    "persona_read": "1-2 sentences on the likely personality / decision style of the owner or buyer (analytical, relational, fast-mover, skeptical, gatekept, etc.) based on the site's voice, design, and content",
    "tone_to_use": "e.g. 'blunt + numbers-first', 'warm + consultative', 'technical + peer-to-peer'",
    "do_not_do": ["1-3 short anti-patterns specific to this prospect"],
    "first_touch_script": "3-5 sentence opener tailored to the chosen channel (call: voicemail-safe; email: subject line + 2-line body; linkedin: connection note under 300 chars)"
  }
}
Be blunt and specific. No fluff. The outreach recommendation MUST be evidence-based — reference what you actually saw (e.g. 'no email listed, only phone CTA → call', 'long-form thought-leadership + active LinkedIn → warm LinkedIn DM', 'enterprise site with gated demo → email ops lead, never cold call', 'family-owned trades shop → call early morning, owner answers'). If the site is low-info, say so in score_reason, lower confidence, and recommend the safest default channel for that industry.`;

async function firecrawl(url: string, key: string): Promise<{ md: string; err?: string }> {
  try {
    const r = await fetch("https://api.firecrawl.dev/v2/scrape", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
      body: JSON.stringify({ url, formats: ["markdown"], onlyMainContent: true, timeout: 25000 }),
    });
    const j = await r.json().catch(() => ({}));
    const md = j?.data?.markdown || j?.markdown || "";
    if (!r.ok) return { md: "", err: `firecrawl ${r.status}: ${(j?.error || "").toString().slice(0, 200)}` };
    return { md: String(md).slice(0, 15000) };
  } catch (e) {
    return { md: "", err: `firecrawl exception: ${e instanceof Error ? e.message : String(e)}` };
  }
}

async function firecrawlSearch(query: string, key: string): Promise<{ md: string; url?: string; err?: string }> {
  try {
    const r = await fetch("https://api.firecrawl.dev/v2/search", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
      body: JSON.stringify({ query, limit: 3, scrapeOptions: { formats: ["markdown"], onlyMainContent: true } }),
    });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) return { md: "", err: `firecrawl search ${r.status}` };
    const results = j?.data?.web || j?.data || [];
    const arr = Array.isArray(results) ? results : [];
    const top = arr[0] || {};
    const md = top?.markdown || top?.description || "";
    return { md: String(md).slice(0, 15000), url: top?.url };
  } catch (e) {
    return { md: "", err: `firecrawl search exception: ${e instanceof Error ? e.message : String(e)}` };
  }
}

function deriveUrlFromEmail(email?: string | null): string | null {
  if (!email) return null;
  const m = String(email).match(/@([^\s>]+)/);
  if (!m) return null;
  const domain = m[1].toLowerCase();
  // skip free mail providers
  if (/^(gmail|yahoo|hotmail|outlook|aol|icloud|live|msn|comcast|protonmail|me)\./.test(domain + ".")) return null;
  if (["gmail.com","yahoo.com","hotmail.com","outlook.com","aol.com","icloud.com","live.com","msn.com","comcast.net","protonmail.com","me.com"].includes(domain)) return null;
  return `https://${domain}`;
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
        let scrapedUrl: string | null = null;
        const scrapeNotes: string[] = [];

        // 1) Try direct website if present
        const candidates: string[] = [];
        if (lead.website) {
          const url = lead.website.startsWith("http") ? lead.website : `https://${lead.website}`;
          candidates.push(url);
        }
        // 2) Derive from email domain
        const fromEmail = deriveUrlFromEmail(lead.email);
        if (fromEmail && !candidates.includes(fromEmail)) candidates.push(fromEmail);

        if (FIRECRAWL) {
          for (const url of candidates) {
            const r = await firecrawl(url, FIRECRAWL);
            if (r.md && r.md.length > 200) { content = r.md; scrapedUrl = url; break; }
            if (r.err) scrapeNotes.push(`${url} → ${r.err}`);
          }
          // 3) Fallback: search the business name
          if (!content && lead.business_name) {
            const q = [lead.business_name, lead.location, lead.industry].filter(Boolean).join(" ");
            const s = await firecrawlSearch(q, FIRECRAWL);
            if (s.md) { content = s.md; scrapedUrl = s.url || null; scrapeNotes.push(`fallback: search '${q}' → ${s.url || "no url"}`); }
            else if (s.err) scrapeNotes.push(`search err: ${s.err}`);
          }
        } else {
          scrapeNotes.push("FIRECRAWL_API_KEY not configured");
        }

        const enriched = await aiAnalyze(lead, content, LOVABLE);
        if (typeof enriched === "object" && enriched) {
          (enriched as Record<string, unknown>).scrape_source_url = scrapedUrl;
          (enriched as Record<string, unknown>).scrape_notes = scrapeNotes;
          (enriched as Record<string, unknown>).scraped_chars = content.length;
        }
        const newScore = Number((enriched as Record<string, unknown>)?.score);
        const patch: Record<string, unknown> = {
          enrichment: enriched,
          enriched_at: new Date().toISOString(),
        };
        if (Number.isFinite(newScore)) patch.score = Math.max(0, Math.min(100, Math.round(newScore)));
        const indRefined = (enriched as Record<string, unknown>)?.industry_refined;
        if (indRefined && !lead.industry) patch.industry = String(indRefined).slice(0, 100);
        if (scrapedUrl && !lead.website) patch.website = scrapedUrl;

        const { error: uErr } = await admin.from("rep_leads").update(patch).eq("id", lead.id);
        if (uErr) throw uErr;
        results.push({ id: lead.id, ok: true, score: Number.isFinite(newScore) ? newScore : undefined });
      } catch (e) {
        console.error("enrich error for", lead.id, e);
        results.push({ id: lead.id, ok: false, error: e instanceof Error ? e.message : String(e) });
      }
    }

    return new Response(JSON.stringify({ ok: true, results }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    console.error("admin-enrich-lead error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Server error" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
