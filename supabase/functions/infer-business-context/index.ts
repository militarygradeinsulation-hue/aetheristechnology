import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { url } = await req.json();
    if (!url) {
      return new Response(JSON.stringify({ error: "URL is required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const FIRECRAWL_API_KEY = Deno.env.get("FIRECRAWL_API_KEY");
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!FIRECRAWL_API_KEY || !LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: "Service not configured" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let formattedUrl = url.trim();
    if (!/^https?:\/\//i.test(formattedUrl)) formattedUrl = `https://${formattedUrl}`;

    // Scrape with Firecrawl
    const scrapeRes = await fetch("https://api.firecrawl.dev/v1/scrape", {
      method: "POST",
      headers: { Authorization: `Bearer ${FIRECRAWL_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({ url: formattedUrl, formats: ["markdown"], onlyMainContent: true, waitFor: 2000 }),
    });
    const scrapeData = await scrapeRes.json();
    const markdown = scrapeData.data?.markdown || scrapeData.markdown || "";
    const metadata = scrapeData.data?.metadata || scrapeData.metadata || {};

    if (!markdown) {
      return new Response(JSON.stringify({ error: "Could not read site content" }), {
        status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Ask AI to infer the business profile
    const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "system",
            content: "You analyze company websites and extract a clean business profile. Return ONLY the function call. Be concise and concrete — no marketing fluff.",
          },
          {
            role: "user",
            content: `Analyze this website and infer the business profile.

URL: ${formattedUrl}
Title: ${metadata.title || ""}
Description: ${metadata.description || ""}

Page content (markdown):
${markdown.slice(0, 8000)}

Return the business_profile function call.`,
          },
        ],
        tools: [{
          type: "function",
          function: {
            name: "business_profile",
            description: "Inferred business profile",
            parameters: {
              type: "object",
              properties: {
                businessName: { type: "string", description: "Brand / company name" },
                industry: { type: "string", description: "1-3 word industry, e.g. 'B2B SaaS', 'Healthcare', 'Construction'" },
                product: { type: "string", description: "Main product or service offered (one sentence)" },
                targetCustomer: { type: "string", description: "Ideal customer in plain language (one sentence)" },
                goals: { type: "string", description: "Most likely strategic goal based on the site content (one sentence)" },
              },
              required: ["businessName", "industry", "product", "targetCustomer", "goals"],
            },
          },
        }],
        tool_choice: { type: "function", function: { name: "business_profile" } },
      }),
    });

    if (!aiRes.ok) {
      if (aiRes.status === 429) return new Response(JSON.stringify({ error: "Rate limited" }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      if (aiRes.status === 402) return new Response(JSON.stringify({ error: "AI credits exhausted" }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      throw new Error("AI inference failed");
    }

    const aiData = await aiRes.json();
    const args = aiData.choices?.[0]?.message?.tool_calls?.[0]?.function?.arguments;
    const profile = args ? JSON.parse(args) : {};

    return new Response(JSON.stringify({ ...profile, url: formattedUrl }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("infer-business-context error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
