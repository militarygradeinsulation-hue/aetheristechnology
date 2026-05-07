import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.86.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-admin-token",
};

// Verify admin token (HMAC, same shape as adminAuth: "<expEpochMs>.<hmacHex>")
async function verifyAdminToken(token: string | null, secret: string): Promise<boolean> {
  if (!token) return false;
  const parts = token.split(".");
  if (parts.length !== 2) return false;
  const [expStr, sig] = parts;
  const exp = Number(expStr);
  if (!Number.isFinite(exp) || exp < Date.now()) return false;
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey("raw", enc.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sigBuf = await crypto.subtle.sign("HMAC", key, enc.encode(`${Deno.env.get("ADMIN_PIN") ?? "9822"}.${exp}`));
  const expected = Array.from(new Uint8Array(sigBuf)).map(b => b.toString(16).padStart(2, "0")).join("");
  if (expected.length !== sig.length) return false;
  let mismatch = 0;
  for (let i = 0; i < expected.length; i++) mismatch |= expected.charCodeAt(i) ^ sig.charCodeAt(i);
  return mismatch === 0;
}

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
                  required: ["business_name", "website", "score", "why_fit"],
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
    const adminToken = req.headers.get("x-admin-token");
    if (!await verifyAdminToken(adminToken, serviceKey)) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const body = await req.json().catch(() => ({}));
    const industry = String(body.industry || "").trim();
    const location = String(body.location || "Indianapolis, Indiana").trim();
    const count = Math.min(Math.max(Number(body.count) || 15, 5), 50);

    const firecrawlKey = Deno.env.get("FIRECRAWL_API_KEY");
    const lovableKey = Deno.env.get("LOVABLE_API_KEY");
    if (!firecrawlKey || !lovableKey) {
      return new Response(JSON.stringify({ error: "Missing API keys" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
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
        source: "firecrawl_indianapolis",
        external_id: l.website ? `scraped:${l.website.toLowerCase().replace(/^https?:\/\//, '').replace(/\/$/, '')}` : null,
        status: "new",
      })).filter((r) => r.business_name && r.website);

      const { data, error } = await supabase.from("rep_leads")
        .upsert(rows, { onConflict: "external_id", ignoreDuplicates: true })
        .select("id");
      if (error) throw error;
      inserted = data?.length || 0;
    }

    return new Response(JSON.stringify({ ok: true, inserted, leads }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    console.error("admin-scrape-leads error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Server error" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
