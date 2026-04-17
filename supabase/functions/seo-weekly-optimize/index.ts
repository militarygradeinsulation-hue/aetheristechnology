// Weekly self-optimizing SEO/AEO loop.
// 1. For each known route → Firecrawl scrape (current title/desc/h1/keywords)
// 2. Pull fresh trends via seo-discover-trends
// 3. Lovable AI rewrites meta + FAQs + TL;DR (brand-locked)
// 4. Upsert seo_overrides + write log row
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Routes to optimize (can extend later — kept curated for token cost control)
const ROUTES: Array<{ path: string; intent: string }> = [
  { path: "/", intent: "Homepage — top-of-funnel AI consulting authority" },
  { path: "/services", intent: "Service catalog — AI strategy, automation, governance" },
  { path: "/ai-consultant", intent: "AI strategy consulting — high-intent commercial" },
  { path: "/marketing-strategist", intent: "AI marketing strategy" },
  { path: "/sales-compass", intent: "AI sales tools and playbooks" },
  { path: "/assessment", intent: "AI Readiness Assessment lead magnet" },
  { path: "/scan", intent: "Free Website AI Scanner — top-of-funnel tool" },
  { path: "/diagnostic-quiz", intent: "Business AI diagnostic quiz" },
  { path: "/friction-audit", intent: "Friction Vocabulary Audit tool" },
  { path: "/about", intent: "About + founder bio — trust/authority" },
  { path: "/why-us", intent: "Differentiation page — competitive positioning" },
  { path: "/solutions", intent: "Solutions overview" },
  { path: "/industries", intent: "Industries hub — vertical AI solutions overview" },
  { path: "/ai-for-healthcare", intent: "AI for Healthcare — Indianapolis vertical landing, HIPAA + clinical ops" },
  { path: "/ai-for-finance", intent: "AI for Finance — Indianapolis vertical landing, risk + compliance + automation" },
  { path: "/ai-for-logistics", intent: "AI for Logistics — Indianapolis vertical landing, routing + fleet + warehouse" },
  { path: "/ai-for-construction", intent: "AI for Construction — Indianapolis vertical landing, bids + safety + scheduling" },
  { path: "/ai-for-manufacturing", intent: "AI for Manufacturing — Indianapolis vertical landing, predictive maintenance + quality" },
  { path: "/ai-for-saas", intent: "AI for SaaS — vertical landing, churn + product-led growth + support automation" },
];

const SITE_URL = "https://aetheris.technology";

const BRAND_RULES = `BRAND VOICE LOCK (must obey):
- Tone: Aggressive, blunt, non-corporate, high-end
- Target: B2B decision-makers seeking real AI ROI
- Geography: Indianapolis, Indiana focus
- Brand name MUST appear: "Aetheris AI" or "Aetheris"
- FORBIDDEN words/phrases: testimonial, social proof, "magic robot", "limited time", "hurry", "act now", emojis in titles/descriptions
- Title: 50-60 chars, ends in "| Aetheris AI" if room
- Meta description: 140-155 chars, action-oriented, includes 1-2 keywords + Indianapolis when natural
- TL;DR: 1-3 sentences answering "what is this page" — written so AI engines (ChatGPT, Perplexity, Google AI Overviews) will quote it verbatim
- FAQs: 3-5 questions, real B2B buyer questions, each answer 1-3 sentences, plain English (no jargon-only)
- Keep core service terms intact: "AI consulting", "AI strategy", "AI agents", "automation"`;

function detectForbidden(text: string): string | null {
  const banned = [/testimonial/i, /social proof/i, /magic robot/i, /limited time/i, /\bhurry\b/i, /\bact now\b/i];
  for (const r of banned) {
    const m = text.match(r);
    if (m) return m[0];
  }
  return null;
}

