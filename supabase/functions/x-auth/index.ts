import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.86.0";
import { verifyAdminToken, getAdminTokenFromRequest } from "../_shared/admin-token.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-admin-token",
};

const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { ...corsHeaders, "Content-Type": "application/json" } });

function base64url(bytes: Uint8Array): string {
  let str = btoa(String.fromCharCode(...bytes));
  return str.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function randomString(byteLen: number): string {
  const bytes = new Uint8Array(byteLen);
  crypto.getRandomValues(bytes);
  return base64url(bytes);
}

async function sha256base64url(input: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(input));
  return base64url(new Uint8Array(digest));
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const ok = await verifyAdminToken(getAdminTokenFromRequest(req), serviceKey);
    if (!ok) return json({ error: "Unauthorized" }, 401);
    const admin = createClient(supabaseUrl, serviceKey);

    const clientId = Deno.env.get("X_CLIENT_ID");
    const clientSecret = Deno.env.get("X_CLIENT_SECRET");
    if (!clientId) return json({ error: "X_CLIENT_ID is not configured" }, 500);

    const body = await req.json();
    const { action, redirect_uri } = body;

    if (action === "authorize") {
      if (!redirect_uri) return json({ error: "redirect_uri required" }, 400);
      const codeVerifier = randomString(64);
      const codeChallenge = await sha256base64url(codeVerifier);
      const state = randomString(24);

      await admin.from("oauth_sessions").insert({
        state,
        provider: "x",
        code_verifier: codeVerifier,
        redirect_uri,
      });

      const scopes = "tweet.read tweet.write users.read offline.access";
      const params = new URLSearchParams({
        response_type: "code",
        client_id: clientId,
        redirect_uri,
        scope: scopes,
        state,
        code_challenge: codeChallenge,
        code_challenge_method: "S256",
      });
      return json({ url: `https://twitter.com/i/oauth2/authorize?${params.toString()}` });
    }

    if (action === "callback") {
      const { code, state } = body;
      if (!code || !state) return json({ error: "code and state required" }, 400);

      const { data: session } = await admin
        .from("oauth_sessions")
        .select("*")
        .eq("state", state)
        .eq("provider", "x")
        .maybeSingle();

      if (!session) return json({ error: "Unknown or expired OAuth state" }, 400);

      const tokenHeaders: Record<string, string> = { "Content-Type": "application/x-www-form-urlencoded" };
      if (clientSecret) {
        tokenHeaders["Authorization"] = `Basic ${btoa(`${clientId}:${clientSecret}`)}`;
      }

      const tokenRes = await fetch("https://api.twitter.com/2/oauth2/token", {
        method: "POST",
        headers: tokenHeaders,
        body: new URLSearchParams({
          grant_type: "authorization_code",
          code,
          redirect_uri: session.redirect_uri,
          code_verifier: session.code_verifier,
          client_id: clientId,
        }),
      });

      if (!tokenRes.ok) {
        const err = await tokenRes.text();
        console.error("X token exchange failed:", err);
        return json({ error: "Token exchange failed", details: err }, 400);
      }

      const tokenData = await tokenRes.json();
      const accessToken = tokenData.access_token;
      const refreshToken = tokenData.refresh_token || null;
      const expiresIn = tokenData.expires_in || 7200;

      let xUserId = "";
      let xUsername = "";
      const meRes = await fetch("https://api.twitter.com/2/users/me?user.fields=username", {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (meRes.ok) {
        const me = await meRes.json();
        xUserId = me?.data?.id || "";
        xUsername = me?.data?.username || "";
      }

      await admin.from("x_tokens").upsert({
        id: 1,
        access_token: accessToken,
        refresh_token: refreshToken,
        expires_at: new Date(Date.now() + expiresIn * 1000).toISOString(),
        x_user_id: xUserId,
        x_username: xUsername,
        updated_at: new Date().toISOString(),
      }, { onConflict: "id" });

      await admin.from("oauth_sessions").delete().eq("state", state);

      return json({ success: true, username: xUsername });
    }

    if (action === "status") {
      const { data } = await admin
        .from("x_tokens")
        .select("x_username, x_user_id, expires_at, refresh_token")
        .eq("id", 1)
        .maybeSingle();

      if (!data || !data.expires_at) return json({ connected: false });

      // With a refresh_token on hand, an expired access token doesn't mean
      // disconnected — x-post will silently refresh it on next use.
      const expired = new Date(data.expires_at) < new Date();
      return json({
        connected: !expired || !!data.refresh_token,
        username: data.x_username,
        userId: data.x_user_id,
        expiresAt: data.expires_at,
      });
    }

    if (action === "disconnect") {
      await admin.from("x_tokens").delete().eq("id", 1);
      return json({ success: true });
    }

    return json({ error: "Unknown action" }, 400);
  } catch (error) {
    console.error("x-auth error:", error);
    const message = error instanceof Error ? error.message : "Internal error";
    return json({ error: message }, 500);
  }
});
