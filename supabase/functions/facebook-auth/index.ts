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

const GRAPH = "https://graph.facebook.com/v20.0";

function randomState(): string {
  const bytes = new Uint8Array(24);
  crypto.getRandomValues(bytes);
  return Array.from(bytes).map((b) => b.toString(16).padStart(2, "0")).join("");
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const ok = await verifyAdminToken(getAdminTokenFromRequest(req), serviceKey);
    if (!ok) return json({ error: "Unauthorized" }, 401);
    const admin = createClient(supabaseUrl, serviceKey);

    const appId = Deno.env.get("FACEBOOK_APP_ID");
    const appSecret = Deno.env.get("FACEBOOK_APP_SECRET");
    if (!appId || !appSecret) return json({ error: "FACEBOOK_APP_ID / FACEBOOK_APP_SECRET not configured" }, 500);

    const body = await req.json();
    const { action, redirect_uri } = body;

    if (action === "authorize") {
      if (!redirect_uri) return json({ error: "redirect_uri required" }, 400);
      const state = randomState();
      await admin.from("oauth_sessions").insert({ state, provider: "facebook", redirect_uri });

      const scopes = [
        "pages_show_list",
        "pages_manage_posts",
        "pages_read_engagement",
        "instagram_basic",
        "instagram_content_publish",
        "business_management",
      ].join(",");

      const params = new URLSearchParams({
        client_id: appId,
        redirect_uri,
        state,
        scope: scopes,
        response_type: "code",
      });
      return json({ url: `https://www.facebook.com/v20.0/dialog/oauth?${params.toString()}` });
    }

    if (action === "callback") {
      const { code, state } = body;
      if (!code || !state) return json({ error: "code and state required" }, 400);

      const { data: session } = await admin
        .from("oauth_sessions")
        .select("*")
        .eq("state", state)
        .eq("provider", "facebook")
        .maybeSingle();
      if (!session) return json({ error: "Unknown or expired OAuth state" }, 400);

      // Step 1: exchange code -> short-lived user token
      const shortRes = await fetch(
        `${GRAPH}/oauth/access_token?` +
          new URLSearchParams({
            client_id: appId,
            redirect_uri: session.redirect_uri,
            client_secret: appSecret,
            code,
          }),
      );
      if (!shortRes.ok) {
        const err = await shortRes.text();
        console.error("Facebook code exchange failed:", err);
        return json({ error: "Token exchange failed", details: err }, 400);
      }
      const shortData = await shortRes.json();

      // Step 2: exchange for long-lived user token (~60 days)
      const longRes = await fetch(
        `${GRAPH}/oauth/access_token?` +
          new URLSearchParams({
            grant_type: "fb_exchange_token",
            client_id: appId,
            client_secret: appSecret,
            fb_exchange_token: shortData.access_token,
          }),
      );
      if (!longRes.ok) {
        const err = await longRes.text();
        console.error("Facebook long-lived exchange failed:", err);
        return json({ error: "Long-lived token exchange failed", details: err }, 400);
      }
      const longData = await longRes.json();
      const userToken = longData.access_token;

      // Step 3: list Pages this user manages
      const pagesRes = await fetch(`${GRAPH}/me/accounts?access_token=${encodeURIComponent(userToken)}`);
      if (!pagesRes.ok) {
        const err = await pagesRes.text();
        console.error("Facebook /me/accounts failed:", err);
        return json({ error: "Could not list Facebook Pages", details: err }, 400);
      }
      const pagesData = await pagesRes.json();
      const pages = (pagesData?.data || []) as { id: string; name: string; access_token: string }[];

      if (pages.length === 0) {
        return json({ error: "This Facebook account doesn't manage any Pages. You need a Facebook Page to post through the Graph API." }, 400);
      }

      // Stash discovered pages against the state so the client can pick one
      // (most accounts only have one, but multi-page businesses need a choice).
      await admin.from("oauth_sessions").update({
        data: { pages: pages.map((p) => ({ id: p.id, name: p.name, access_token: p.access_token })) },
      }).eq("state", state);

      return json({
        pages: pages.map((p) => ({ id: p.id, name: p.name })),
        state,
      });
    }

    if (action === "connect-page") {
      const { state, pageId } = body;
      if (!state || !pageId) return json({ error: "state and pageId required" }, 400);

      const { data: session } = await admin
        .from("oauth_sessions")
        .select("*")
        .eq("state", state)
        .eq("provider", "facebook")
        .maybeSingle();
      if (!session || !session.data?.pages) return json({ error: "Unknown or expired OAuth session" }, 400);

      const page = (session.data.pages as any[]).find((p) => p.id === pageId);
      if (!page) return json({ error: "Page not found in this session" }, 400);

      // Page access tokens inherit the long-lived-ness of the user token that
      // minted them, so no separate page-token exchange is needed.
      let igUserId: string | null = null;
      let igUsername: string | null = null;
      const igRes = await fetch(
        `${GRAPH}/${page.id}?fields=instagram_business_account&access_token=${encodeURIComponent(page.access_token)}`,
      );
      if (igRes.ok) {
        const igData = await igRes.json();
        igUserId = igData?.instagram_business_account?.id || null;
        if (igUserId) {
          const igProfileRes = await fetch(
            `${GRAPH}/${igUserId}?fields=username&access_token=${encodeURIComponent(page.access_token)}`,
          );
          if (igProfileRes.ok) {
            const igProfile = await igProfileRes.json();
            igUsername = igProfile?.username || null;
          }
        }
      }

      await admin.from("facebook_tokens").upsert({
        id: 1,
        page_access_token: page.access_token,
        page_id: page.id,
        page_name: page.name,
        ig_user_id: igUserId,
        ig_username: igUsername,
        expires_at: null, // long-lived page tokens don't expire in practice unless the user revokes access
        updated_at: new Date().toISOString(),
      }, { onConflict: "id" });

      await admin.from("oauth_sessions").delete().eq("state", state);

      return json({ success: true, pageName: page.name, igUsername });
    }

    if (action === "status") {
      const { data } = await admin
        .from("facebook_tokens")
        .select("page_name, ig_username, ig_user_id, updated_at")
        .eq("id", 1)
        .maybeSingle();
      if (!data || !data.page_name) return json({ connected: false });
      return json({
        connected: true,
        pageName: data.page_name,
        igUsername: data.ig_username,
        igConnected: !!data.ig_user_id,
      });
    }

    if (action === "disconnect") {
      await admin.from("facebook_tokens").delete().eq("id", 1);
      return json({ success: true });
    }

    return json({ error: "Unknown action" }, 400);
  } catch (error) {
    console.error("facebook-auth error:", error);
    const message = error instanceof Error ? error.message : "Internal error";
    return json({ error: message }, 500);
  }
});
