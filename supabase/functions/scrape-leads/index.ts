import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

async function scrapeUrls(urls: string[], apiKey: string) {
  const results: { url: string; markdown: string }[] = [];
  for (const url of urls.slice(0, 10)) {
    try {
      const res = await fetch("https://api.firecrawl.dev/v2/scrape", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ url, formats: ["markdown"], onlyMainContent: false }),
      });
      const data = await res.json();
      const md = data?.data?.markdown || data?.markdown || "";
      if (md.length > 50) results.push({ url, markdown: md.substring(0, 6000) });
    } catch (e) {
      console.error(`Failed to scrape ${url}:`, e);
    }
  }
  return results;
}

async function searchBusinesses(query: string, apiKey: string) {
  const results: { url: string; markdown: string }[] = [];
  try {
    const res = await fetch("https://api.firecrawl.dev/v2/search", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ query, limit: 10, scrapeOptions: { formats: ["markdown"] } }),
    });
    const data = await res.json();
    for (const r of data?.data || []) {
      const md = r.markdown || "";
      if (md.length > 50) results.push({ url: r.url || "", markdown: md.substring(0, 6000) });
    }
  } catch (e) {
    console.error("Search failed:", e);
  }
  return results;
}

async function extractContacts(content: string, apiKey: string) {
  const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash-lite",
      messages: [
        {
          role: "system",
          content: "You are a data extraction expert. Extract all publicly visible business contact emails from the provided website content. Only include emails that appear to be business/professional emails (not generic like info@ or noreply@). Return structured data.",
        },
        {
          role: "user",
          content: `Extract business contacts from these scraped websites. For each unique email found, extract the business name, the person's role if visible, industry, location, and any relevant context about what the business does.\n\n${content}\n\nUse the extract_contacts function to return your findings.`,
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
                      context: { type: "string" },
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

  if (!res.ok) {
    console.error("AI extraction failed:", res.status, await res.text());
    return [];
  }

  const data = await res.json();
  const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
  if (toolCall?.function?.arguments) {
    try {
      return JSON.parse(toolCall.function.arguments).contacts || [];
    } catch { return []; }
  }
  return [];
}

async function generateAllEmails(prospect: any, steps: any[], apiKey: string) {
  const scraped = prospect.scraped_data || {};
  const stepsDescription = steps.map((s: any, i: number) =>
    `Email ${i + 1}: ${s.body_prompt}`
  ).join("\n");

  const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash-lite",
      messages: [
        {
          role: "system",
          content: `You write genuine emails for Joseph at Aetheris Technology, an Indianapolis firm that builds AI powered systems for small and mid market companies.

Rules you must follow:
1. NEVER use dashes as punctuation. No em dashes, en dashes, or hyphens used as separators. Use periods, commas, or new sentences instead.
2. NEVER suggest a call, meeting, chat, demo, consultation, or any scheduled interaction. The prospect stays in control.
3. NEVER pressure. No urgency. No "limited time." No "don't miss out." No "act now."
4. You are NOT selling. You are giving. Every email offers genuine value with zero strings attached.
5. The hook is always: a personal story about a real pain point, the solution, and a free personalized playbook they can use immediately.
6. Under 150 words. Short paragraphs. Conversational. Warm but direct.
7. No corporate language. No "I hope this finds you well." No buzzwords. No "synergy" or "leverage."
8. Sign off simply as "Joseph"
9. The energy of every email: "Welcome to the easiest day you've had in business."
10. Write like a real person who genuinely wants to help, not like a marketer running a sequence.`,
        },
        {
          role: "user",
          content: `Write all ${steps.length} emails for this prospect as a JSON array. Each element must have "subject" and "body_html" (use simple HTML with <p> tags only).

Prospect info:
Business: ${prospect.business_name || "Unknown"}
Email: ${prospect.email}
Industry: ${prospect.industry || "Unknown"}
Location: ${prospect.location || "Unknown"}
Role: ${scraped.role || "Unknown"}
Context: ${scraped.context || "No additional context"}
Website: ${prospect.website_url || "None"}

Email purposes:
${stepsDescription}

Return ONLY a JSON array of ${steps.length} objects with "subject" and "body_html". No dashes anywhere. Sign off as just "Joseph".`,
        },
      ],
    }),
  });

  if (!res.ok) {
    console.error("Batch email generation failed:", res.status);
    return null;
  }

  const data = await res.json();
  let raw = data.choices?.[0]?.message?.content || "";
  raw = raw.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
  try {
    const emails = JSON.parse(raw);
    if (Array.isArray(emails) && emails.length === steps.length) return emails;
  } catch { /* fall through */ }
  return null;
}

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

    // Scrape content
    const scrapedContents: { url: string; markdown: string }[] = [];

    if (urls && Array.isArray(urls) && urls.length > 0) {
      scrapedContents.push(...await scrapeUrls(urls, FIRECRAWL_API_KEY));
    }

    if (searchQuery || (industry && location)) {
      const query = searchQuery || `${industry} businesses in ${location} contact email`;
      scrapedContents.push(...await searchBusinesses(query, FIRECRAWL_API_KEY));
    }

    if (scrapedContents.length === 0) {
      return new Response(JSON.stringify({ error: "No content scraped", prospects: [] }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Extract contacts via AI
    const combinedContent = scrapedContents
      .map((s, i) => `--- SOURCE ${i + 1}: ${s.url} ---\n${s.markdown}`)
      .join("\n\n");

    const contacts = await extractContacts(combinedContent, LOVABLE_API_KEY);

    if (contacts.length === 0) {
      return new Response(JSON.stringify({ message: "No contacts found", prospects: [] }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Dedup against existing
    const emails = contacts.map((c: any) => c.email.toLowerCase());
    const { data: existing } = await supabase
      .from("drip_prospects")
      .select("email")
      .in("email", emails);
    const existingSet = new Set((existing || []).map((e: any) => e.email));

    // Get active sequence
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

      // Batch generate all emails in one AI call
      if (seqData && inserted) {
        const steps = seqData.steps as any[];
        const generatedEmails = await generateAllEmails(inserted, steps, LOVABLE_API_KEY);

        if (generatedEmails) {
          for (let i = 0; i < steps.length; i++) {
            const scheduledFor = new Date();
            scheduledFor.setDate(scheduledFor.getDate() + (steps[i].delay_days || 0));

            await supabase.from("drip_emails").insert({
              prospect_id: inserted.id,
              sequence_id: seqData.id,
              step_index: i,
              scheduled_for: scheduledFor.toISOString(),
              status: "pending",
              subject: generatedEmails[i].subject,
              body_html: generatedEmails[i].body_html,
            });
          }

          await supabase
            .from("drip_prospects")
            .update({ status: "active" })
            .eq("id", inserted.id);
        }
      }

      insertedProspects.push(inserted);
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
