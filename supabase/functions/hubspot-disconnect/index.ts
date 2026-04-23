import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Missing auth header");

    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userErr } = await supabase.auth.getUser();
    if (userErr || !userData.user) throw new Error("Not authenticated");

    const { account_id } = await req.json();
    if (!account_id) throw new Error("Missing account_id");

    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    // Verify ownership
    const { data: account } = await admin.from("accounts").select("user_id, hubspot_refresh_token_encrypted").eq("id", account_id).single();
    if (!account || account.user_id !== userData.user.id) throw new Error("Account not found");

    const encryptionKey = Deno.env.get("HUBSPOT_TOKEN_ENCRYPTION_KEY");
    if (account.hubspot_refresh_token_encrypted && encryptionKey) {
      const { data: refreshToken } = await admin.rpc("decrypt_token", {
        _ciphertext: account.hubspot_refresh_token_encrypted,
        _key: encryptionKey,
      });
      if (refreshToken) {
        // Best-effort revoke
        await fetch(`https://api.hubapi.com/oauth/v1/refresh-tokens/${refreshToken}`, { method: "DELETE" }).catch(() => {});
      }
    }

    await admin
      .from("accounts")
      .update({
        hubspot_portal_id: null,
        hubspot_access_token_encrypted: null,
        hubspot_refresh_token_encrypted: null,
        hubspot_access_token_expires_at: null,
        hubspot_connected_at: null,
        last_sync_status: null,
        last_sync_error: null,
        sync_progress: {},
      })
      .eq("id", account_id);

    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
