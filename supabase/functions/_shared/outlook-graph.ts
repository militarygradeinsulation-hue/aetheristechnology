// Shared helper: load a rep's Outlook access token, refresh if expired, and call Microsoft Graph.
import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.86.0";

const TOKEN_URL = "https://login.microsoftonline.com/common/oauth2/v2.0/token";
const GRAPH = "https://graph.microsoft.com/v1.0";

export interface TokenRow {
  rep_code: string;
  outlook_email: string | null;
  access_token: string;
  refresh_token: string | null;
  expires_at: string;
  scope: string | null;
}

export async function getValidAccessToken(sb: SupabaseClient, repCode: string): Promise<TokenRow> {
  const { data, error } = await sb
    .from("outlook_oauth_tokens")
    .select("rep_code, outlook_email, access_token, refresh_token, expires_at, scope")
    .eq("rep_code", repCode)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new Error("OUTLOOK_NOT_CONNECTED");

  const row = data as TokenRow;
  const expMs = new Date(row.expires_at).getTime();
  // refresh 60s before expiry
  if (expMs - 60_000 > Date.now()) return row;

  if (!row.refresh_token) throw new Error("OUTLOOK_NOT_CONNECTED");
  const CLIENT_ID = Deno.env.get("MS_OAUTH_CLIENT_ID");
  const CLIENT_SECRET = Deno.env.get("MS_OAUTH_CLIENT_SECRET");
  if (!CLIENT_ID || !CLIENT_SECRET) throw new Error("Outlook OAuth not configured");

  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
      grant_type: "refresh_token",
      refresh_token: row.refresh_token,
    }),
  });
  const j = await res.json();
  if (!res.ok) {
    console.error("outlook refresh failed", j);
    throw new Error("OUTLOOK_NOT_CONNECTED");
  }
  const newRow: TokenRow = {
    ...row,
    access_token: j.access_token,
    refresh_token: j.refresh_token || row.refresh_token,
    expires_at: new Date(Date.now() + (Number(j.expires_in) || 3600) * 1000).toISOString(),
    scope: j.scope || row.scope,
  };
  await sb.from("outlook_oauth_tokens").update({
    access_token: newRow.access_token,
    refresh_token: newRow.refresh_token,
    expires_at: newRow.expires_at,
    scope: newRow.scope,
    updated_at: new Date().toISOString(),
  }).eq("rep_code", repCode);
  return newRow;
}

export async function graphFetch(token: string, path: string, init: RequestInit = {}) {
  const res = await fetch(`${GRAPH}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      ...(init.headers || {}),
    },
  });
  const text = await res.text();
  let body: any = null;
  try { body = text ? JSON.parse(text) : null; } catch { body = text; }
  return { ok: res.ok, status: res.status, body };
}
