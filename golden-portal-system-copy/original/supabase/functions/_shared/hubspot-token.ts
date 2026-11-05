// Shared HubSpot OAuth token helper. Decrypts the access token, refreshing
// against /oauth/v1/token when within 5 min of expiry. Mirrors the inline
// implementations in hygiene-execute and hubspot-sync.
import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const HUBSPOT_API = "https://api.hubapi.com";

export async function getHubSpotAccessToken(
  admin: SupabaseClient,
  account: { id: string; hubspot_access_token_encrypted?: string | null; hubspot_refresh_token_encrypted?: string | null; hubspot_access_token_expires_at?: string | null },
): Promise<string> {
  const key = Deno.env.get("HUBSPOT_TOKEN_ENCRYPTION_KEY")!;
  const expiresAt = account.hubspot_access_token_expires_at
    ? new Date(account.hubspot_access_token_expires_at).getTime()
    : 0;
  const needsRefresh = expiresAt < Date.now() + 5 * 60 * 1000;

  if (!needsRefresh && account.hubspot_access_token_encrypted) {
    const { data } = await admin.rpc("decrypt_token", {
      _ciphertext: account.hubspot_access_token_encrypted,
      _key: key,
    });
    if (data) return data as string;
  }

  if (!account.hubspot_refresh_token_encrypted) throw new Error("No HubSpot refresh token on file. Reconnect HubSpot.");
  const { data: refreshToken } = await admin.rpc("decrypt_token", {
    _ciphertext: account.hubspot_refresh_token_encrypted,
    _key: key,
  });
  if (!refreshToken) throw new Error("Failed to decrypt HubSpot refresh token.");

  const res = await fetch(`${HUBSPOT_API}/oauth/v1/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      client_id: Deno.env.get("HUBSPOT_CLIENT_ID")!,
      client_secret: Deno.env.get("HUBSPOT_CLIENT_SECRET")!,
      refresh_token: refreshToken as string,
    }),
  });
  if (!res.ok) throw new Error(`HubSpot token refresh failed: ${await res.text()}`);
  const tokens = await res.json();

  const { data: encAccess } = await admin.rpc("encrypt_token", {
    _plaintext: tokens.access_token,
    _key: key,
  });
  await admin
    .from("accounts")
    .update({
      hubspot_access_token_encrypted: encAccess,
      hubspot_access_token_expires_at: new Date(Date.now() + tokens.expires_in * 1000).toISOString(),
    })
    .eq("id", account.id);

  return tokens.access_token;
}

export const HUBSPOT_API_BASE = HUBSPOT_API;
