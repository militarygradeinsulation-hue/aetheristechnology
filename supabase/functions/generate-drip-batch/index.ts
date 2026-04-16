import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

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
Phone: ${scraped.phone || "Unknown"}
Context: ${scraped.context || "No additional context"}

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
    const { batchSize = 10, concurrency = 5 } = await req.json().catch(() => ({}));

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Get active sequence
    const { data: seqData, error: seqErr } = await supabase
      .from("drip_sequences")
      .select("id, steps")
      .eq("is_active", true)
      .limit(1)
      .single();

    if (seqErr || !seqData) {
      return new Response(JSON.stringify({ error: "No active drip sequence found" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Pick prospects with status 'imported' that have no drip emails yet
    const { data: prospects, error: prospErr } = await supabase
      .from("drip_prospects")
      .select("*")
      .eq("status", "imported")
      .limit(Math.min(batchSize, 100));

    if (prospErr || !prospects || prospects.length === 0) {
      return new Response(JSON.stringify({ message: "No imported prospects to process", processed: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const steps = seqData.steps as any[];
    let processed = 0;
    let failed = 0;

    // Process in parallel chunks
    const chunkSize = Math.min(concurrency, 5);
    for (let c = 0; c < prospects.length; c += chunkSize) {
      const chunk = prospects.slice(c, c + chunkSize);
      const results = await Promise.allSettled(
        chunk.map(async (prospect) => {
          const generatedEmails = await generateAllEmails(prospect, steps, LOVABLE_API_KEY);
          if (!generatedEmails) throw new Error("generation failed");

          const emailRows = steps.map((step: any, i: number) => {
            const scheduledFor = new Date();
            scheduledFor.setDate(scheduledFor.getDate() + (step.delay_days || 0));
            return {
              prospect_id: prospect.id,
              sequence_id: seqData.id,
              step_index: i,
              scheduled_for: scheduledFor.toISOString(),
              status: "pending",
              subject: generatedEmails[i].subject,
              body_html: generatedEmails[i].body_html,
            };
          });

          await supabase.from("drip_emails").insert(emailRows);
          await supabase.from("drip_prospects").update({ status: "active" }).eq("id", prospect.id);
        })
      );

      for (const r of results) {
        if (r.status === "fulfilled") processed++;
        else failed++;
      }
    }

    return new Response(
      JSON.stringify({
        message: `Processed ${processed} prospects, ${failed} failed`,
        processed,
        failed,
        remaining_imported: "check database",
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("generate-drip-batch error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
