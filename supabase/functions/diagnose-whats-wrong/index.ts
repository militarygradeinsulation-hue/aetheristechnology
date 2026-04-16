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
    const { issues, notes } = await req.json();

    if (!issues || !Array.isArray(issues) || issues.length === 0) {
      return new Response(JSON.stringify({ error: "Select at least one issue" }), {
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

    const prompt = `You are a blunt, no-BS business consultant at Aetheris AI. A potential client has told you what's wrong with their business. Analyze their issues and recommend the BEST solution package from our catalog.

ISSUES THEY SELECTED:
${issues.map((i: string) => `- ${i}`).join("\n")}

${notes ? `ADDITIONAL CONTEXT:\n${notes}` : ""}

OUR SERVICE CATALOG:
1. Full Website Report — $49 (complete AI diagnostic of website gaps and revenue leaks)
2. Digital Snapshot — $125 (automated analysis of digital footprint, SEO, content gaps)
3. Strategy Blueprint — $299 (full report + CRM plan + implementation specs + content calendar)
4. Social Content Pack — $29 (25 social media posts from their website)
5. Sales Script Pack — $49 (call scripts, objection handlers, follow-up templates)
6. Content Calendar — $29 (30-day content plan with hooks and captions)
7. Follow-Up Plan — $49 (14-day multi-channel sales cadence)
8. Website Evaluation — $500 (detailed human tear-down + strategy call)
9. Full Analytics Package — $500 (website + social + CRM — complete picture, normally $1,200+)
10. 14-Day Diagnostic — $2,500 (embedded operational audit finding every revenue leak)
11. Full Buildout — $5,000-$25,000 (complete digital infrastructure rebuild)

Return a JSON object with this exact structure:
{
  "diagnosis": "2-3 sentence blunt assessment of their situation",
  "urgentFix": "The single most urgent thing they need to fix right now",
  "recommendedPackage": {
    "name": "exact service name from catalog",
    "price": "exact price",
    "description": "one sentence about what they get",
    "whyThisFits": "why this specific package matches their issues"
  },
  "additionalServices": [
    { "name": "service name", "price": "price", "reason": "why this helps" }
  ],
  "estimatedRevenueLeak": "$X,XXX-$XX,XXX/month",
  "nextStep": "Clear one-sentence call to action"
}

RULES:
- Be direct and specific, not generic
- Recommend 1 primary package and 1-3 additional services
- Revenue leak estimate should be realistic based on common business sizes
- The recommendation must make logical sense given their issues
- Always push toward the package that solves the ROOT problem, not just symptoms
- If issues span multiple areas, recommend the Full Analytics Package or 14-Day Diagnostic`;

    const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: "You are a business consultant. Return only valid JSON, no markdown fences." },
          { role: "user", content: prompt },
        ],
      }),
    });

    if (!aiRes.ok) {
      const status = aiRes.status;
      if (status === 429) return new Response(JSON.stringify({ error: "Rate limited. Try again shortly." }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      if (status === 402) return new Response(JSON.stringify({ error: "AI credits exhausted." }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      throw new Error("AI request failed");
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
    console.error("diagnose-whats-wrong error:", error);
    return new Response(JSON.stringify({ error: error.message || "Failed to generate recommendation" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
