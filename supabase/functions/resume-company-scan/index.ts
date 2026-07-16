// Public: scrape a company website with Firecrawl and produce a culture brief via Gemini.
// Cached for 7 days per URL.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.86.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

const FC_KEY = Deno.env.get("FIRECRAWL_API_KEY") || "";
const AI_KEY = Deno.env.get("LOVABLE_API_KEY") || "";

function normalizeUrl(input: string): string | null {
  try {
    const t = input.trim();
    const withProto = /^https?:\/\//i.test(t) ? t : `https://${t}`;
    const u = new URL(withProto);
    return `${u.protocol}//${u.hostname.toLowerCase()}`;
  } catch { return null; }
}

async function firecrawlScrape(url: string) {
  const r = await fetch("https://api.firecrawl.dev/v2/scrape", {
    method: "POST",
    headers: { Authorization: `Bearer ${FC_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      url,
      formats: ["markdown"],
      onlyMainContent: true,
    }),
  });
  if (!r.ok) return null;
  const j = await r.json();
  return (j?.data?.markdown ?? j?.markdown) || null;
}

async function firecrawlMap(url: string) {
  const r = await fetch("https://api.firecrawl.dev/v2/map", {
    method: "POST",
    headers: { Authorization: `Bearer ${FC_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({ url, limit: 60 }),
  });
  if (!r.ok) return [];
  const j = await r.json();
  return (j?.links || j?.data?.links || []) as string[];
}

async function buildBrief(companyUrl: string, pages: { url: string; markdown: string }[]) {
  const corpus = pages.map(p => `### ${p.url}\n\n${p.markdown.slice(0, 6000)}`).join("\n\n---\n\n").slice(0, 50000);
  const prompt = `You are an operator analyzing a company's public web presence to build a hiring/culture brief.

Company URL: ${companyUrl}

Source content (markdown extracted from up to 6 pages):
"""
${corpus}
"""

Return ONLY raw JSON with these keys:
{
  "company_name": string,
  "one_liner": string,                // what they do, 1 sentence
  "industry": string,
  "stage": string,                    // e.g. "early startup", "scale-up", "established SMB"
  "size_estimate": string,
  "mission": string,
  "values": string[],                 // 3-7 stated or inferred values
  "culture_signals": string[],        // 4-8 concrete signals (tone, language, perks, work style)
  "hiring_posture": string,           // are they hiring aggressively / quietly / not at all
  "tech_stack_or_specialties": string[],
  "ideal_candidate_traits": string[], // 4-7 traits the company would value
  "watch_outs": string[]              // 2-4 things a candidate should be cautious about
}
Be blunt. No marketing fluff. No markdown, no code fences.`;

  const r = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: { "Lovable-API-Key": AI_KEY, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "google/gemini-2.5-pro",
      messages: [{ role: "user", content: prompt }],
      response_format: { type: "json_object" },
    }),
  });
  if (!r.ok) throw new Error(`AI brief failed ${r.status}: ${(await r.text()).slice(0,200)}`);
  const j = await r.json();
  try { return JSON.parse(j?.choices?.[0]?.message?.content || "{}"); }
  catch { return { raw: j?.choices?.[0]?.message?.content }; }
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    if (!FC_KEY) return new Response(JSON.stringify({ error: "Firecrawl not configured" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    if (!AI_KEY) return new Response(JSON.stringify({ error: "AI not configured" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const { url, force } = await req.json();
    const normalized = normalizeUrl(url || "");
    if (!normalized) return new Response(JSON.stringify({ error: "Invalid URL" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    // cache hit?
    if (!force) {
      const { data: cached } = await supabase
        .from("company_briefs")
        .select("brief, source_pages, expires_at")
        .eq("company_url", normalized)
        .maybeSingle();
      if (cached && new Date(cached.expires_at as string).getTime() > Date.now()) {
        return new Response(JSON.stringify({ brief: cached.brief, source_pages: cached.source_pages, cached: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    // Discover important pages
    const wantedKeywords = ["about", "career", "job", "team", "value", "mission", "culture", "people"];
    const links = await firecrawlMap(normalized);
    const seen = new Set<string>([normalized]);
    const targets: string[] = [normalized];
    for (const l of links) {
      if (targets.length >= 6) break;
      const lower = l.toLowerCase();
      if (!lower.startsWith(normalized.toLowerCase())) continue;
      if (seen.has(lower)) continue;
      if (wantedKeywords.some(k => lower.includes(k))) {
        targets.push(l);
        seen.add(lower);
      }
    }

    // Scrape each (in parallel, capped)
    const results = await Promise.all(targets.map(async (u) => {
      const md = await firecrawlScrape(u);
      return md ? { url: u, markdown: md } : null;
    }));
    const pages = results.filter((p): p is { url: string; markdown: string } => !!p);
    if (pages.length === 0) {
      return new Response(JSON.stringify({ error: "Could not read any pages from this site" }), {
        status: 422, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const brief = await buildBrief(normalized, pages);
    const sourceUrls = pages.map(p => p.url);

    await supabase.from("company_briefs").upsert({
      company_url: normalized,
      brief,
      source_pages: sourceUrls,
      expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    }, { onConflict: "company_url" });

    return new Response(JSON.stringify({ brief, source_pages: sourceUrls, cached: false }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("resume-company-scan error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
