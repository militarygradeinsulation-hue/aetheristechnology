// Trend discovery for SEO/AEO optimizer.
// Uses Lovable AI (Gemini) with web-grounded reasoning to surface trending
// keywords/questions in the AI consulting niche. Cached 7 days.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const TOPIC = "ai-consulting-indianapolis-b2b";
const CACHE_TTL_HOURS = 24 * 7;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const url = new URL(req.url);
    const force = url.searchParams.get("force") === "true";

    // Check cache
    if (!force) {
      const { data: cached } = await supabase
        .from("seo_trend_cache")
        .select("*")
        .eq("topic", TOPIC)
        .order("fetched_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (cached) {
        const age = (Date.now() - new Date(cached.fetched_at).getTime()) / 36e5;
        if (age < CACHE_TTL_HOURS) {
          return new Response(
            JSON.stringify({ trends: cached.trends, cached: true, age_hours: age }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" } },
          );
        }
      }
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY missing");

    const systemPrompt = `You are an SEO/AEO research analyst. Your job is to surface high-intent, currently-trending search terms and questions for an AI consulting firm in Indianapolis serving B2B clients.
Focus on: AI strategy, AI agents, generative AI, automation, AI ROI, digital transformation, AI ethics/governance, AI for specific verticals (healthcare, finance, manufacturing, logistics, construction, SaaS).
Prioritize terms with clear B2B/decision-maker intent (search modifiers like "for business", "consultant", "ROI", "implementation", "cost", "how to").
Return ONLY a JSON object via the provided tool — no prose.`;

    const userPrompt = `Surface the most valuable SEO/AEO opportunities right now for an Indianapolis AI consulting firm. Include:
- 15 trending high-intent keywords (mix of short-tail authority terms + long-tail buying-intent phrases)
- 10 trending questions people ask AI engines (ChatGPT/Perplexity/Google AI Overviews) about implementing AI in business
- 5 trending vertical/industry combinations (e.g., "AI for healthcare operations")
- 5 currently-rising topics in B2B AI (last 30-90 days)
For each, briefly note WHY it's valuable (intent, volume, recency).`;

    const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-pro",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "report_trends",
              description: "Return SEO/AEO trend research",
              parameters: {
                type: "object",
                properties: {
                  keywords: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        term: { type: "string" },
                        intent: { type: "string", enum: ["informational", "commercial", "transactional", "navigational"] },
                        rationale: { type: "string" },
                      },
                      required: ["term", "intent", "rationale"],
                      additionalProperties: false,
                    },
                  },
                  questions: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        question: { type: "string" },
                        rationale: { type: "string" },
                      },
                      required: ["question", "rationale"],
                      additionalProperties: false,
                    },
                  },
                  verticals: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        industry: { type: "string" },
                        phrase: { type: "string" },
                        rationale: { type: "string" },
                      },
                      required: ["industry", "phrase", "rationale"],
                      additionalProperties: false,
                    },
                  },
                  rising_topics: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        topic: { type: "string" },
                        rationale: { type: "string" },
                      },
                      required: ["topic", "rationale"],
                      additionalProperties: false,
                    },
                  },
                },
                required: ["keywords", "questions", "verticals", "rising_topics"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "report_trends" } },
      }),
    });

    if (!aiRes.ok) {
      const txt = await aiRes.text();
      console.error("AI gateway error:", aiRes.status, txt);
      return new Response(
        JSON.stringify({ error: `AI gateway error ${aiRes.status}` }),
        { status: aiRes.status, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const aiData = await aiRes.json();
    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) throw new Error("No tool call in AI response");
    const trends = JSON.parse(toolCall.function.arguments);

    await supabase.from("seo_trend_cache").insert({
      topic: TOPIC,
      trends,
      source: "lovable-ai-gemini-2.5-pro",
    });

    return new Response(
      JSON.stringify({ trends, cached: false }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    console.error("seo-discover-trends error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : String(e) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
