import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const APP_ORIGINS = [
  "https://aetheris.technology",
  "https://aetheristechnology.lovable.app",
  "https://id-preview--1b783889-c460-4e52-a4bd-950110dc395b.lovable.app",
];

const pickOrigin = (req: Request): string => {
  const envUrl = Deno.env.get("APP_PUBLIC_URL");
  if (envUrl) return envUrl.replace(/\/$/, "");
  const referer = req.headers.get("referer") || "";
  const match = APP_ORIGINS.find((o) => referer.startsWith(o));
  if (match) return match;
  return APP_ORIGINS[0];
};

const html = (origin: string, params: string) =>
  `<!doctype html><meta http-equiv="refresh" content="0;url=${origin}/app/dashboard${params}"><body style="font-family:system-ui;background:#0f1117;color:#e8e6e0;padding:40px;text-align:center">Redirecting…</body>`;

serve(async (req) => {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const error = url.searchParams.get("error");

  const origin = pickOrigin(req);

  if (error) {
    return new Response(html(origin, `?error=${encodeURIComponent(error)}`), { headers: { "Content-Type": "text/html" } });
  }

  try {
    if (!code || !state) throw new Error("Missing code or state");

    const clientId = Deno.env.get("HUBSPOT_CLIENT_ID");
    const clientSecret = Deno.env.get("HUBSPOT_CLIENT_SECRET");
    const encryptionKey = Deno.env.get("HUBSPOT_TOKEN_ENCRYPTION_KEY");
    if (!clientId || !clientSecret || !encryptionKey) {
      throw new Error("HubSpot integration not configured");
    }

    const decoded = atob(state);
    const [accountId] = decoded.split(":");
    if (!accountId) throw new Error("Invalid state");

    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    // Idempotency: if this account already has a fresh HubSpot connection, skip the exchange.
    // HubSpot one-time codes can be replayed by browser prefetch/back-button, which would 400 a second time.
    const { data: existing } = await admin
      .from("accounts")
      .select("hubspot_portal_id, hubspot_connected_at")
      .eq("id", accountId)
      .maybeSingle();

    if (existing?.hubspot_portal_id && existing?.hubspot_connected_at) {
      const ageMs = Date.now() - new Date(existing.hubspot_connected_at).getTime();
      if (ageMs < 5 * 60 * 1000) {
        return new Response(html(origin, "?connected=1"), { headers: { "Content-Type": "text/html" } });
      }
    }

    const redirectUri = `${Deno.env.get("SUPABASE_URL")}/functions/v1/hubspot-oauth-callback`;

    const tokenRes = await fetch("https://api.hubapi.com/oauth/v1/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        code,
      }),
    });

    if (!tokenRes.ok) {
      const errBody = await tokenRes.text();
      // If the code is being replayed but we already have a connection, treat as success.
      if (existing?.hubspot_portal_id && /BAD_AUTH_CODE|invalid_grant|expired/i.test(errBody)) {
        return new Response(html(origin, "?connected=1"), { headers: { "Content-Type": "text/html" } });
      }
      throw new Error(`Token exchange failed: ${errBody}`);
    }
    const tokens = await tokenRes.json();

    // Fetch portal info
    const infoRes = await fetch(`https://api.hubapi.com/oauth/v1/access-tokens/${tokens.access_token}`);
    const info = infoRes.ok ? await infoRes.json() : { hub_id: null };

    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    const { data: encAccess } = await admin.rpc("encrypt_token", { _plaintext: tokens.access_token, _key: encryptionKey });
    const { data: encRefresh } = await admin.rpc("encrypt_token", { _plaintext: tokens.refresh_token, _key: encryptionKey });

    await admin
      .from("accounts")
      .update({
        hubspot_portal_id: info.hub_id ? String(info.hub_id) : null,
        hubspot_access_token_encrypted: encAccess,
        hubspot_refresh_token_encrypted: encRefresh,
        hubspot_access_token_expires_at: new Date(Date.now() + tokens.expires_in * 1000).toISOString(),
        hubspot_connected_at: new Date().toISOString(),
        last_sync_status: "pending",
      })
      .eq("id", accountId);

    // Trigger initial sync (fire and forget)
    fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/hubspot-sync`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
      },
      body: JSON.stringify({ account_id: accountId, mode: "initial" }),
    }).catch(() => {});

    return new Response(html(origin, "?connected=1"), { headers: { "Content-Type": "text/html" } });
  } catch (e) {
    return new Response(html(origin, `?error=${encodeURIComponent((e as Error).message)}`), { headers: { "Content-Type": "text/html" } });
  }
});
