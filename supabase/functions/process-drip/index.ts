import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const OUTLOOK_GATEWAY = "https://connector-gateway.lovable.dev/microsoft_outlook";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const OUTLOOK_API_KEY = Deno.env.get("MICROSOFT_OUTLOOK_API_KEY");
    if (!OUTLOOK_API_KEY) throw new Error("MICROSOFT_OUTLOOK_API_KEY not configured");

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Get pending emails that are due
    const { data: pendingEmails, error: fetchErr } = await supabase
      .from("drip_emails")
      .select("*, drip_prospects(*), drip_sequences(*)")
      .eq("status", "pending")
      .lte("scheduled_for", new Date().toISOString())
      .order("scheduled_for", { ascending: true })
      .limit(30); // Rate limit: max 30 per run

    if (fetchErr) throw new Error(`Failed to fetch pending emails: ${fetchErr.message}`);
    if (!pendingEmails || pendingEmails.length === 0) {
      return new Response(JSON.stringify({ message: "No pending emails to process" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let sent = 0;
    let skipped = 0;
    let failed = 0;

    for (const email of pendingEmails) {
      const prospect = email.drip_prospects;
      const sequence = email.drip_sequences;

      // Skip if prospect has replied, unsubscribed, or bounced
      if (!prospect || ["replied", "unsubscribed", "bounced"].includes(prospect.status)) {
        await supabase
          .from("drip_emails")
          .update({ status: "skipped" })
          .eq("id", email.id);
        skipped++;
        continue;
      }

      try {
        const steps = (sequence?.steps as any[]) || [];
        const step = steps[email.step_index];
        if (!step) {
          await supabase.from("drip_emails").update({ status: "skipped" }).eq("id", email.id);
          skipped++;
          continue;
        }

        // Generate personalized email using AI
        const scraped = prospect.scraped_data || {};
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
                content: `You are writing cold outreach emails for Aetheris Technology, an Indianapolis-based strategic business architecture firm that builds AI-powered systems for small and mid-market companies. 

Tone: Direct, blunt, non-corporate. No fluff. You talk like a strategist, not a salesperson. Short paragraphs. Punchy sentences.

The email should feel like it came from a real person who actually looked at their business — not a template blast.`,
              },
              {
                role: "user",
                content: `Write email step ${email.step_index + 1} of a ${steps.length}-step sequence.

Step purpose: ${step.body_prompt}
Subject line guidance: ${step.subject_template}

Prospect info:
- Business: ${prospect.business_name || "Unknown"}
- Email: ${prospect.email}
- Industry: ${prospect.industry || "Unknown"}
- Location: ${prospect.location || "Unknown"}
- Role: ${scraped.role || "Unknown"}
- Context: ${scraped.context || "No additional context"}
- Website: ${prospect.website_url || "None"}

Return JSON with "subject" and "body_html" (use simple HTML with <p> tags, <br>, <b> — no fancy styling). Keep it under 200 words. Sign off as "— Joseph, Aetheris Technology".`,
              },
            ],
          }),
        });

        if (!aiRes.ok) {
          console.error(`AI failed for email ${email.id}:`, aiRes.status);
          await supabase.from("drip_emails").update({ status: "failed" }).eq("id", email.id);
          failed++;
          continue;
        }

        const aiData = await aiRes.json();
        let raw = aiData.choices?.[0]?.message?.content || "";
        raw = raw.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();

        let subject: string;
        let bodyHtml: string;
        try {
          const parsed = JSON.parse(raw);
          subject = parsed.subject;
          bodyHtml = parsed.body_html;
        } catch {
          // Fallback: use raw as body
          subject = step.subject_template || "Quick question";
          bodyHtml = `<p>${raw}</p>`;
        }

        // Send via Outlook Gateway
        const sendRes = await fetch(`${OUTLOOK_GATEWAY}/me/sendMail`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${LOVABLE_API_KEY}`,
            "X-Connection-Api-Key": OUTLOOK_API_KEY,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            message: {
              subject,
              body: { contentType: "HTML", content: bodyHtml },
              toRecipients: [
                { emailAddress: { address: prospect.email } },
              ],
            },
          }),
        });

        if (!sendRes.ok) {
          const errBody = await sendRes.text();
          console.error(`Outlook send failed for ${prospect.email} [${sendRes.status}]:`, errBody);
          await supabase.from("drip_emails").update({ status: "failed" }).eq("id", email.id);
          failed++;
          continue;
        }

        // Mark as sent
        await supabase
          .from("drip_emails")
          .update({
            status: "sent",
            sent_at: new Date().toISOString(),
            subject,
            body_html: bodyHtml,
          })
          .eq("id", email.id);

        // Schedule next step if available
        const nextIndex = email.step_index + 1;
        if (nextIndex < steps.length) {
          const nextStep = steps[nextIndex];
          const nextDate = new Date();
          nextDate.setDate(nextDate.getDate() + (nextStep.delay_days || 3));

          await supabase.from("drip_emails").insert({
            prospect_id: prospect.id,
            sequence_id: sequence.id,
            step_index: nextIndex,
            scheduled_for: nextDate.toISOString(),
            status: "pending",
          });
        }

        sent++;

        // Rate limit: 2 second delay between sends
        await new Promise((r) => setTimeout(r, 2000));
      } catch (emailErr) {
        console.error(`Error processing email ${email.id}:`, emailErr);
        await supabase.from("drip_emails").update({ status: "failed" }).eq("id", email.id);
        failed++;
      }
    }

    return new Response(
      JSON.stringify({ message: `Processed: ${sent} sent, ${skipped} skipped, ${failed} failed` }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("process-drip error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
