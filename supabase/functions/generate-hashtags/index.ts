import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY missing");

    const body = await req.json().catch(() => ({}));
    const niche: string = (body.niche || "B2B operations consulting").toString().slice(0, 300);
    const industry: string = (body.industry || "").toString().slice(0, 300);
    const topic: string = (body.topic || "").toString().slice(0, 500);
    const platform: string = (body.platform || "LinkedIn").toString().slice(0, 40);

    const system = `You are a social media hashtag strategist for ${platform}. You analyze CURRENT trending hashtags, niche-specific tags, and industry-popular tags. You balance: (1) high-volume trending tags for reach, (2) mid-volume niche tags for relevance, (3) low-volume industry tags for qualified audience. Never invent fake stats. Hashtags must be single tokens (no spaces), PascalCase or lowercase, no punctuation, max 30 chars, must start with #.`;

    const user = `Generate exactly 5 ${platform} hashtags for this content.

NICHE: ${niche}
INDUSTRY: ${industry || "(not specified, infer from niche)"}
TOPIC / POST CONTEXT: ${topic || "(general thought-leadership post for the niche)"}

Requirements:
- 5 hashtags total
- Mix: 1 broad trending, 2 niche-specific, 2 industry/audience-specific
- For each, return a short reason and a popularity tier (high | medium | low)
- Return via the report_hashtags tool only`;

    const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: system },
          { role: "user", content: user },
        ],
        tools: [{
          type: "function",
          function: {
            name: "report_hashtags",
            description: "Return the 5 hashtags",
            parameters: {
              type: "object",
              properties: {
                hashtags: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      tag: { type: "string", description: "Hashtag including the # symbol" },
                      reason: { type: "string", description: "Why this tag, in <= 14 words" },
                      category: { type: "string", enum: ["trending", "niche", "industry"] },
                      popularity: { type: "string", enum: ["high", "medium", "low"] },
                    },
                    required: ["tag", "reason", "category", "popularity"],
                    additionalProperties: false,
                  },
                  minItems: 5,
                  maxItems: 5,
                },
              },
              required: ["hashtags"],
              additionalProperties: false,
            },
          },
        }],
        tool_choice: { type: "function", function: { name: "report_hashtags" } },
      }),
    });

    if (resp.status === 429) {
      return new Response(JSON.stringify({ error: "Rate limited, try again shortly." }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    if (resp.status === 402) {
      return new Response(JSON.stringify({ error: "Out of credits. Top up Lovable AI." }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    if (!resp.ok) {
      const t = await resp.text();
      throw new Error(`AI gateway ${resp.status}: ${t.slice(0, 200)}`);
    }

    const data = await resp.json();
    const call = data.choices?.[0]?.message?.tool_calls?.[0];
    const args = call ? JSON.parse(call.function.arguments) : {};
    const hashtags = (args.hashtags || []).slice(0, 5).map((h: any) => ({
      tag: String(h.tag || "").trim().replace(/^#*/, "#").replace(/\s+/g, ""),
      reason: String(h.reason || "").trim(),
      category: ["trending", "niche", "industry"].includes(h.category) ? h.category : "niche",
      popularity: ["high", "medium", "low"].includes(h.popularity) ? h.popularity : "medium",
    }));

    return new Response(JSON.stringify({ hashtags }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    console.error("generate-hashtags error", e);
    return new Response(JSON.stringify({ error: (e as Error).message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
