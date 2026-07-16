import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function fallbackQuestions(industry: string, mainProduct: string, goal: string) {
  const categories = ["leadership", "sales", "marketing", "operations", "hiringAndPeople", "pricingAndOffer", "customerJourney", "growthAndExpansion"];
  const make = (category: string, i: number) => ({
    question: `Where is ${industry} leaking money in ${category.replace(/([A-Z])/g, " $1").toLowerCase()} before ${mainProduct} ever gets a fair shot?`,
    whyItMatters: "This isolates the system failure instead of blaming lead quality, effort, or market conditions.",
    ...(i < 10 ? { category, urgency: i < 3 ? "critical" : i < 6 ? "high" : "medium" } : {}),
  });
  return {
    _fallback: true,
    _fallbackReason: "AI strategic question generation timed out, so a safe operator question map was returned instead.",
    companySnapshot: `${industry} is trying to reach ${goal}. The core risk is disconnected sales, marketing, and operations signals hiding the real leak pattern.`,
    top10CriticalQuestions: Array.from({ length: 10 }, (_, i) => make(categories[i % categories.length], i)),
    categories: Object.fromEntries(categories.map((c) => [c, Array.from({ length: 4 }, (_, i) => make(c, i + 10))])),
    questionsYouProbablyArentAsking: [
      { question: "Which handoff looks successful in the tool but fails in the real buyer journey?", whyItMatters: "Silent handoff failures create false confidence." },
      { question: "What follow-up step depends on memory instead of a system?", whyItMatters: "Memory-based operations do not scale." },
      { question: "Which metric improves while cash still leaks?", whyItMatters: "Vanity metrics can hide margin loss." },
      { question: "Where do prospects stall without anyone owning the stall?", whyItMatters: "Unowned stalls become accepted leakage." },
      { question: "What would break first if volume doubled next month?", whyItMatters: "Capacity leaks show up before growth does." },
    ],
    leadershipTeamDiscussion: Array.from({ length: 5 }, (_, i) => ({ question: `What leak would we fix first if we had to recover cash in ${i + 1} week(s)?`, context: "Forces prioritization by business impact." })),
    workshopPrompts: Array.from({ length: 5 }, (_, i) => ({ prompt: `Map the ${i + 1} highest-risk buyer handoffs and mark who owns each one.`, format: "Whiteboard", timeEstimate: "20 minutes" })),
  };
}

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

    const aiRes = await Promise.race([
      fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      signal: AbortSignal.timeout(15_000),
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
      }),
      new Promise<Response>((_, reject) => setTimeout(() => reject(new Error("AI request timed out")), 15_500)),
    ]);

    if (!aiRes.ok) {
      const status = aiRes.status;
      if (status === 429) return new Response(JSON.stringify({ error: "Rate limited. Please try again in a moment." }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      if (status === 402) return new Response(JSON.stringify({ error: "AI credits exhausted." }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      return new Response(JSON.stringify(fallbackQuestions(industry, mainProduct, goal)), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const aiData = await aiRes.json();
    let raw = aiData.choices?.[0]?.message?.content || "";
    raw = raw.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
    raw = raw.replace(/[\x00-\x1F\x7F]/g, (ch: string) => ch === '\n' || ch === '\r' || ch === '\t' ? ch : '');
    const result = JSON.parse(raw);

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("generate-strategic-questions error:", error);
    const message = error instanceof Error ? error.message : "Failed to generate questions";
    if (/abort|timeout|timed out|context canceled|AI request failed/i.test(message)) {
      return new Response(JSON.stringify(fallbackQuestions("general business", "core offer", "predictable growth")), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    return new Response(JSON.stringify({ error: message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
