import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { industry, location, urls, searchQuery } = await req.json();

    const FIRECRAWL_API_KEY = Deno.env.get("FIRECRAWL_API_KEY");
    if (!FIRECRAWL_API_KEY) throw new Error("FIRECRAWL_API_KEY not configured");

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const scrapedContents: { url: string; markdown: string }[] = [];

    // Strategy 1: Scrape provided URLs directly
    if (urls && Array.isArray(urls) && urls.length > 0) {
      for (const url of urls.slice(0, 10)) {
        try {
          const res = await fetch("https://api.firecrawl.dev/v2/scrape", {
            method: "POST",
            headers: {
              Authorization: `Bearer ${FIRECRAWL_API_KEY}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              url,
              formats: ["markdown"],
              onlyMainContent: false,
            }),
          });
          const data = await res.json();
          const md = data?.data?.markdown || data?.markdown || "";
          if (md.length > 50) {
            scrapedContents.push({ url, markdown: md.substring(0, 6000) });
          }
        } catch (e) {
          console.error(`Failed to scrape ${url}:`, e);
        }
      }
    }

    // Strategy 2: Search for businesses by industry/location
    if (searchQuery || (industry && location)) {
      const query = searchQuery || `${industry} businesses in ${location} contact email`;
      try {
        const res = await fetch("https://api.firecrawl.dev/v2/search", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${FIRECRAWL_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            query,
            limit: 10,
            scrapeOptions: { formats: ["markdown"] },
          }),
        });
        const data = await res.json();
        const results = data?.data || [];
        for (const r of results) {
          const md = r.markdown || "";
          if (md.length > 50) {
            scrapedContents.push({ url: r.url || "", markdown: md.substring(0, 6000) });
          }
        }
      } catch (e) {
        console.error("Search failed:", e);
      }
    }

    if (scrapedContents.length === 0) {
      return new Response(JSON.stringify({ error: "No content scraped", prospects: [] }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Use AI to extract business contacts from all scraped content
    const combinedContent = scrapedContents
      .map((s, i) => `--- SOURCE ${i + 1}: ${s.url} ---\n${s.markdown}`)
      .join("\n\n");

    const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "system",
            content: "You are a data extraction expert. Extract all publicly visible business contact emails from the provided website content. Only include emails that appear to be business/professional emails (not generic like info@ or noreply@). Return structured data.",
          },
          {
            role: "user",
            content: `Extract business contacts from these scraped websites. For each unique email found, extract the business name, the person's role if visible, industry, location, and any relevant context about what the business does.

${combinedContent}

Use the extract_contacts function to return your findings.`,
          },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "extract_contacts",
              description: "Return extracted business contacts",
              parameters: {
                type: "object",
                properties: {
                  contacts: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        email: { type: "string" },
                        business_name: { type: "string" },
                        role: { type: "string" },
                        industry: { type: "string" },
                        location: { type: "string" },
                        context: { type: "string", description: "Brief summary of what the business does" },
                        source_url: { type: "string" },
                        phone: { type: "string" },
                      },
                      required: ["email"],
                    },
                  },
                },
                required: ["contacts"],
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "extract_contacts" } },
      }),
    });

    if (!aiRes.ok) {
      const errText = await aiRes.text();
      console.error("AI extraction failed:", aiRes.status, errText);
      throw new Error("AI extraction failed");
    }

    const aiData = await aiRes.json();
    let contacts: any[] = [];
    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
    if (toolCall?.function?.arguments) {
      try {
        const parsed = JSON.parse(toolCall.function.arguments);
        contacts = parsed.contacts || [];
      } catch (e) {
        console.error("Failed to parse AI response:", e);
      }
    }

    if (contacts.length === 0) {
      return new Response(JSON.stringify({ message: "No contacts found", prospects: [] }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get existing emails for dedup
    const emails = contacts.map((c: any) => c.email.toLowerCase());
    const { data: existing } = await supabase
      .from("drip_prospects")
      .select("email")
      .in("email", emails);
    const existingSet = new Set((existing || []).map((e: any) => e.email));

    // Get default active sequence
    const { data: seqData } = await supabase
      .from("drip_sequences")
      .select("id, steps")
      .eq("is_active", true)
      .limit(1)
      .single();

    const insertedProspects: any[] = [];

    for (const contact of contacts) {
      const email = contact.email.toLowerCase().trim();
      if (existingSet.has(email)) continue;

      const prospect = {
        email,
        business_name: contact.business_name || null,
        website_url: contact.source_url || null,
        industry: contact.industry || industry || null,
        location: contact.location || location || null,
        scraped_data: {
          role: contact.role || null,
          phone: contact.phone || null,
          context: contact.context || null,
        },
        source_url: contact.source_url || null,
        status: "new",
      };

      const { data: inserted, error } = await supabase
        .from("drip_prospects")
        .insert(prospect)
        .select()
        .single();

      if (error) {
        console.error(`Failed to insert ${email}:`, error);
        continue;
      }

      insertedProspects.push(inserted);

      // Auto-assign to default sequence
      if (seqData && inserted) {
        const steps = seqData.steps as any[];
        if (steps.length > 0) {
          const firstStep = steps[0];
          const scheduledFor = new Date();
          scheduledFor.setDate(scheduledFor.getDate() + (firstStep.delay_days || 0));

          await supabase.from("drip_emails").insert({
            prospect_id: inserted.id,
            sequence_id: seqData.id,
            step_index: 0,
            scheduled_for: scheduledFor.toISOString(),
            status: "pending",
          });

          // Update prospect status to active
          await supabase
            .from("drip_prospects")
            .update({ status: "active" })
            .eq("id", inserted.id);
        }
      }
    }

    return new Response(
      JSON.stringify({
        message: `Found ${contacts.length} contacts, inserted ${insertedProspects.length} new prospects`,
        prospects: insertedProspects,
        duplicates_skipped: contacts.length - insertedProspects.length,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("scrape-leads error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
