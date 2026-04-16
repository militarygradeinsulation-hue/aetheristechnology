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

    // Get pending emails that are due AND have pre-generated content
    const { data: pendingEmails, error: fetchErr } = await supabase
      .from("drip_emails")
      .select("*, drip_prospects(*)")
      .eq("status", "pending")
      .not("body_html", "is", null)
      .not("subject", "is", null)
      .lte("scheduled_for", new Date().toISOString())
      .order("scheduled_for", { ascending: true })
      .limit(30);

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

      // Skip if prospect has replied, unsubscribed, or bounced
      if (!prospect || ["replied", "unsubscribed", "bounced"].includes(prospect.status)) {
        await supabase.from("drip_emails").update({ status: "skipped" }).eq("id", email.id);
        skipped++;
        continue;
      }

      try {
        // Send via Outlook Gateway (content is pre-generated)
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
              body: { contentType: "HTML", content: email.body_html },
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
          .update({ status: "sent", sent_at: new Date().toISOString() })
          .eq("id", email.id);

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
