// Initiates Google OAuth for the calling rep (Calendar + Gmail scopes).
// Returns the consent URL — the client opens it in a popup.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.86.0";
import { verifyPortalToken, getPortalTokenFromRequest } from "../_shared/portal-token.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-portal-token, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};
const json = (s: number, b: unknown) => new Response(JSON.stringify(b), { status: s, headers: { ...corsHeaders, "Content-Type": "application/json" } });

const SCOPES = [
  "openid",
  "email",
  "profile",
  "https://www.googleapis.com/auth/calendar",
  "https://www.googleapis.com/auth/gmail.modify",
];

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SVC = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const CLIENT_ID = Deno.env.get("GOOGLE_OAUTH_CLIENT_ID");
    if (!CLIENT_ID) return json(500, { error: "GOOGLE_OAUTH_CLIENT_ID not configured" });

    const claims = await verifyPortalToken(getPortalTokenFromRequest(req), SVC);
    if (!claims) return json(401, { error: "Unauthorized" });

    const sb = createClient(SUPABASE_URL, SVC);
    const state = crypto.randomUUID() + crypto.randomUUID().replace(/-/g, "");
    const { error } = await sb.from("google_oauth_state").insert({ state, rep_code: claims.code });
    if (error) return json(500, { error: error.message });

    const redirectUri = `${SUPABASE_URL}/functions/v1/google-oauth-callback`;
    const params = new URLSearchParams({
      client_id: CLIENT_ID,
      response_type: "code",
      redirect_uri: redirectUri,
      scope: SCOPES.join(" "),
      state,
      access_type: "offline",
      prompt: "consent",
    });
    const url = `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
    return json(200, { url });
  } catch (e: any) {
    console.error("google-oauth-start", e);
    return json(500, { error: String(e?.message || e) });
  }
});
