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
    console.log("Firecrawl search raw response:", JSON.stringify(data).substring(0, 2000));
    const items = Array.isArray(data?.data) ? data.data : Array.isArray(data?.data?.web) ? data.data.web : Array.isArray(data?.results) ? data.results : [];
    console.log(`Firecrawl returned ${items.length} items`);
    if (items.length > 0) console.log("First item keys:", Object.keys(items[0]));
    for (const r of items) {
      const md = r?.markdown || r?.content || r?.description || "";
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
          content: `You write genuine cold outreach emails for Joseph Toney at Aetheris Technology (aetheris.technology). He built a simple AI system that helps local businesses capture leads, follow up automatically, and automate branding so they stop losing customers.

Core voice and rules:
1. NEVER use dashes as punctuation. No em dashes, en dashes, or hyphens used as separators. Use periods, commas, or new sentences instead.
2. NEVER suggest a call, meeting, chat, demo, consultation, or any scheduled interaction. Instead, ask if they know anyone who might want to try it, or offer a free walkthrough. Let them come to you.
3. NEVER pressure. No urgency. No "limited time." No "don't miss out." No "act now."
4. You are NOT selling. You are offering free walkthroughs while Joseph dials the process in. Frame it as seeking feedback, not closing a deal.
5. Under 120 words. Short paragraphs. Conversational. Sounds like a text from a friend who happens to know tech.
6. No corporate language. No "I hope this finds you well." No buzzwords. No "synergy" or "leverage." No "revolutionize" or "transform."
7. Sign off simply as "Joseph" or "Joseph Toney"
8. Only include ONE link maximum per email, and only aetheris.technology. Never include multiple links or social profiles.
9. The angle: "I built something that solves a specific problem you probably have. I am doing free walkthroughs for feedback. No pressure if not."
10. Write like a real person texting a neighbor, not like a marketer running a sequence.
11. Reference their specific business or industry naturally. Show you looked at what they do.
12. First email should be the softest. Ask if they know someone, not if they want it themselves. Later emails can be more direct but never pushy.`,
        },
        {
          role: "user",
          content: `Write all ${steps.length} emails for this prospect as a JSON array. Each element must have "subject" and "body_html" (use simple HTML with <p> tags only, no links in HTML).

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

Rules for the sequence:
- Email 1: Soft ask. "Do you know any business owner who might want to try this?" Never pitch them directly.
- Email 2: Share a quick story about a real pain point in their industry and how automation solved it. Still casual.
- Email 3: Offer something free and specific to their business. A quick audit, a playbook, something they can use immediately.
- Later emails: Gradually more direct but always give before you ask. Every email should make them think "this person actually gets my problems."

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
      const email = contact.email?.toLowerCase().trim();
      if (!email || email.length < 5 || !email.includes("@") || existingSet.has(email)) continue;

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
