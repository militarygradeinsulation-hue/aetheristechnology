// Rep-portal-facing AI lead scraper. Auth via x-portal-token. Scraped leads
// are inserted into rep_leads with the rep's code pre-assigned (drip-style)
// so they show up in the rep's "Today's Drop" / "My Leads" workflow.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.86.0";
import { verifyPortalToken, getPortalTokenFromRequest } from "../_shared/portal-token.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-portal-token",
};

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

async function firecrawlSearch(query: string, apiKey: string, limit = 15) {
  const res = await fetch("https://api.firecrawl.dev/v2/search", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({ query, limit, scrapeOptions: { formats: ["markdown"] } }),
  });
  const data = await res.json();
  const items = Array.isArray(data?.data) ? data.data : Array.isArray(data?.data?.web) ? data.data.web : [];
  return items.map((r: any) => ({
    url: r?.url || "",
    title: r?.title || "",
    description: r?.description || "",
    markdown: (r?.markdown || "").substring(0, 4000),
  }));
}

async function aiScoreLeads(searchResults: any[], industry: string, location: string, count: number, apiKey: string): Promise<ScoredLead[]> {
  const context = searchResults
    .map((r, i) => `[${i + 1}] ${r.title}\nURL: ${r.url}\n${r.description}\n${r.markdown}`)
    .join("\n\n---\n\n")
    .substring(0, 30000);

  const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash",
      messages: [
        {
          role: "system",
          content: `You are a B2B prospecting analyst for Aetheris Technology — a Business Forensics firm that runs "Leak Audits" on companies to find hidden revenue leaks. ICP: small-to-mid-market businesses (10–500 employees), revenue $1M–$50M, especially HubSpot/Salesforce users, agencies, professional services, SaaS, e-commerce, and B2B in Indianapolis / Indiana / Midwest. We DON'T sell to: enterprises, freelancers, very small (<10 employees), or non-business entities. Score 0-100 based on ICP fit.`,
        },
        {
          role: "user",
          content: `From these search results, extract up to ${count} REAL businesses that fit. Industry filter: "${industry || "any"}". Location: "${location}".

CRITICAL: For every lead you MUST identify the company's official website URL (their primary domain — e.g. "acmeco.com", not a LinkedIn/Facebook/directory page). If the search result is a profile (LinkedIn, ZoomInfo, Yelp, BBB, etc.), infer the company they work at and return that company's real homepage URL. Never leave website blank — if you truly cannot determine it, skip the lead entirely. Prefer https:// root domains over deep links.

For each lead return: business_name, website (REQUIRED), industry, location, contact_name (if visible), email (if visible), phone (if visible), score (0-100), why_fit (one sentence). Skip directories, listicles, and irrelevant results. Use the return_leads function.\n\n${context}`,
        },
      ],
      tools: [{
        type: "function",
        function: {
          name: "return_leads",
          description: "Return scored prospect leads",
          parameters: {
            type: "object",
            properties: {
              leads: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    business_name: { type: "string" },
                    website: { type: "string" },
                    industry: { type: "string" },
                    location: { type: "string" },
                    contact_name: { type: "string" },
                    email: { type: "string" },
                    phone: { type: "string" },
                    score: { type: "number" },
                    why_fit: { type: "string" },
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

  if (!res.ok) {
    console.error("AI gateway error:", res.status, await res.text());
    return [];
  }

  const data = await res.json();
  const call = data?.choices?.[0]?.message?.tool_calls?.[0];
  if (!call) return [];
  try {
    const args = JSON.parse(call.function.arguments);
    return Array.isArray(args.leads) ? args.leads : [];
  } catch {
    return [];
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const claims = await verifyPortalToken(getPortalTokenFromRequest(req), serviceKey);
    if (!claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const body = await req.json().catch(() => ({}));
    const industry = String(body.industry || "").trim().slice(0, 100);
    const location = String(body.location || "Indianapolis, Indiana").trim().slice(0, 200);
    const count = Math.min(Math.max(Number(body.count) || 10, 3), 25);
    // assign_to_me=true (default) drops them into rep's drip; false = shared pool
    const assignToMe = body.assign_to_me !== false;

    const firecrawlKey = Deno.env.get("FIRECRAWL_API_KEY");
    const lovableKey = Deno.env.get("LOVABLE_API_KEY");
    if (!firecrawlKey || !lovableKey) {
      return new Response(JSON.stringify({ error: "Scraper not configured (missing API keys)" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const query = industry
      ? `${industry} companies in ${location}`
      : `small to mid-market businesses ${location} HubSpot Salesforce`;
    const results = await firecrawlSearch(query, firecrawlKey, 15);
    if (results.length === 0) {
      return new Response(JSON.stringify({ ok: true, inserted: 0, leads: [], note: "No search results" }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const leads = await aiScoreLeads(results, industry, location, count, lovableKey);

    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, serviceKey);
    let inserted = 0;
    if (leads.length > 0) {
      const now = new Date();
      const expires = new Date(now.getTime() + 24 * 60 * 60 * 1000);
      const rows = leads.map((l) => ({
        business_name: l.business_name?.slice(0, 200) || null,
        contact_name: l.contact_name?.slice(0, 200) || null,
        email: l.email?.toLowerCase().slice(0, 200) || null,
        phone: l.phone?.slice(0, 50) || null,
        website: l.website?.slice(0, 500) || null,
        industry: l.industry?.slice(0, 100) || industry || null,
        location: l.location?.slice(0, 200) || location,
        score: Math.max(0, Math.min(100, Math.round(l.score || 0))),
        why_fit: l.why_fit?.slice(0, 1000) || null,
        source: `rep_scrape:${claims.code}`,
        external_id: l.website ? `scraped:${l.website.toLowerCase().replace(/^https?:\/\//, '').replace(/\/$/, '')}` : null,
        status: "new",
        ...(assignToMe ? {
          assigned_to_code: claims.code,
          assigned_at: now.toISOString(),
          assignment_expires_at: expires.toISOString(),
        } : {}),
      })).filter((r) => r.business_name);

      const { data, error } = await supabase.from("rep_leads")
        .upsert(rows, { onConflict: "external_id", ignoreDuplicates: true })
        .select("id");
      if (error) throw error;
      inserted = data?.length || 0;

      try {
        const { data: rep } = await supabase.from("rep_codes").select("rep_name").eq("code", claims.code).maybeSingle();
        await supabase.from("rep_activity").insert({
          rep_code: claims.code,
          rep_name: rep?.rep_name || null,
          event: "scrape_leads",
          meta: { industry, location, count, inserted, assigned_to_me: assignToMe },
        });
      } catch (e) { console.error("activity log failed:", e); }
    }

    return new Response(JSON.stringify({ ok: true, inserted, leads, assigned_to_me: assignToMe }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    console.error("portal-scrape-leads error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Server error" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
