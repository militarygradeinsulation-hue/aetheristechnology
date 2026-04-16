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

    // Get all active prospects' emails for matching
    const { data: activeProspects } = await supabase
      .from("drip_prospects")
      .select("id, email")
      .eq("status", "active");

    if (!activeProspects || activeProspects.length === 0) {
      return new Response(JSON.stringify({ message: "No active prospects to check" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const prospectMap = new Map(
      activeProspects.map((p: any) => [p.email.toLowerCase(), p.id])
    );

    // Read recent inbox messages (last 24 hours)
    const since = new Date();
    since.setHours(since.getHours() - 24);
    const filterDate = since.toISOString();

    const inboxRes = await fetch(
      `${OUTLOOK_GATEWAY}/me/messages?$top=50&$orderby=receivedDateTime desc&$filter=receivedDateTime ge ${filterDate}&$select=from,subject,receivedDateTime,id`,
      {
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "X-Connection-Api-Key": OUTLOOK_API_KEY,
        },
      }
    );

    if (!inboxRes.ok) {
      const errText = await inboxRes.text();
      console.error("Outlook inbox read failed:", inboxRes.status, errText);
      throw new Error(`Outlook API error: ${inboxRes.status}`);
    }

    const inboxData = await inboxRes.json();
    const messages = inboxData.value || [];

    let repliesFound = 0;

    for (const msg of messages) {
      const senderEmail = msg.from?.emailAddress?.address?.toLowerCase();
      if (!senderEmail) continue;

      const prospectId = prospectMap.get(senderEmail);
      if (!prospectId) continue;

      // This prospect replied! Mark them and cancel pending emails
      await supabase
        .from("drip_prospects")
        .update({ status: "replied" })
        .eq("id", prospectId);

      // Cancel all pending emails for this prospect
      await supabase
        .from("drip_emails")
        .update({ status: "skipped" })
        .eq("prospect_id", prospectId)
        .eq("status", "pending");

      repliesFound++;
      console.log(`Reply detected from ${senderEmail} — sequence stopped`);
    }

    return new Response(
      JSON.stringify({
        message: `Checked ${messages.length} inbox messages, found ${repliesFound} replies from active prospects`,
        replies_found: repliesFound,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("check-drip-replies error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
