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
    const { industry, companySize, yearsInBusiness, mainProduct, growthStage, biggestFrustration, pressureAreas, revenueRange, goal } = await req.json();

    if (!industry || !companySize || !mainProduct || !growthStage || !biggestFrustration || !pressureAreas?.length || !goal) {
      return new Response(JSON.stringify({ error: "All required fields must be filled" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: "AI not configured" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const prompt = `You are a world-class business strategist and executive coach. Based on the following company profile, generate a custom strategic question map — sharp, specific questions that expose blind spots and force real thinking.

COMPANY PROFILE:
- Industry: ${industry}
- Company Size: ${companySize}
- Years in Business: ${yearsInBusiness || 'Not specified'}
- Main Product/Service: ${mainProduct}
- Growth Stage: ${growthStage}
- Biggest Frustration: ${biggestFrustration}
- Pressure Areas: ${pressureAreas.join(', ')}
- Revenue Range: ${revenueRange || 'Not specified'}
- Goal: ${goal}

Generate a comprehensive strategic question report in valid JSON:
{
  "companySnapshot": "One-paragraph summary of the company's situation",
  "top10CriticalQuestions": [
    { "question": "...", "category": "...", "urgency": "critical|high|medium", "whyItMatters": "..." }
  ],
  "categories": {
    "leadership": [{ "question": "...", "whyItMatters": "..." }],
    "sales": [{ "question": "...", "whyItMatters": "..." }],
    "marketing": [{ "question": "...", "whyItMatters": "..." }],
    "operations": [{ "question": "...", "whyItMatters": "..." }],
    "hiringAndPeople": [{ "question": "...", "whyItMatters": "..." }],
    "pricingAndOffer": [{ "question": "...", "whyItMatters": "..." }],
    "customerJourney": [{ "question": "...", "whyItMatters": "..." }],
    "growthAndExpansion": [{ "question": "...", "whyItMatters": "..." }]
  },
  "questionsYouProbablyArentAsking": [
    { "question": "...", "whyItMatters": "..." }
  ],
  "leadershipTeamDiscussion": [
    { "question": "...", "context": "..." }
  ],
  "workshopPrompts": [
    { "prompt": "...", "format": "...", "timeEstimate": "..." }
  ]
}

RULES:
- Generate 10 top critical questions
- Generate 4-6 questions per category (8 categories)
- Generate 5 "questions you probably aren't asking"
- Generate 5 leadership team discussion questions
- Generate 5 workshop prompts
- Questions must be sharp, specific to THIS company — not generic
- Questions should make owners stop and think, not just confirm what they know
- Never ask weak questions like "Are you happy with...?" or "Do you have...?"
- Focus on exposing root causes, not symptoms`;

    const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: "You are a strategic business advisor. Return only valid JSON, no markdown fences." },
          { role: "user", content: prompt },
        ],
      }),
    });

    if (!aiRes.ok) {
      const status = aiRes.status;
      if (status === 429) return new Response(JSON.stringify({ error: "Rate limited. Please try again in a moment." }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
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
    console.error("generate-strategic-questions error:", error);
    return new Response(JSON.stringify({ error: error.message || "Failed to generate questions" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
