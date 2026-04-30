// Generate today's Forecast Center briefing.
// Triggered by daily cron OR by portal-forecast when cache is stale.
// Auth: either service-role authorization header (cron) OR x-forecast-secret matching SUPABASE_SERVICE_ROLE_KEY.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-forecast-secret",
};

interface TopicQuery { id: string; label: string; query: string; enabled: boolean }
interface EducationItem { kind: string; id: string; title: string; enabled: boolean }
interface ForecastSettings {
  is_active: boolean;
  refresh_cadence_minutes: number;
  web_window: string;
  topic_queries: TopicQuery[];
  sources: { aetheris_blog?: boolean; aetheris_playbooks?: boolean; web?: boolean };
  education_pool: EducationItem[];
}

const FALLBACK_QUERIES = [
  "Indianapolis Indiana SMB hiring expansion announcement last week",
  "AI tools small business CRM automation trend this week",
  "Indianapolis roofing HVAC dental medspa law firm growth news",
];

async function firecrawlSearch(apiKey: string, query: string, tbs: string) {
  const r = await fetch("https://api.firecrawl.dev/v2/search", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({ query, limit: 6, tbs: `qdr:${tbs}` }),
  });
  if (!r.ok) {
    console.warn("firecrawl search failed", query, r.status);
    return [];
  }
  const j = await r.json();
  const arr = (j?.web || j?.data || []) as Array<{ url?: string; title?: string; description?: string }>;
  return arr
    .map((x) => ({ url: x.url || "", title: x.title || "", snippet: x.description || "" }))
    .filter((x) => x.url);
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const FIRECRAWL_API_KEY = Deno.env.get("FIRECRAWL_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const auth = req.headers.get("authorization") || "";
    const secret = req.headers.get("x-forecast-secret") || "";
    if (!auth.includes(SERVICE) && secret !== SERVICE) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const admin = createClient(SUPABASE_URL, SERVICE);
    const today = new Date().toISOString().slice(0, 10);
    const force = new URL(req.url).searchParams.get("force") === "true";

    // Load settings (or use defaults)
    const { data: settingsRow } = await admin
      .from("forecast_settings").select("*").eq("id", "default").maybeSingle();
    const settings: ForecastSettings = settingsRow || {
      is_active: true, refresh_cadence_minutes: 1440, web_window: "w",
      topic_queries: [], sources: { aetheris_blog: true, aetheris_playbooks: true, web: true },
      education_pool: [],
    };

    if (!settings.is_active && !force) {
      return new Response(JSON.stringify({ ok: true, skipped: "inactive" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Throttle by cadence (last run age) unless forced
    if (!force) {
      const { data: latest } = await admin
        .from("forecast_briefings")
        .select("generated_at,briefing_date")
        .order("generated_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (latest) {
        const ageMin = (Date.now() - new Date(latest.generated_at).getTime()) / 60000;
        if (ageMin < settings.refresh_cadence_minutes && latest.briefing_date === today) {
          return new Response(JSON.stringify({ ok: true, cached: true, age_minutes: Math.round(ageMin) }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
      }
    }

    // Build query list from settings
    const queries = (settings.topic_queries || [])
      .filter((q) => q.enabled && q.query)
      .map((q) => q.query);
    const finalQueries = queries.length ? queries : FALLBACK_QUERIES;

    // Web signals
    let signals: Array<{ url: string; title: string; snippet: string }> = [];
    if (settings.sources?.web !== false && FIRECRAWL_API_KEY) {
      const results = await Promise.allSettled(
        finalQueries.slice(0, 8).map((q) => firecrawlSearch(FIRECRAWL_API_KEY, q, settings.web_window || "w"))
      );
      for (const r of results) if (r.status === "fulfilled") signals.push(...r.value);
      const seen = new Set<string>();
      signals = signals.filter((s) => (seen.has(s.url) ? false : (seen.add(s.url), true))).slice(0, 30);
    }

    // Aetheris content (blog + playbooks) for the Education layer
    const educationCandidates: Array<{ kind: string; id: string; title: string; url: string; excerpt?: string }> = [];
    const enabledEduIds = new Set((settings.education_pool || []).filter((e) => e.enabled).map((e) => `${e.kind}:${e.id}`));

    if (settings.sources?.aetheris_blog !== false) {
      const since = new Date(Date.now() - 30 * 86400000).toISOString();
      const { data: blogs } = await admin.from("blog_posts")
        .select("id,title,slug,excerpt,published_at")
        .eq("is_published", true)
        .gte("published_at", since)
        .order("published_at", { ascending: false })
        .limit(20);
      for (const b of blogs || []) {
        const key = `blog:${b.id}`;
        if (enabledEduIds.size === 0 || enabledEduIds.has(key)) {
          educationCandidates.push({
            kind: "blog", id: String(b.id), title: b.title || b.slug || "Untitled",
            url: `https://aetheris.technology/blog/${b.slug}`,
            excerpt: b.excerpt || undefined,
          });
        }
      }
    }
    if (settings.sources?.aetheris_playbooks !== false) {
      const { data: pbs } = await admin.from("playbooks")
        .select("id,title,subtitle,description,file_url,published_at")
        .order("published_at", { ascending: false })
        .limit(20);
      for (const p of pbs || []) {
        const key = `playbook:${p.id}`;
        if (enabledEduIds.size === 0 || enabledEduIds.has(key)) {
          educationCandidates.push({
            kind: "playbook", id: String(p.id), title: p.title || "Untitled",
            url: p.file_url || "https://aetheris.technology/resources",
            excerpt: p.subtitle || p.description || undefined,
          });
        }
      }
    }

    const signalText = signals.length
      ? signals.map((s, i) => `[${i + 1}] ${s.title}\n${s.snippet}\nURL: ${s.url}`).join("\n\n")
      : "(No live web signals available — rely on general knowledge of recent trends.)";

    const eduText = educationCandidates.length
      ? educationCandidates.map((e, i) => `[E${i + 1}] (${e.kind}) ${e.title}\n${e.excerpt || ""}\nURL: ${e.url}`).join("\n\n")
      : "(No Aetheris content available.)";

    const systemPrompt = `You are the Aetheris Forecast Operator — a business forensics analyst for an Indianapolis, Indiana consulting firm that sells the Leak Audit (a forensic CRM/operations diagnostic) to SMBs ($1M-$50M revenue).
Your job: every morning, brief the operator team on what changed in the last 7 days, who to hunt today, and what to learn.
Tone: blunt, forensic, operator-grade. No corporate fluff. No emojis.
Every claim must reference a real source URL when possible. Companies must be REAL Indianapolis-area SMBs (Indiana). Never invent companies.
For Education items, ONLY recommend titles from the EDUCATION POOL provided — never invent titles or URLs. Each pick must include a 1-sentence "why_today" tying it to current signals.`;

    const userPrompt = `Today's date: ${today}.

WEB SIGNALS (last ${settings.web_window || "w"}):
${signalText}

EDUCATION POOL (Aetheris's own content — pick 2-4 to recommend today):
${eduText}

Produce today's intel briefing using the report_briefing tool.
Live Pulse: pick 3-5 of the freshest, most-actionable signals from the WEB SIGNALS list above (verbatim title + url).`;

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
                    headline: { type: "string" },
                    body: { type: "string" },
                    tag: { type: "string" },
                  },
                  required: ["headline", "body", "tag"],
                  additionalProperties: false,
                },
                education: {
                  type: "array",
                  description: "2-4 picks from the EDUCATION POOL. Use exact titles + URLs.",
                  items: {
                    type: "object",
                    properties: {
                      kind: { type: "string", enum: ["blog", "playbook", "topic"] },
                      title: { type: "string" },
                      url: { type: "string" },
                      why_today: { type: "string", description: "One sentence on why this teaches the team something useful today." },
                    },
                    required: ["kind", "title", "url", "why_today"],
                    additionalProperties: false,
                  },
                },
                tech: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      title: { type: "string" },
                      why: { type: "string" },
                      source_url: { type: "string" },
                    },
                    required: ["title", "why"],
                    additionalProperties: false,
                  },
                },
                industry: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      vertical: { type: "string" },
                      shift: { type: "string" },
                      why: { type: "string" },
                      source_url: { type: "string" },
                    },
                    required: ["vertical", "shift", "why"],
                    additionalProperties: false,
                  },
                },
                live_pulse: {
                  type: "array",
                  description: "3-5 freshest headlines from WEB SIGNALS, verbatim title + url.",
                  items: {
                    type: "object",
                    properties: {
                      title: { type: "string" },
                      url: { type: "string" },
                      source: { type: "string", description: "Hostname or publication name." },
                    },
                    required: ["title", "url"],
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
                      website: { type: "string" },
                      industry: { type: "string" },
                      location: { type: "string" },
                      signal: { type: "string" },
                      why: { type: "string" },
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

    // Augment live pulse w/ timestamp
    const pulse = (briefing.live_pulse || []).map((p: Record<string, unknown>) => ({
      ...p,
      ts: new Date().toISOString(),
    }));

    const { error: upErr } = await admin.from("forecast_briefings").upsert({
      briefing_date: today,
      tip: briefing.tip || {},
      tech: briefing.tech || [],
      industry: briefing.industry || [],
      companies: briefing.companies || [],
      education: briefing.education || [],
      live_pulse: pulse,
      sources: signals,
      settings_snapshot: settings,
      model: "google/gemini-2.5-pro",
      generated_at: new Date().toISOString(),
    }, { onConflict: "briefing_date" });
    if (upErr) throw upErr;

    return new Response(JSON.stringify({
      ok: true, date: today,
      signal_count: signals.length,
      company_count: briefing.companies?.length || 0,
      education_count: briefing.education?.length || 0,
      pulse_count: pulse.length,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("forecast-generate-daily error", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : String(e) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
