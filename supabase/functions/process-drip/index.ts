import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const OUTLOOK_GATEWAY = "https://connector-gateway.lovable.dev/microsoft_outlook";
const MAX_ATTEMPTS = 3;

function appendSignature(body: string, signature: string): string {
  if (!signature) return body;
  if (body.includes("aetheris.technology") || body.includes(signature.slice(0, 30))) return body;
  return `${body}\n${signature}`;
}

function classifyOutlookError(status: number, body: string): "hard" | "soft" {
  const lower = body.toLowerCase();
  if (status === 429) return "soft";
  if (status >= 500) return "soft";
  if (
    lower.includes("recipient") &&
    (lower.includes("rejected") || lower.includes("not found") || lower.includes("invalid"))
  ) return "hard";
  if (lower.includes("invalidrecipients") || lower.includes("submissionquotaexceeded")) return "hard";
  if (lower.includes("mailboxnotenabledforrest") || lower.includes("erroraccessdenied")) return "hard";
  if (status >= 400 && status < 500) return "hard";
  return "soft";
}

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

    const { data: settings } = await supabase
      .from("campaign_settings")
      .select("is_active, daily_limit, signature_html")
      .eq("id", 1)
      .maybeSingle();

    if (!settings?.is_active) {
      return new Response(JSON.stringify({ message: "Campaign is paused. Toggle it ON in admin to send." }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const DAILY_LIMIT = settings.daily_limit || 100;
    const signatureHtml: string = settings.signature_html || "";

    const todayMidnight = new Date();
    todayMidnight.setUTCHours(0, 0, 0, 0);

    const { count: sentToday, error: countErr } = await supabase
      .from("drip_emails")
      .select("id", { count: "exact", head: true })
      .eq("status", "sent")
      .gte("sent_at", todayMidnight.toISOString());

    if (countErr) throw new Error(`Failed to count today's sends: ${countErr.message}`);

    const remaining = DAILY_LIMIT - (sentToday || 0);
    if (remaining <= 0) {
      return new Response(JSON.stringify({ message: `Daily limit reached (${DAILY_LIMIT}). Sent today: ${sentToday}` }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const batchSize = Math.min(remaining, 25);

    const { data: pendingEmails, error: fetchErr } = await supabase
      .from("drip_emails")
      .select("*, drip_prospects(*)")
      .eq("status", "pending")
      .not("body_html", "is", null)
      .not("subject", "is", null)
      .lte("scheduled_for", new Date().toISOString())
      .order("scheduled_for", { ascending: true })
      .limit(batchSize);

    if (fetchErr) throw new Error(`Failed to fetch pending emails: ${fetchErr.message}`);
    if (!pendingEmails || pendingEmails.length === 0) {
      return new Response(JSON.stringify({ message: "No pending emails to process", sentToday, remaining }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let sent = 0;
    let skipped = 0;
    let failed = 0;
    let retried = 0;
    const bouncedProspectIds: string[] = [];

    for (const email of pendingEmails) {
      const prospect = email.drip_prospects;

      if (!prospect || ["replied", "unsubscribed", "bounced"].includes(prospect.status)) {
        await supabase.from("drip_emails").update({ status: "skipped" }).eq("id", email.id);
        skipped++;
        continue;
      }

      const nextAttempt = (email.attempt_count || 0) + 1;

      try {
        const sendRes = await fetch(`${OUTLOOK_GATEWAY}/me/sendMail`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${LOVABLE_API_KEY}`,
            "X-Connection-Api-Key": OUTLOOK_API_KEY,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            message: {
              subject: email.subject,
              body: { contentType: "HTML", content: appendSignature(email.body_html, signatureHtml) },
              toRecipients: [
                { emailAddress: { address: prospect.email } },
              ],
            },
          }),
        });

        if (!sendRes.ok) {
          const errBody = await sendRes.text();
          const status = sendRes.status;
          const errorMessage = `[${status}] ${errBody}`.slice(0, 2000);
          console.error(`Outlook send failed for ${prospect.email}:`, errorMessage);

          const kind = classifyOutlookError(status, errBody);

          if (kind === "soft" && nextAttempt < MAX_ATTEMPTS) {
            const retryAt = new Date(Date.now() + 60 * 60 * 1000).toISOString();
            await supabase.from("drip_emails").update({
              status: "pending",
              attempt_count: nextAttempt,
              scheduled_for: retryAt,
              error_message: errorMessage,
            }).eq("id", email.id);
            retried++;
          } else {
            await supabase.from("drip_emails").update({
              status: "failed",
              attempt_count: nextAttempt,
              error_message: errorMessage,
            }).eq("id", email.id);
            failed++;

            if (kind === "hard") {
              await supabase.from("drip_prospects")
                .update({ status: "bounced" })
                .eq("id", prospect.id);
              bouncedProspectIds.push(prospect.id);
            }
          }
          continue;
        }

        await supabase
          .from("drip_emails")
          .update({
            status: "sent",
            sent_at: new Date().toISOString(),
            attempt_count: nextAttempt,
            error_message: null,
          })
          .eq("id", email.id);

        sent++;
        await new Promise((r) => setTimeout(r, 2000));
      } catch (emailErr) {
        const msg = emailErr instanceof Error ? emailErr.message : "Unknown error";
        console.error(`Error processing email ${email.id}:`, msg);
        await supabase.from("drip_emails").update({
          status: "failed",
          attempt_count: nextAttempt,
          error_message: msg.slice(0, 2000),
        }).eq("id", email.id);
        failed++;
      }
    }

    // --- Auto-replace bounced prospects ---
    // Cancel all remaining pending emails for bounced prospects
    let cancelledEmails = 0;
    let replacementsGenerated = 0;

    if (bouncedProspectIds.length > 0) {
      for (const pid of bouncedProspectIds) {
        const { count } = await supabase
          .from("drip_emails")
          .update({ status: "skipped", error_message: "Prospect bounced – cancelled" })
          .eq("prospect_id", pid)
          .eq("status", "pending")
          .select("id", { count: "exact", head: true });
        cancelledEmails += count || 0;
      }

      // Auto-generate replacements: one new prospect per bounced one
      try {
        const genRes = await supabase.functions.invoke("generate-drip-batch", {
          body: { batchSize: bouncedProspectIds.length },
        });
        if (!genRes.error && genRes.data?.processed) {
          replacementsGenerated = genRes.data.processed;
        }
        console.log(`Auto-replaced ${bouncedProspectIds.length} bounced prospects: generated ${replacementsGenerated} replacements`);
      } catch (genErr) {
        console.error("Auto-replacement generation failed:", genErr);
      }
    }

    const bounceInfo = bouncedProspectIds.length > 0
      ? `, ${bouncedProspectIds.length} bounced (${cancelledEmails} emails cancelled, ${replacementsGenerated} replacements queued)`
      : "";

    return new Response(
      JSON.stringify({ message: `Processed: ${sent} sent, ${skipped} skipped, ${failed} failed, ${retried} retry-scheduled${bounceInfo}. Daily total: ${(sentToday || 0) + sent}/${DAILY_LIMIT}` }),
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
