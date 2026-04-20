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
    const { url } = await req.json();
    if (!url || typeof url !== "string") {
      return new Response(JSON.stringify({ error: "URL is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const FIRECRAWL_API_KEY = Deno.env.get("FIRECRAWL_API_KEY");
    if (!FIRECRAWL_API_KEY) {
      return new Response(JSON.stringify({ error: "Firecrawl not configured" }), {
        status: 500,
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

    let formattedUrl = url.trim();
    if (!formattedUrl.startsWith("http://") && !formattedUrl.startsWith("https://")) {
      formattedUrl = `https://${formattedUrl}`;
    }

    // Scrape the website
    const scrapeRes = await fetch("https://api.firecrawl.dev/v2/scrape", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${FIRECRAWL_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        url: formattedUrl,
        formats: ["markdown"],
        onlyMainContent: true,
      }),
    });

    const scrapeData = await scrapeRes.json();
    const siteContent = scrapeData?.data?.markdown || scrapeData?.markdown || "";

    if (!siteContent || siteContent.length < 50) {
      return new Response(JSON.stringify({ error: "Could not extract enough content from the website." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const truncated = siteContent.substring(0, 8000);

    const prompt = `You are an expert LinkedIn Growth Strategist operating under the Business Forensics methodology. Based on the following website content, generate a LinkedIn Growth Content Pack using the four-pillar strategic framework.

WEBSITE CONTENT:
${truncated}

Generate the following in valid JSON format:
{
  "businessName": "detected business name",
  "brandjackPosts": [3 posts — analyze a well-known brand's decision/campaign/mistake through THIS business's unique lens],
  "newsjackPosts": [3 posts — contextualize a trending industry event, explaining downstream effects for THIS business's audience],
  "namejackPosts": [2 posts — reference a leader the ICP follows (e.g. Hormozi, Nadella, Bartlett) and redirect toward THIS business's expertise],
  "hotTakes": [2 posts — genuinely contrarian positions that force agreement or disagreement, must pass the Anxiety Test],
  "authorityPosts": [3 posts — niche deep-dives, case studies, forensic reports proving competence],
  "weeklySchedule": [
    {"day": "Monday", "format": "brandjack or newsjack", "goal": "New Audience Acquisition / Reach"},
    {"day": "Tuesday", "format": "authority", "goal": "Deepen Trust with Existing Followers"},
    {"day": "Wednesday", "format": "authority", "goal": "Prove Competence / Social Proof"},
    {"day": "Thursday", "format": "namejack or hottake", "goal": "Scale Visibility / Industry Ecosystem"},
    {"day": "Friday", "format": "authority", "goal": "Engagement / Retention"}
  ]
}

Each post object must have:
- "hook": opening line (pattern interrupt, scroll-stopping)
- "body": 2-3 paragraphs with line breaks, LinkedIn-native formatting
- "cta": call to action
- "format": "brandjack" | "newsjack" | "namejack" | "hottake" | "authority"
- "targetEntity": the brand, person, or event being referenced (empty string for authority posts)
- "soWhatSentence": one sentence answering "So what?" — the downstream implication
- "strategicGoal": "reach" | "trust" | "proof" | "visibility" | "retention"

CRITICAL RULES — Pre-Publishing Stress Tests:
1. "So What?" Test: Every post MUST have a clear, one-sentence answer to "So what?" If you can't state the downstream implication, you're still summarizing.
2. Anxiety Test (Hot Takes only): If the position wouldn't make someone nervous to publish, it's not contrarian enough. Force the reader to pick a side.
3. Insight Rule: The brand/person/event is EVIDENCE for a point only THIS business would make. Never summarize — always contextualize.
4. Contextualization > Summarization: Move beyond "what happened" to "why it matters" and "what's next."
5. Make posts feel authentic, aggressive, and forensic — not corporate or generic.
6. Each post must be unique and cover different angles of the business.
7. Reference actual products, services, and value props from the scraped website.`;

    const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: "You are a LinkedIn Growth Strategist and Business Forensics content expert. Return only valid JSON, no markdown fences. Every post must pass the So What test and use the entity as evidence for a proprietary insight." },
          { role: "user", content: prompt },
        ],
      }),
    });

    if (!aiRes.ok) {
      const status = aiRes.status;
      if (status === 429) {
        return new Response(JSON.stringify({ error: "Rate limited. Please try again in a moment." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
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
    console.error("generate-social-content error:", error);
    return new Response(JSON.stringify({ error: error.message || "Failed to generate content" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
