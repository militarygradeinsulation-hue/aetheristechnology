// Microsoft OAuth callback. Exchanges the auth code for tokens and stores them
// per rep, then renders a tiny HTML page that closes the popup / redirects back.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.86.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function htmlPage(title: string, message: string, ok: boolean) {
  return `<!doctype html><html><head><meta charset="utf-8"><title>${title}</title>
<style>
body{margin:0;background:#0f0e0c;color:#f5e9d3;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh;padding:24px;text-align:center}
.card{max-width:440px;background:#1a1815;border:1px solid ${ok ? "#d97706" : "#991b1b"};border-radius:12px;padding:32px}
h1{margin:0 0 8px;font-size:22px;color:${ok ? "#fbbf24" : "#fca5a5"}}
p{margin:8px 0 0;color:#d4c5a4;font-size:14px;line-height:1.5}
button{margin-top:24px;background:#d97706;color:#0f0e0c;border:0;padding:10px 18px;font-weight:600;border-radius:8px;cursor:pointer;font-size:14px}
</style></head>
<body><div class="card">
<h1>${title}</h1><p>${message}</p>
<button onclick="window.close();setTimeout(()=>{location.href='/portal'},200)">Close window</button>
</div>
<script>try{window.opener&&window.opener.postMessage({type:'outlook_oauth',ok:${ok}},'*')}catch(e){}</script>
</body></html>`;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const error = url.searchParams.get("error_description") || url.searchParams.get("error");

  const respond = (title: string, message: string, ok: boolean, status = 200) =>
    new Response(htmlPage(title, message, ok), { status, headers: { "Content-Type": "text/html; charset=utf-8" } });

  try {
    if (error) return respond("Connection failed", error, false, 400);
    if (!code || !state) return respond("Connection failed", "Missing authorization code.", false, 400);

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SVC = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const CLIENT_ID = Deno.env.get("MS_OAUTH_CLIENT_ID");
    const CLIENT_SECRET = Deno.env.get("MS_OAUTH_CLIENT_SECRET");
    if (!CLIENT_ID || !CLIENT_SECRET) return respond("Server not configured", "Microsoft OAuth credentials missing.", false, 500);

    const sb = createClient(SUPABASE_URL, SVC);
    const { data: stateRow } = await sb.from("outlook_oauth_state").select("*").eq("state", state).maybeSingle();
    if (!stateRow) return respond("Connection failed", "State mismatch or expired. Try connecting again.", false, 400);
    if (new Date(stateRow.expires_at).getTime() < Date.now()) {
      await sb.from("outlook_oauth_state").delete().eq("state", state);
      return respond("Connection failed", "The connection request expired. Try again.", false, 400);
    }
    const repCode = stateRow.rep_code as string;
    await sb.from("outlook_oauth_state").delete().eq("state", state);

    // Exchange code for tokens
    const redirectUri = `${SUPABASE_URL}/functions/v1/outlook-oauth-callback`;
    const tokenRes = await fetch("https://login.microsoftonline.com/common/oauth2/v2.0/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: CLIENT_ID,
        client_secret: CLIENT_SECRET,
        grant_type: "authorization_code",
        code,
        redirect_uri: redirectUri,
      }),
    });
    const tokenJson = await tokenRes.json();
    if (!tokenRes.ok) {
      console.error("token exchange failed", tokenJson);
      return respond("Connection failed", tokenJson.error_description || "Token exchange failed.", false, 400);
    }

    // Fetch the user's Outlook email via Graph
    let outlookEmail: string | null = null;
    try {
      const meRes = await fetch("https://graph.microsoft.com/v1.0/me", {
        headers: { Authorization: `Bearer ${tokenJson.access_token}` },
      });
      const me = await meRes.json();
      outlookEmail = me.mail || me.userPrincipalName || null;
    } catch (_) { /* ignore */ }

    const expiresAt = new Date(Date.now() + (Number(tokenJson.expires_in) || 3600) * 1000).toISOString();

    const { error: upErr } = await sb.from("outlook_oauth_tokens").upsert({
      rep_code: repCode,
      outlook_email: outlookEmail,
      access_token: tokenJson.access_token,
      refresh_token: tokenJson.refresh_token || null,
      expires_at: expiresAt,
      scope: tokenJson.scope || null,
      updated_at: new Date().toISOString(),
    }, { onConflict: "rep_code" });
    if (upErr) return respond("Connection failed", upErr.message, false, 500);

    return respond("Outlook connected ✓", `Your account ${outlookEmail || ""} is now linked. You can close this window and return to your portal.`, true);
  } catch (e: any) {
    console.error("outlook-oauth-callback", e);
    return respond("Connection failed", String(e?.message || e), false, 500);
  }
});
