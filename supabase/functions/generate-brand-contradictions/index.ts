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
    const { url, socialLinks, idealCustomer, desiredPerception } = await req.json();

    if (!url || typeof url !== "string" || !idealCustomer || !desiredPerception?.length) {
      return new Response(JSON.stringify({ error: "Website URL, ideal customer, and desired perception are required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const FIRECRAWL_API_KEY = Deno.env.get("FIRECRAWL_API_KEY");
    if (!FIRECRAWL_API_KEY) {
      return new Response(JSON.stringify({ error: "Firecrawl not configured" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: "AI not configured" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let formattedUrl = url.trim();
    if (!formattedUrl.startsWith("http://") && !formattedUrl.startsWith("https://")) {
      formattedUrl = `https://${formattedUrl}`;
    }

    // Scrape website content + branding
    const scrapeRes = await fetch("https://api.firecrawl.dev/v2/scrape", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${FIRECRAWL_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        url: formattedUrl,
        formats: ["markdown", "branding"],
        onlyMainContent: false,
      }),
    });

    const scrapeData = await scrapeRes.json();
    const siteContent = scrapeData?.data?.markdown || scrapeData?.markdown || "";
    const branding = scrapeData?.data?.branding || scrapeData?.branding || null;

    if (!siteContent || siteContent.length < 50) {
      return new Response(JSON.stringify({ error: "Could not extract enough content from the website." }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const truncated = siteContent.substring(0, 10000);
    const brandingStr = branding ? JSON.stringify(branding).substring(0, 3000) : "No branding data extracted";

    const prompt = `You are a brand perception analyst and trust strategist. Analyze this company's brand for contradictions — places where they say one thing but signal something different.

WEBSITE CONTENT:
${truncated}

BRANDING DATA (colors, fonts, visuals):
${brandingStr}

COMPANY CONTEXT:
- Social Links: ${socialLinks || 'Not provided'}
- Ideal Customer: ${idealCustomer}
- How they WANT to be perceived: ${desiredPerception.join(', ')}

Analyze contradictions across 5 layers:
1. Message vs Visual Identity — Does the visual presentation match the stated positioning?
2. Tone vs Audience — Does the writing tone match who they're trying to attract?
3. Offer vs Pricing — Does the pricing language match the positioning?
4. Promise vs Process — Does the user experience match the promises made?
5. Emotion vs Trust — Do the emotional signals build or undermine confidence?

Return valid JSON:
{
  "businessName": "detected business name",
  "contradictionScore": 0-100 (100 = perfectly aligned, lower = more contradictions),
  "overallAssessment": "2-3 sentence summary",
  "contradictions": [
    {
      "layer": "message_vs_visual | tone_vs_audience | offer_vs_pricing | promise_vs_process | emotion_vs_trust",
      "title": "Short contradiction name",
      "description": "Plain English explanation of the contradiction",
      "emotionalImpact": "What the buyer FEELS because of this",
      "buyerPerception": "What the buyer likely concludes",
      "severity": "critical | high | moderate",
      "recommendedFix": "Specific actionable fix",
      "beforeAfter": { "before": "Current state", "after": "Ideal state" }
    }
  ],
  "hiddenStrengths": ["Things the brand is doing RIGHT that they should amplify"],
  "priorityFixes": ["Top 3 things to fix first, in order"]
}

RULES:
- Find 5-8 specific contradictions
- Be brutally honest but constructive
- Use plain English, not marketing jargon
- Each contradiction must be specific to THIS brand, not generic advice
- The buyer perception and emotional impact should feel real and relatable`;

    const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: "You are a brand perception analyst. Return only valid JSON, no markdown fences." },
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
    raw = raw.replace(/[\x00-\x1F\x7F]/g, (ch: string) => ch === '\n' || ch === '\r' || ch === '\t' ? ch : '');
    const result = JSON.parse(raw);

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("generate-brand-contradictions error:", error);
    const message = error instanceof Error ? error.message : "Failed to analyze brand";
    return new Response(JSON.stringify({ error: message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
