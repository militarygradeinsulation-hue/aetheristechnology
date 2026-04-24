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
    const { businessType, salesCycleLength, currentTools } = await req.json();
    if (!businessType) {
      return new Response(JSON.stringify({ error: "Business type is required" }), {
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

    const prompt = `You are a sales process expert. Create a detailed 14-day follow-up system plan.

BUSINESS TYPE: ${businessType}
SALES CYCLE LENGTH: ${salesCycleLength || "2-4 weeks"}
CURRENT TOOLS: ${currentTools || "Email, phone"}

Return valid JSON:
{
  "overview": "Brief strategic overview of the follow-up approach",
  "days": [
    14 objects, each with:
    "day": 0-13,
    "channel": "email" | "sms" | "call" | "linkedin",
    "action": "What to do",
    "template": "Full message/script template",
    "subject": "Email subject line (if email)",
    "timing": "Best time of day",
    "goal": "What this touchpoint achieves",
    "tips": "Pro tips for this step"
  ],
  "objectionResponses": [
    4 objects with "trigger" (what they say), "response" (what you say back)
  ]
}

Rules:
- Start with value, not a pitch
- Day 0 = same-day follow-up after initial contact
- Mix channels: don't do 3 emails in a row
- Include a "breakup" message on day 13-14
- Templates should be ready to copy-paste with [BRACKET] placeholders
- Each touchpoint should reference the previous one
- Include specific times (e.g., "Tuesday 10:30 AM")`;

    const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: "You are a sales follow-up expert. Return only valid JSON, no markdown fences." },
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
    console.error("generate-follow-up-plan error:", error);
    const message = error instanceof Error ? error.message : "Failed to generate plan";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
