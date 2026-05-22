// Scheduled wrapper that runs the Indianapolis lead scrape across multiple industries.
// Called by pg_cron daily — no admin token required (service-role context).
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.86.0";
import { loadBlockedKeywords, isLeadBlocked } from "../_shared/lead-blocklist.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const INDUSTRIES = [
  "professional services",
  "manufacturing",
  "healthcare clinics",
  "construction contractors",
  "B2B SaaS",
];

interface ScoredLead {
  business_name: string;
  contact_name?: string;
  email?: string;
  phone?: string;
  website?: string;
  industry?: string;
  location?: string;
  score: number;
  why_fit: string;
}

async function firecrawlSearch(query: string, apiKey: string, limit = 12) {
  const res = await fetch("https://api.firecrawl.dev/v2/search", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({ query, limit, scrapeOptions: { formats: ["markdown"] } }),
  });
  const data = await res.json();
  const items = Array.isArray(data?.data) ? data.data : Array.isArray(data?.data?.web) ? data.data.web : [];
  return items.map((r: any) => ({
    url: r?.url || "", title: r?.title || "",
    description: r?.description || "",
    markdown: (r?.markdown || "").substring(0, 3000),
  }));
}

async function aiScoreLeads(searchResults: any[], industry: string, count: number, apiKey: string): Promise<ScoredLead[]> {
  const context = searchResults.map((r, i) => `[${i + 1}] ${r.title}\nURL: ${r.url}\n${r.description}\n${r.markdown}`).join("\n\n---\n\n").substring(0, 25000);
  const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash",
      messages: [
        { role: "system", content: `You are a B2B prospecting analyst for Aetheris Technology — Business Forensics. ICP: SMBs in Indianapolis metro, $1M–$50M revenue, 10–500 employees. Score 0-100 by ICP fit.` },
        { role: "user", content: `From these results extract up to ${count} REAL Indianapolis-area businesses in ${industry}. Skip directories and listicles. Return: business_name, website, industry, location, score, why_fit.\n\n${context}` },
      ],
      tools: [{
        type: "function",
        function: {
          name: "return_leads",
          parameters: {
            type: "object",
            properties: {
              leads: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    business_name: { type: "string" }, website: { type: "string" }, industry: { type: "string" },
                    location: { type: "string" }, contact_name: { type: "string" }, email: { type: "string" },
                    phone: { type: "string" }, score: { type: "number" }, why_fit: { type: "string" },
                  },
                  required: ["business_name", "score", "why_fit"],
                },
              },
            },
            required: ["leads"],
          },
        },
      }],
      tool_choice: { type: "function", function: { name: "return_leads" } },
    }),
  });
  if (!res.ok) { console.error("AI gateway error:", res.status); return []; }
  const data = await res.json();
  const call = data?.choices?.[0]?.message?.tool_calls?.[0];
  if (!call) return [];
  try { const args = JSON.parse(call.function.arguments); return Array.isArray(args.leads) ? args.leads : []; }
  catch { return []; }
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, serviceKey);

    const { data: settings } = await supabase.from("lead_drip_settings").select("*").maybeSingle();
    if (!settings || !settings.scraper_enabled) {
      return new Response(JSON.stringify({ ok: true, skipped: "scraper disabled" }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const targetPerIndustry = Math.max(5, Math.min(20, Math.floor((settings.scraper_target_per_run || 50) / INDUSTRIES.length)));

    const firecrawlKey = Deno.env.get("FIRECRAWL_API_KEY");
    const lovableKey = Deno.env.get("LOVABLE_API_KEY");
    if (!firecrawlKey || !lovableKey) {
      return new Response(JSON.stringify({ error: "Missing API keys" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    let totalInserted = 0;
    const breakdown: Record<string, number> = {};

    for (const industry of INDUSTRIES) {
      try {
        const results = await firecrawlSearch(`${industry} companies Indianapolis Indiana`, firecrawlKey, 12);
        if (!results.length) { breakdown[industry] = 0; continue; }
        const leads = await aiScoreLeads(results, industry, targetPerIndustry, lovableKey);
        if (!leads.length) { breakdown[industry] = 0; continue; }

        const rows = leads.map(l => ({
          business_name: l.business_name?.slice(0, 200) || null,
          contact_name: l.contact_name?.slice(0, 200) || null,
          email: l.email?.toLowerCase().slice(0, 200) || null,
          phone: l.phone?.slice(0, 50) || null,
          website: l.website?.slice(0, 500) || null,
          industry: l.industry?.slice(0, 100) || industry,
          location: l.location?.slice(0, 200) || "Indianapolis, IN",
          score: Math.max(0, Math.min(100, Math.round(l.score || 0))),
          why_fit: l.why_fit?.slice(0, 1000) || null,
          source: "firecrawl_indianapolis_cron",
          external_id: l.website ? `scraped:${l.website.toLowerCase().replace(/^https?:\/\//, '').replace(/\/$/, '')}` : null,
          status: "new",
        })).filter(r => r.business_name);

        const { data, error } = await supabase.from("rep_leads")
          .upsert(rows, { onConflict: "external_id", ignoreDuplicates: true })
          .select("id");
        if (error) console.error("insert err for", industry, error);
        const ins = data?.length || 0;
        breakdown[industry] = ins;
        totalInserted += ins;
      } catch (e) {
        console.error("industry failed:", industry, e);
        breakdown[industry] = 0;
      }
    }

    return new Response(JSON.stringify({ ok: true, inserted: totalInserted, breakdown }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    console.error("admin-scrape-leads-cron error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Server error" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
