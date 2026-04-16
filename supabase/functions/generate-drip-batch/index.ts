import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const PLAYBOOK_URL =
  "https://ihdjpxhcaiaixmqxyqoe.supabase.co/storage/v1/object/public/playbooks/sales-process-reengineering.pdf";

// Email 1 is ALWAYS this exact template. No AI personalization.
const EMAIL_1_SUBJECT = "Quick question";
const EMAIL_1_BODY_HTML = `<p>Quick question.</p>
<p>I have been building a simple AI system that helps local businesses capture leads, follow up automatically, and automate branding so they stop losing customers.</p>
<p>I am doing a few free walkthroughs while I dial the process in, and I wanted to ask if you know any business owner who might be open to a try it out and a quick conversation for feedback about it.</p>
<p>No pressure at all if not. Just figured I would ask.</p>
<p>Joseph Toney</p>
<p><a href="https://aetheris.technology/">aetheris.technology</a><br>
Website: theaiformarketing.com<br>
<a href="https://linkedin.com/in/aisystemsarchitect">linkedin.com/in/aisystemsarchitect</a></p>`;

async function generateFollowUpEmails(prospect: any, steps: any[], apiKey: string) {
  // We only AI-generate emails 2..N (index 1..N-1). Email 1 is fixed.
  const followUps = steps.slice(1);
  if (followUps.length === 0) return [];

  const scraped = prospect.scraped_data || {};
  const stepsDescription = followUps.map((s: any, i: number) =>
    `Email ${i + 2}: ${s.body_prompt}`
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
          content: `You write genuine cold outreach follow-up emails for Joseph Toney at Aetheris Technology (aetheris.technology).

Joseph's first email already went out. It was a soft ask: "I built a simple AI system for local businesses. Doing free walkthroughs for feedback. Know anyone who might want to try?" Signed Joseph Toney with links to aetheris.technology, theaiformarketing.com, and linkedin.com/in/aisystemsarchitect.

Now write the follow-ups.

Core voice and rules:
1. NEVER use dashes as punctuation. No em dashes, en dashes, or hyphens used as separators. Use periods, commas, or new sentences instead.
2. NEVER suggest a call, meeting, chat, demo, consultation, or any scheduled interaction. Offer free walkthroughs or playbooks. Let them come to you.
3. NEVER pressure. No urgency. No "limited time." No "don't miss out."
4. You are NOT selling. You are offering free help while Joseph dials the process in.
5. Under 120 words. Short paragraphs. Conversational. Like a text from a friend who happens to know tech.
6. No corporate language. No "I hope this finds you well." No buzzwords.
7. Sign off as "Joseph" or "Joseph Toney"
8. Only ONE link maximum per email, only aetheris.technology (unless the email purpose specifies otherwise, like the playbook email).
9. Reference their specific business or industry naturally. Show you looked at what they do.
10. Each follow-up should make them think "this person actually gets my problems."`,
        },
        {
          role: "user",
          content: `Write ${followUps.length} follow-up emails as a JSON array. Each element must have "subject" and "body_html" (use simple HTML with <p> tags only, no links in HTML unless the email purpose specifies a link).

Prospect info:
Business: ${prospect.business_name || "Unknown"}
Email: ${prospect.email}
Industry: ${prospect.industry || "Unknown"}
Location: ${prospect.location || "Unknown"}
Phone: ${scraped.phone || "Unknown"}
Context: ${scraped.context || "No additional context"}

Email purposes:
${stepsDescription}

For Email 3 specifically: Offer them a free playbook called "The Sales Process Reengineering Playbook" and include this link in the HTML: ${PLAYBOOK_URL}. Frame it as "I made this thing, thought you might find it useful, no strings."

Return ONLY a JSON array of ${followUps.length} objects with "subject" and "body_html". No dashes anywhere. Sign off as just "Joseph".`,
        },
      ],
    }),
  });

  if (!res.ok) {
    console.error("Follow-up generation failed:", res.status);
    return null;
  }

  const data = await res.json();
  let raw = data.choices?.[0]?.message?.content || "";
  raw = raw.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
  try {
    const emails = JSON.parse(raw);
    if (Array.isArray(emails) && emails.length === followUps.length) return emails;
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

    const chunkSize = Math.min(concurrency, 5);
    for (let c = 0; c < prospects.length; c += chunkSize) {
      const chunk = prospects.slice(c, c + chunkSize);
      const results = await Promise.allSettled(
        chunk.map(async (prospect) => {
          // Generate only emails 2..N
          const followUps = await generateFollowUpEmails(prospect, steps, LOVABLE_API_KEY);
          if (followUps === null) throw new Error("generation failed");

          const emailRows = steps.map((step: any, i: number) => {
            const scheduledFor = new Date();
            scheduledFor.setDate(scheduledFor.getDate() + (step.delay_days || 0));

            // Email 1 is ALWAYS the verbatim template
            const subject = i === 0 ? EMAIL_1_SUBJECT : followUps[i - 1].subject;
            const body_html = i === 0 ? EMAIL_1_BODY_HTML : followUps[i - 1].body_html;

            return {
              prospect_id: prospect.id,
              sequence_id: seqData.id,
              step_index: i,
              scheduled_for: scheduledFor.toISOString(),
              status: "pending",
              subject,
              body_html,
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
