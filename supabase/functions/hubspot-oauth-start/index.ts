import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// ---------------------------------------------------------------------------
// HubSpot OAuth scopes — exact list approved by user.
// `scope=`          -> strict required (must be granted; install fails otherwise)
// `optional_scope=` -> granted when portal tier allows; silently skipped if not
// ---------------------------------------------------------------------------

const REQUIRED_SCOPES = [
  "crm.objects.contacts.read",
  "crm.objects.contacts.write",
  "crm.objects.deals.read",
  "crm.objects.deals.write",
  "crm.objects.companies.read",
  "crm.objects.companies.write",
  "crm.objects.owners.read",
  "automation",
  "oauth",
];

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const clientId = Deno.env.get("HUBSPOT_CLIENT_ID");
    if (!clientId) {
      return new Response(
        JSON.stringify({ error: "HubSpot integration not yet configured. Add HUBSPOT_CLIENT_ID to enable." }),
        { status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Missing auth header");

    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: userData, error: userErr } = await supabase.auth.getUser();
    if (userErr || !userData.user) throw new Error("Not authenticated");

    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { data: account } = await admin
      .from("accounts")
      .upsert({ user_id: userData.user.id }, { onConflict: "user_id" })
      .select()
      .single();

    const nonce = crypto.randomUUID();
    const state = btoa(`${account.id}:${nonce}`);

    const redirectUri = `${Deno.env.get("SUPABASE_URL")}/functions/v1/hubspot-oauth-callback`;

    // Strict required scopes only — no optional_scope param.
    const required = Array.from(new Set(REQUIRED_SCOPES)).join(" ");

    const authorizeUrl =
      `https://app.hubspot.com/oauth/authorize?client_id=${clientId}` +
      `&redirect_uri=${encodeURIComponent(redirectUri)}` +
      `&scope=${encodeURIComponent(required)}` +
      `&state=${encodeURIComponent(state)}`;

    console.log("[hubspot-oauth-start] authorize URL built", {
      client_id_preview: clientId.slice(0, 8),
      redirect_uri: redirectUri,
      account_id: account.id,
      required_count: required.split(" ").length,
      url_bytes: authorizeUrl.length,
    });

    return new Response(JSON.stringify({ authorizeUrl }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
