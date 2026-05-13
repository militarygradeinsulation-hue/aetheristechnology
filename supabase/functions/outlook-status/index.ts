// Returns the calling rep's Outlook connection status, and supports disconnect.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.86.0";
import { verifyPortalToken, getPortalTokenFromRequest } from "../_shared/portal-token.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-portal-token",
};
const json = (s: number, b: unknown) => new Response(JSON.stringify(b), { status: s, headers: { ...corsHeaders, "Content-Type": "application/json" } });

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SVC = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const claims = await verifyPortalToken(getPortalTokenFromRequest(req), SVC);
    if (!claims) return json(401, { error: "Unauthorized" });

    const sb = createClient(SUPABASE_URL, SVC);
    const body = await req.json().catch(() => ({}));
    const action = String(body.action || "status");

    if (action === "disconnect") {
      const { error } = await sb.from("outlook_oauth_tokens").delete().eq("rep_code", claims.code);
      if (error) return json(500, { error: error.message });
      return json(200, { ok: true });
    }

    // status
    const configured = !!Deno.env.get("MS_OAUTH_CLIENT_ID");
    const { data, error } = await sb
      .from("outlook_oauth_tokens")
      .select("outlook_email, expires_at, connected_at, refresh_token, scope")
      .eq("rep_code", claims.code)
      .maybeSingle();
    if (error) return json(500, { error: error.message });

    return json(200, {
      configured,
      connected: !!data,
      outlook_email: data?.outlook_email || null,
      expires_at: data?.expires_at || null,
      connected_at: data?.connected_at || null,
      has_refresh_token: !!data?.refresh_token,
      scope: data?.scope || null,
    });
  } catch (e: any) {
    console.error("outlook-status", e);
    return json(500, { error: String(e?.message || e) });
  }
});
