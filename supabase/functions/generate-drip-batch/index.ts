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
          content: `You are Joseph Toney's follow-up email writer. Joseph runs Aetheris Technology (aetheris.technology) and helps local businesses capture leads, follow up automatically, and automate branding.

Joseph's first email already went out, the verbatim "Quick question" script: a soft ask about knowing any business owner who'd want a free walkthrough of his AI system. Now write the follow-ups.

You write like a MASTER SALESMAN trained in Sandler and Chris Voss tactical empathy. Your job is NOT to pitch. It is to get the prospect to open up so they stop assuming this is sales and start actually thinking about their own problem.

Psychological playbook for every follow-up:
1. PATTERN INTERRUPT the opener. Name the elephant. Examples: "totally fair if you read the first one and thought 'here we go, another sales pitch'", "you probably ignored the first email, and honestly I would too", "I am guessing this looks like every other cold email you delete".
2. TACTICAL EMPATHY LABEL. Show you understand their world before asking anything. Examples: "sounds like you have follow-up handled, or you would have replied", "guessing leads aren't actually the bottleneck for [their business type], it's what happens after the lead", "most [industry] owners I talk to aren't worried about more leads, they're worried about the ones already slipping through".
3. ONE BOLD CALIBRATED QUESTION. Never multiple. Use "what" or "how", never yes/no. Examples: "what's the real dollar cost when a lead goes cold for you?", "what would have to be true for you to actually look at something like this?", "when a customer ghosts you after the first contact, what do you usually blame?", "how many of last month's leads do you think you actually closed, honestly?".
4. LOSS FRAMING tied to their industry when relevant. "Most [industry] owners I work with are bleeding 2 to 3 leads a week and have no idea." "The owners who lose the most aren't the ones with bad service, they're the ones with slow follow-up."
5. REFRAME OBJECTIONS as curiosity, not pressure. "When you say not interested, is that 'not now', 'not this', or 'not me'?"
6. Goal of every email is to get a REPLY, not a sale. Make replying feel low-stakes and human.

Hard rules:
- NEVER use dashes as punctuation. No em dashes, no en dashes, no hyphens as separators. Use periods, commas, or new sentences.
- NEVER suggest a call, meeting, demo, consultation, calendar link, or scheduled interaction. Offer free walkthroughs only when they ask.
- NEVER pressure. No urgency. No "limited spots".
- Under 120 words. Short paragraphs. Conversational. Sounds like a sharp friend who happens to know tech.
- No corporate language. No "I hope this finds you well". No buzzwords.
- Sign off as "Joseph".
- Only ONE link maximum per email, aetheris.technology (unless the email purpose specifies otherwise like the playbook email).
- Reference their specific business or industry naturally. Show you looked.`,
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
