import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { industry, goals, platforms } = await req.json();
    if (!industry) {
      return new Response(JSON.stringify({ error: "Industry is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: "AI not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const prompt = `You are a content marketing strategist. Create a detailed 30-day content calendar.

INDUSTRY: ${industry}
GOALS: ${goals || "Brand awareness, lead generation, engagement"}
PLATFORMS: ${platforms || "LinkedIn, Facebook, Instagram"}

Return valid JSON:
{
  "days": [
    30 objects, each with:
    "day": 1-30,
    "topic": "main topic for the day",
    "hook": "scroll-stopping opening line",
    "platform": "primary platform",
    "contentType": "post/carousel/video/story/poll",
    "bestTime": "e.g. 9:00 AM EST",
    "caption": "full post caption (2-3 sentences)",
    "hashtags": ["3-5 relevant hashtags"]
  ]
}

Rules:
- Mix content types throughout the month
- Alternate between educational, entertaining, and promotional
- Include industry-specific trending topics
- Each hook should be unique and curiosity-driven
- Space out promotional content (max 20% of posts)
- Include engagement-focused posts (polls, questions, hot takes)`;

    const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: "You are a content calendar expert. Return only valid JSON, no markdown fences." },
          { role: "user", content: prompt },
        ],
      }),
    });

    if (!aiRes.ok) {
      const status = aiRes.status;
      if (status === 429) return new Response(JSON.stringify({ error: "Rate limited." }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      if (status === 402) return new Response(JSON.stringify({ error: "AI credits exhausted." }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      throw new Error("AI request failed");
    }

    const aiData = await aiRes.json();
    let raw = aiData.choices?.[0]?.message?.content || "";
    raw = raw.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
    const result = JSON.parse(raw);

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("generate-content-calendar error:", error);
    return new Response(JSON.stringify({ error: error.message || "Failed to generate calendar" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
