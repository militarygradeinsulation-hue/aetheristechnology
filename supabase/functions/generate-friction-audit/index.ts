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
    const { url, desiredTone, industry, targetCustomer } = await req.json();

    if (!url || typeof url !== "string" || !desiredTone?.length || !industry || !targetCustomer) {
      return new Response(JSON.stringify({ error: "All fields are required" }), {
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

    const scrapeRes = await fetch("https://api.firecrawl.dev/v2/scrape", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${FIRECRAWL_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        url: formattedUrl,
        formats: ["markdown"],
        onlyMainContent: false,
      }),
    });

    const scrapeData = await scrapeRes.json();
    const siteContent = scrapeData?.data?.markdown || scrapeData?.markdown || "";

    if (!siteContent || siteContent.length < 50) {
      return new Response(JSON.stringify({ error: "Could not extract enough content from the website." }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const truncated = siteContent.substring(0, 12000);

    const prompt = `You are a language precision expert and copywriting surgeon. Analyze this website's copy for friction — words and phrases that create drag, confusion, emotional flatness, vagueness, or hesitation.

WEBSITE CONTENT:
${truncated}

COMPANY CONTEXT:
- Industry: ${industry}
- Target Customer: ${targetCustomer}
- Desired Brand Tone: ${desiredTone.join(', ')}

Scan for 5 categories of friction:
1. VAGUE LANGUAGE — phrases that say nothing specific (e.g., "quality service", "tailored solutions")
2. CORPORATE FILLER — words that sound polished but empty (e.g., "leverage", "synergy", "best in class")
3. WEAK EMOTIONAL LANGUAGE — words that fail to create urgency or confidence (e.g., overuse of "help", "support", "provide")
4. RISKY WORDING — phrases that create doubt (e.g., "we aim to", "we strive to", "may help")
5. FLAT CALLS TO ACTION — CTAs that don't move people (e.g., "learn more", "contact us", "submit")

Return valid JSON:
{
  "businessName": "detected business name",
  "frictionScore": 0-100 (100 = clean, sharp copy; lower = more friction),
  "overallAssessment": "2-3 sentence summary of the copy quality",
  "flaggedPhrases": [
    {
      "originalPhrase": "exact phrase from the site",
      "category": "vague | corporate_filler | weak_emotional | risky_wording | flat_cta",
      "issue": "why this phrase creates drag",
      "severity": "critical | high | moderate",
      "suggestedReplacement": "stronger alternative",
      "context": "where on the page this appears"
    }
  ],
  "toneAlignment": {
    "currentTone": "what the copy currently sounds like",
    "desiredTone": "what they want",
    "gap": "explanation of the gap",
    "recommendations": ["specific tone shift recommendations"]
  },
  "strongerCTAs": [
    { "current": "existing CTA", "replacement": "stronger version", "whyBetter": "..." }
  ],
  "topPriorityFixes": ["The 5 most impactful changes, in order"],
  "copyStrengths": ["Things the copy does well that should be kept"]
}

RULES:
- Flag 15-25 specific phrases from the actual site content
- Every flagged phrase must include the EXACT text from the site
- Replacements must fit the desired brand tone
- Be specific and surgical — not vague advice
- Include at least 3 stronger CTA alternatives
- Acknowledge what's working too`;

    const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: "You are a copywriting precision expert. Return only valid JSON, no markdown fences." },
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
    console.error("generate-friction-audit error:", error);
    const message = error instanceof Error ? error.message : "Failed to audit vocabulary";
    return new Response(JSON.stringify({ error: message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
