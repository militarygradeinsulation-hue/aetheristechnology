import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface FieldSpec { name: string; label: string; type: string }

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { url, fields, toolTitle } = await req.json() as {
      url: string; fields: FieldSpec[]; toolTitle?: string;
    };
    if (!url || !Array.isArray(fields) || fields.length === 0) {
      return new Response(JSON.stringify({ error: "url and fields required" }), {
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

    // Scrape
    const scrapeRes = await fetch("https://api.firecrawl.dev/v2/scrape", {
      method: "POST",
      headers: { Authorization: `Bearer ${FIRECRAWL_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({ url: formattedUrl, formats: ["markdown"], onlyMainContent: true }),
    });
    const scrapeData = await scrapeRes.json();
    const markdown: string = scrapeData?.data?.markdown || scrapeData?.markdown || "";
    const metadata = scrapeData?.data?.metadata || scrapeData?.metadata || {};
    if (!markdown) {
      return new Response(JSON.stringify({ error: "Could not read site content" }), {
        status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Build dynamic JSON schema based on requested fields
    const properties: Record<string, { type: string; description: string }> = {};
    for (const f of fields) {
      properties[f.name] = {
        type: "string",
        description: `Value for "${f.label}" (input type: ${f.type}). If unknown from the site, return an empty string.`,
      };
    }

    const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: "You extract business intake data from a scraped website to pre-fill a forensic diagnostic form. Be concrete, concise, no marketing fluff. If a field is not inferable, return empty string." },
          { role: "user", content: `Tool: ${toolTitle || "forensic intake"}
URL: ${formattedUrl}
Title: ${metadata.title || ""}
Description: ${metadata.description || ""}

SCRAPED CONTENT:
${markdown.slice(0, 10000)}

Fill the fields. For URL fields, return the canonical company URL. For multi-line fields (descriptions, lists), keep under ~3 short sentences. Always include the websiteUrl field set to ${formattedUrl} if requested.` },
        ],
        tools: [{
          type: "function",
          function: {
            name: "fill_intake",
            description: "Return inferred values for each requested intake field",
            parameters: { type: "object", properties, required: fields.map(f => f.name) },
          },
        }],
        tool_choice: { type: "function", function: { name: "fill_intake" } },
      }),
    });

    if (!aiRes.ok) {
      if (aiRes.status === 429) return new Response(JSON.stringify({ error: "Rate limited" }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      if (aiRes.status === 402) return new Response(JSON.stringify({ error: "AI credits exhausted" }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      throw new Error("AI inference failed");
    }

    const aiData = await aiRes.json();
    const args = aiData.choices?.[0]?.message?.tool_calls?.[0]?.function?.arguments;
    const values = args ? JSON.parse(args) : {};

    return new Response(JSON.stringify({ values, url: formattedUrl }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("autofill-intake-from-url error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
