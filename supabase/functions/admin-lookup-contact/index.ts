import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.86.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-admin-token",
};

async function verifyAdminToken(token: string | null, secret: string): Promise<boolean> {
  if (!token) return false;
  const parts = token.split(".");
  if (parts.length !== 2) return false;
  const [expStr, sig] = parts;
  const exp = Number(expStr);
  if (!Number.isFinite(exp) || exp < Date.now()) return false;
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey("raw", enc.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const adminPin = Deno.env.get("ADMIN_PIN");
  if (!adminPin) return false;
  const sigBuf = await crypto.subtle.sign("HMAC", key, enc.encode(`${adminPin}.${exp}`));
  const expected = Array.from(new Uint8Array(sigBuf)).map(b => b.toString(16).padStart(2, "0")).join("");
  if (expected.length !== sig.length) return false;
  let mismatch = 0;
  for (let i = 0; i < expected.length; i++) mismatch |= expected.charCodeAt(i) ^ sig.charCodeAt(i);
  return mismatch === 0;
}

interface Candidate {
  business_name?: string;
  contact_name?: string;
  email?: string;
  phone?: string;
  website?: string;
  industry?: string;
  location?: string;
  title?: string;
  linkedin?: string;
  confidence: number;
  why: string;
  sources: string[];
}

async function firecrawlSearch(query: string, apiKey: string, limit = 8) {
  const res = await fetch("https://api.firecrawl.dev/v2/search", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({ query, limit, scrapeOptions: { formats: ["markdown"] } }),
  });
  if (!res.ok) return [];
  const data = await res.json();
  const items = Array.isArray(data?.data) ? data.data : Array.isArray(data?.data?.web) ? data.data.web : [];
  return items.map((r: any) => ({
    url: r?.url || "",
    title: r?.title || "",
    description: r?.description || "",
    markdown: (r?.markdown || "").substring(0, 3500),
  }));
}

async function aiExtract(searchResults: any[], rawQuery: string, apiKey: string): Promise<Candidate[]> {
  if (!searchResults.length) return [];
  const context = searchResults
    .map((r, i) => `[${i + 1}] ${r.title}\nURL: ${r.url}\n${r.description}\n${r.markdown}`)
    .join("\n\n---\n\n")
    .substring(0, 28000);

  const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash",
      messages: [
        {
          role: "system",
          content: "You are a B2B contact research analyst. Given a raw query (could be a name, email, phone, company, or fragment) and web search results, extract the most likely real-person contact match(es). Be conservative — return only candidates with reasonable evidence in the sources. Never fabricate emails or phones; only include them if they appear in the source text.",
        },
        {
          role: "user",
          content: `Raw query: "${rawQuery}"\n\nFrom these search results, identify up to 3 candidate contacts that match. For each: include contact_name, business_name, email, phone, website, title (job title), linkedin URL, industry, location, confidence (0-100), why (one sentence citing evidence), and sources (array of result URLs that support this match).\n\n${context}`,
        },
      ],
      tools: [{
        type: "function",
        function: {
          name: "return_candidates",
          description: "Return matched contact candidates",
          parameters: {
            type: "object",
            properties: {
              candidates: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    business_name: { type: "string" },
                    contact_name: { type: "string" },
                    email: { type: "string" },
                    phone: { type: "string" },
                    website: { type: "string" },
                    title: { type: "string" },
                    linkedin: { type: "string" },
                    industry: { type: "string" },
                    location: { type: "string" },
                    confidence: { type: "number" },
                    why: { type: "string" },
                    sources: { type: "array", items: { type: "string" } },
                  },
                  required: ["confidence", "why"],
                },
              },
            },
            required: ["candidates"],
          },
        },
      }],
      tool_choice: { type: "function", function: { name: "return_candidates" } },
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
    return Array.isArray(args.candidates) ? args.candidates : [];
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
    const action = String(body.action || "lookup");
    const firecrawlKey = Deno.env.get("FIRECRAWL_API_KEY");
    const lovableKey = Deno.env.get("LOVABLE_API_KEY");

    if (action === "lookup") {
      const query = String(body.query || "").trim();
      if (!query) return new Response(JSON.stringify({ error: "query required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      if (!firecrawlKey || !lovableKey) {
        return new Response(JSON.stringify({ error: "Missing API keys" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      const isEmail = /@/.test(query);
      const isPhone = /^[\d\s()+\-.]{7,}$/.test(query);
      const queries = isEmail
        ? [`"${query}"`, `"${query}" linkedin`, `"${query}" company`]
        : isPhone
        ? [`"${query}"`, `"${query}" business contact`]
        : [`"${query}" contact email`, `"${query}" linkedin`, `"${query}" company`];

      const allResults: any[] = [];
      for (const q of queries) {
        const r = await firecrawlSearch(q, firecrawlKey, 5);
        allResults.push(...r);
        if (allResults.length >= 12) break;
      }
      // dedupe by url
      const seen = new Set<string>();
      const unique = allResults.filter(r => r.url && !seen.has(r.url) && seen.add(r.url));

      const candidates = await aiExtract(unique, query, lovableKey);
      return new Response(JSON.stringify({ ok: true, candidates, searched: unique.length }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (action === "add") {
      const c = body.candidate || {};
      if (!c.business_name && !c.contact_name && !c.email) {
        return new Response(JSON.stringify({ error: "candidate needs at least business_name, contact_name, or email" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      const supabase = createClient(Deno.env.get("SUPABASE_URL")!, serviceKey);
      const row = {
        business_name: (c.business_name || c.contact_name || "Unknown").slice(0, 200),
        contact_name: c.contact_name?.slice(0, 200) || null,
        email: c.email?.toLowerCase().slice(0, 200) || null,
        phone: c.phone?.slice(0, 50) || null,
        website: c.website?.slice(0, 500) || null,
        industry: c.industry?.slice(0, 100) || null,
        location: c.location?.slice(0, 200) || null,
        score: Math.max(0, Math.min(100, Math.round(Number(c.confidence) || 50))),
        why_fit: (c.why || "Manual contact lookup").slice(0, 1000),
        source: "admin_lookup",
        status: "new",
        notes: c.title || c.linkedin ? `${c.title || ""}${c.title && c.linkedin ? " · " : ""}${c.linkedin || ""}`.slice(0, 1000) : null,
      };
      const { data, error } = await supabase.from("rep_leads").insert(row).select("id").single();
      if (error) throw error;
      return new Response(JSON.stringify({ ok: true, id: data.id }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    return new Response(JSON.stringify({ error: "unknown action" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    console.error("admin-lookup-contact error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "error" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
