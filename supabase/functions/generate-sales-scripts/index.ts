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
    const { industry, product, targetCustomer, objections } = await req.json();
    if (!industry || !product) {
      return new Response(JSON.stringify({ error: "Industry and product/service are required" }), {
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

    const prompt = `You are a world-class sales trainer. Generate comprehensive sales scripts based on:

INDUSTRY: ${industry}
PRODUCT/SERVICE: ${product}
TARGET CUSTOMER: ${targetCustomer || "General business decision-makers"}
COMMON OBJECTIONS: ${objections || "Price, timing, already have a solution"}

Return valid JSON:
{
  "callScript": {
    "opening": "The first 30 seconds of the call",
    "discovery": "Discovery questions to ask",
    "pitch": "The core value pitch",
    "close": "Closing language"
  },
  "followUpTemplates": [
    3 objects with "type" (email/sms/voicemail), "subject" (if email), "body", "timing" (when to send)
  ],
  "objectionHandlers": [
    5 objects with "objection", "response", "reframe"
  ],
  "smsTemplates": [
    3 objects with "timing", "message"
  ]
}

Rules:
- Be conversational, not robotic
- Use specific language for the industry
- Include pattern interrupts in the opening
- Objection responses should acknowledge, reframe, then redirect
- Follow-ups should create urgency without being pushy`;

    const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: "You are a sales scripting expert. Return only valid JSON, no markdown fences." },
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
    raw = raw.replace(/[\x00-\x1F\x7F]/g, (ch) => ch === '\n' || ch === '\r' || ch === '\t' ? ch : '');
    const result = JSON.parse(raw);

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("generate-sales-scripts error:", error);
    return new Response(JSON.stringify({ error: error.message || "Failed to generate scripts" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