async function firecrawlScrape(url: string): Promise<{ title?: string; description?: string; h1?: string; keywords?: string }> {
  const FIRECRAWL_API_KEY = Deno.env.get("FIRECRAWL_API_KEY");
  if (!FIRECRAWL_API_KEY) return {};
  try {
    const res = await fetch("https://api.firecrawl.dev/v2/scrape", {
      method: "POST",
      headers: { Authorization: `Bearer ${FIRECRAWL_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({ url, formats: ["markdown"], onlyMainContent: false, waitFor: 1500 }),
    });
    if (!res.ok) return {};
    const data = await res.json();
    const meta = data?.data?.metadata ?? data?.metadata ?? {};
    const md: string = data?.data?.markdown ?? data?.markdown ?? "";
    const h1Match = md.match(/^#\s+(.+)$/m);
    return {
      title: meta.title,
      description: meta.description,
      h1: h1Match?.[1],
      keywords: meta.keywords,
    };
  } catch (e) {
    console.error("firecrawl err", url, e);
    return {};
  }
}

async function optimizeRoute(
  current: Record<string, string | undefined>,
  route: { path: string; intent: string },
  trends: unknown,
  LOVABLE_API_KEY: string,
) {
  const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "google/gemini-2.5-pro",
      messages: [
        {
          role: "system",
          content: `You are the SEO/AEO optimizer for Aetheris AI.\n${BRAND_RULES}\n\nGiven the current page metadata + trending keywords + page intent, output an optimized payload. Reasoning should briefly explain which trends drove the changes.`,
        },
        {
          role: "user",
          content: `Page: ${route.path}\nIntent: ${route.intent}\n\nCURRENT METADATA:\n${JSON.stringify(current, null, 2)}\n\nTRENDING DATA:\n${JSON.stringify(trends, null, 2)}\n\nProduce optimized output via the tool.`,
        },
      ],
      tools: [
        {
          type: "function",
          function: {
            name: "apply_seo_override",
            description: "Submit optimized SEO/AEO payload",
            parameters: {
              type: "object",
              properties: {
                title: { type: "string", description: "50-60 chars" },
                description: { type: "string", description: "140-155 chars" },
                keywords: { type: "string", description: "Comma-separated, 8-15 terms" },
                tldr: { type: "string", description: "1-3 sentence answer-first summary" },
                faqs: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      question: { type: "string" },
                      answer: { type: "string" },
                    },
                    required: ["question", "answer"],
                    additionalProperties: false,
                  },
                  minItems: 3,
                  maxItems: 5,
                },
                reasoning: { type: "string" },
                score: { type: "number", description: "0-100 self-assessed AEO/SEO strength" },
              },
              required: ["title", "description", "keywords", "tldr", "faqs", "reasoning", "score"],
              additionalProperties: false,
            },
          },
        },
      ],
      tool_choice: { type: "function", function: { name: "apply_seo_override" } },
    }),
  });

  if (!aiRes.ok) {
    const txt = await aiRes.text();
    throw new Error(`AI ${aiRes.status}: ${txt.slice(0, 200)}`);
  }
  const aiData = await aiRes.json();
  const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
  if (!toolCall) throw new Error("No tool call in optimizer response");
  const payload = JSON.parse(toolCall.function.arguments);

  // Brand safety check
  const blob = `${payload.title}\n${payload.description}\n${payload.tldr}\n${JSON.stringify(payload.faqs)}`;
  const banned = detectForbidden(blob);
  if (banned) throw new Error(`Forbidden phrase detected: "${banned}"`);
  if (!/aetheris/i.test(blob)) throw new Error("Brand name 'Aetheris' missing");

  return payload;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY missing");

    let body: { routes?: string[]; run_type?: string } = {};
    try { body = await req.json(); } catch { /* GET / cron */ }

    const targetRoutes = body.routes?.length
      ? ROUTES.filter(r => body.routes!.includes(r.path))
      : ROUTES;
    const runType = body.run_type ?? "weekly";

    // 1. Get trends (cached or fresh)
    const trendsRes = await fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/seo-discover-trends`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
        "Content-Type": "application/json",
      },
    });
    const trendsJson = await trendsRes.json();
    const trends = trendsJson.trends ?? {};

    const results: Array<{ path: string; status: string; error?: string; score?: number }> = [];

    for (const route of targetRoutes) {
      try {
        // 2. Scrape current state
        const current = await firecrawlScrape(`${SITE_URL}${route.path}`);

        // Existing override (for "before" snapshot)
        const { data: existing } = await supabase
          .from("seo_overrides")
          .select("*")
          .eq("path", route.path)
          .maybeSingle();

        const before = existing
          ? { title: existing.title, description: existing.description, keywords: existing.keywords, tldr: existing.tldr, faqs: existing.faqs }
          : current;

        // 3. AI optimize (with one retry on brand-safety failure)
        let optimized;
        try {
          optimized = await optimizeRoute(current, route, trends, LOVABLE_API_KEY);
        } catch (firstErr) {
          console.warn(`Retry ${route.path}:`, firstErr);
          optimized = await optimizeRoute(current, route, trends, LOVABLE_API_KEY);
        }

        // 4. Upsert override
        const newVersion = (existing?.version ?? 0) + 1;
        await supabase.from("seo_overrides").upsert({
          path: route.path,
          title: optimized.title,
          description: optimized.description,
          keywords: optimized.keywords,
          tldr: optimized.tldr,
          faqs: optimized.faqs,
          version: newVersion,
          applied_at: new Date().toISOString(),
        }, { onConflict: "path" });

        // 5. Log
        await supabase.from("seo_optimization_log").insert({
          route: route.path,
          before,
          after: { title: optimized.title, description: optimized.description, keywords: optimized.keywords, tldr: optimized.tldr, faqs: optimized.faqs },
          trends_used: trends,
          ai_reasoning: optimized.reasoning,
          score_after: Math.round(optimized.score),
          run_type: runType,
          status: "applied",
        });

        results.push({ path: route.path, status: "ok", score: optimized.score });
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        console.error(`Failed ${route.path}:`, msg);
        await supabase.from("seo_optimization_log").insert({
          route: route.path,
          before: {},
          after: {},
          trends_used: trends,
          ai_reasoning: msg,
          run_type: runType,
          status: "failed",
        });
        results.push({ path: route.path, status: "error", error: msg });
      }
    }

    return new Response(
      JSON.stringify({ ok: true, run_type: runType, results }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    console.error("seo-weekly-optimize error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : String(e) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
