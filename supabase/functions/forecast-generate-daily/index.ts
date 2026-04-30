// Generate today's Forecast Center briefing.
// Triggered by daily cron OR by portal-forecast when cache is stale.
// Auth: either service-role authorization header (cron) OR x-forecast-secret matching SUPABASE_SERVICE_ROLE_KEY.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-forecast-secret",
};

const FIRECRAWL_QUERIES = [
  "Indianapolis Indiana SMB hiring expansion announcement last week",
  "Indianapolis small business funding raise acquisition this week",
  "AI tools small business CRM automation trend this week",
  "HubSpot Salesforce Pipedrive update release notes this week",
  "Indianapolis roofing HVAC dental medspa law firm growth news",
];

async function firecrawlSearch(apiKey: string, query: string) {
  const r = await fetch("https://api.firecrawl.dev/v2/search", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({ query, limit: 6, tbs: "qdr:w" }),
  });
  if (!r.ok) {
    console.warn("firecrawl search failed", query, r.status);
    return [];
  }
  const j = await r.json();
  // v2 returns { web: [...] } or { data: [...] }
  const arr = (j?.web || j?.data || []) as Array<{ url?: string; title?: string; description?: string }>;
  return arr.map((x) => ({ url: x.url || "", title: x.title || "", snippet: x.description || "" })).filter(x => x.url);
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const FIRECRAWL_API_KEY = Deno.env.get("FIRECRAWL_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    // Internal-only: allow cron (Bearer service key) or service-secret header.
    const auth = req.headers.get("authorization") || "";
    const secret = req.headers.get("x-forecast-secret") || "";
    if (!auth.includes(SERVICE) && secret !== SERVICE) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const admin = createClient(SUPABASE_URL, SERVICE);
    const today = new Date().toISOString().slice(0, 10);

    // Skip if today's briefing already exists and not forced.
    const force = new URL(req.url).searchParams.get("force") === "true";
    if (!force) {
      const { data: existing } = await admin.from("forecast_briefings").select("briefing_date").eq("briefing_date", today).maybeSingle();
      if (existing) {
        return new Response(JSON.stringify({ ok: true, cached: true, date: today }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    // Gather web signals (best-effort; tolerate failures)
    let signals: Array<{ url: string; title: string; snippet: string }> = [];
    if (FIRECRAWL_API_KEY) {
      const results = await Promise.allSettled(FIRECRAWL_QUERIES.map((q) => firecrawlSearch(FIRECRAWL_API_KEY, q)));
      for (const r of results) if (r.status === "fulfilled") signals.push(...r.value);
      // Dedupe by URL, cap at 30
      const seen = new Set<string>();
      signals = signals.filter((s) => (seen.has(s.url) ? false : (seen.add(s.url), true))).slice(0, 30);
    }

    const signalText = signals.length
      ? signals.map((s, i) => `[${i + 1}] ${s.title}\n${s.snippet}\nURL: ${s.url}`).join("\n\n")
      : "(No live web signals available — rely on general knowledge of recent trends.)";

    const systemPrompt = `You are the Aetheris Forecast Operator — a business forensics analyst for an Indianapolis, Indiana consulting firm that sells the Leak Audit (a forensic CRM/operations diagnostic) to SMBs ($1M-$50M revenue).
Your job: every morning, brief the operator team on what changed in the last 7 days and who to hunt today.
Tone: blunt, forensic, operator-grade. No corporate fluff. No emojis.
Every claim must reference a real source URL when possible. Companies must be REAL Indianapolis-area SMBs (Indiana). Never invent companies.`;

    const userPrompt = `Today's date: ${today}.

WEB SIGNALS (last 7 days):
${signalText}

Produce today's intel briefing using the report_briefing tool. Be specific, cite source_url for each company and trend.`;

    const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-pro",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        tools: [{
          type: "function",
          function: {
            name: "report_briefing",
            description: "Return today's forecast briefing as structured JSON.",
            parameters: {
              type: "object",
              properties: {
                tip: {
                  type: "object",
                  properties: {
                    headline: { type: "string", description: "One short operator tip headline (max ~12 words)." },
                    body: { type: "string", description: "1-3 sentences. Concrete, actionable for reps today." },
                    tag: { type: "string", description: "Short label like 'Pitch Pivot', 'Tool Tip', 'Closer Move'." },
                  },
                  required: ["headline", "body", "tag"],
                  additionalProperties: false,
                },
                tech: {
                  type: "array",
                  description: "3-4 tech/AI/CRM trends moving this week.",
                  items: {
                    type: "object",
                    properties: {
                      title: { type: "string" },
                      why: { type: "string", description: "Why it matters for an Aetheris operator selling Leak Audits." },
                      source_url: { type: "string" },
                    },
                    required: ["title", "why"],
                    additionalProperties: false,
                  },
                },
                industry: {
                  type: "array",
                  description: "3-4 industry shifts in Indianapolis SMB verticals worth pitching against.",
                  items: {
                    type: "object",
                    properties: {
                      vertical: { type: "string", description: "e.g. Roofing, HVAC, Dental, Med Spa, Law, SaaS." },
                      shift: { type: "string", description: "What changed / what's trending." },
                      why: { type: "string", description: "The leak hypothesis or dollar/risk angle." },
                      source_url: { type: "string" },
                    },
                    required: ["vertical", "shift", "why"],
                    additionalProperties: false,
                  },
                },
                companies: {
                  type: "array",
                  description: "5-8 REAL Indianapolis-area SMBs ($1M-$50M est.) worth hunting today. Never invent.",
                  items: {
                    type: "object",
                    properties: {
                      name: { type: "string" },
                      website: { type: "string", description: "Best-known domain or homepage URL." },
                      industry: { type: "string" },
                      location: { type: "string", description: "City, state (Indiana)." },
                      signal: { type: "string", description: "The factual recent signal (hiring, expansion, raise, new location, leadership change)." },
                      why: { type: "string", description: "Why an Aetheris operator should hunt them — leak hypothesis." },
                      source_url: { type: "string" },
                    },
                    required: ["name", "website", "industry", "signal", "why"],
                    additionalProperties: false,
                  },
                },
              },
              required: ["tip", "tech", "industry", "companies"],
              additionalProperties: false,
            },
          },
        }],
        tool_choice: { type: "function", function: { name: "report_briefing" } },
      }),
    });

    if (!aiRes.ok) {
      const t = await aiRes.text();
      console.error("AI gateway error", aiRes.status, t);
      if (aiRes.status === 429 || aiRes.status === 402) {
        return new Response(JSON.stringify({ error: aiRes.status === 429 ? "Rate limited" : "AI credits exhausted" }), {
          status: aiRes.status, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      throw new Error(`AI gateway ${aiRes.status}`);
    }

    const aiData = await aiRes.json();
    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) throw new Error("No tool call in AI response");
    const briefing = JSON.parse(toolCall.function.arguments);

    const { error: upErr } = await admin.from("forecast_briefings").upsert({
      briefing_date: today,
      tip: briefing.tip || {},
      tech: briefing.tech || [],
      industry: briefing.industry || [],
      companies: briefing.companies || [],
      sources: signals,
      model: "google/gemini-2.5-pro",
      generated_at: new Date().toISOString(),
    }, { onConflict: "briefing_date" });
    if (upErr) throw upErr;

    return new Response(JSON.stringify({ ok: true, date: today, signal_count: signals.length, company_count: briefing.companies?.length || 0 }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("forecast-generate-daily error", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : String(e) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
