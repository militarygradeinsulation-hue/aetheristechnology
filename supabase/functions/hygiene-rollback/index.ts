// Data Hygiene Engine — Rollback an executed change by writing the
// stored before_value back to HubSpot.

import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

declare const EdgeRuntime: { waitUntil: (promise: Promise<unknown>) => void };

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const HUBSPOT_API = "https://api.hubapi.com";
const RATE_DELAY_MS = 110;

// Defensive sanitization: HubSpot CRM v3 IDs must be positive integer strings.
// Strip any "contact_"/"deal_"/"company_"/"engagement_" prefix or stray non-digit
// characters before validating, so a stale/dirty hygiene_log row can't fire a
// guaranteed 404 PATCH at HubSpot.
const HUBSPOT_ID_RE = /^[1-9]\d{2,18}$/;
const normalizeHubspotId = (id: unknown): string | null => {
  if (id === null || id === undefined) return null;
  const digits = String(id).trim().replace(/^[a-zA-Z]+_/, "").replace(/\D/g, "");
  return HUBSPOT_ID_RE.test(digits) ? digits : null;
};

const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { ...corsHeaders, "Content-Type": "application/json" } });
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "Unauthorized" }, 401);
    const { data: { user }, error: userErr } = await supabase.auth.getUser(
      authHeader.replace("Bearer ", ""),
    );
    if (userErr || !user) return json({ error: "Unauthorized" }, 401);

    const { log_id, action_id } = await req.json();
    if (!log_id && !action_id) return json({ error: "log_id or action_id required" }, 400);

    let logs: any[] = [];
    if (log_id) {
      const { data } = await supabase.from("hygiene_log").select("*").eq("id", log_id);
      logs = data || [];
    } else {
      const { data } = await supabase
        .from("hygiene_log")
        .select("*")
        .eq("action_id", action_id)
        .is("rolled_back_at", null)
        .eq("success", true);
      logs = data || [];
    }
    if (logs.length === 0) return json({ ok: true, rolled_back: 0 });

    const { data: acct } = await supabase
      .from("accounts")
      .select("*")
      .eq("id", logs[0].account_id)
      .maybeSingle();
    if (!acct || acct.user_id !== user.id) return json({ error: "Forbidden" }, 403);

    EdgeRuntime.waitUntil(rollback(supabase, acct, logs));
    return json({ ok: true, total: logs.length });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed";
    console.error("[hygiene-rollback]", err);
    return json({ error: message }, 500);
  }
});

async function rollback(supabase: SupabaseClient, account: any, logs: any[]) {
  const token = await getAccessToken(supabase, account);
  for (const log of logs) {
    try {
      const objPath = objectTypeToPath(log.hubspot_object_type);
      const cleanId = normalizeHubspotId(log.hubspot_object_id);
      if (!cleanId) {
        console.warn("[hygiene-rollback] skipping log with malformed HubSpot id", {
          log_id: log.id, raw_id: log.hubspot_object_id,
        });
        await supabase.from("hygiene_log")
          .update({ rolled_back_at: new Date().toISOString() })
          .eq("id", log.id);
        continue;
      }
      const restoreProps: Record<string, unknown> = {};
      for (const change of log.field_changes || []) {
        restoreProps[change.field] = change.before;
      }
      if (Object.keys(restoreProps).length > 0) {
        const res = await fetch(`${HUBSPOT_API}/crm/v3/objects/${objPath}/${cleanId}`, {
          method: "PATCH",
          headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
          body: JSON.stringify({ properties: restoreProps }),
        });
        if (!res.ok) throw new Error(`HubSpot ${res.status}: ${await res.text()}`);
      }
      await supabase.from("hygiene_log").update({ rolled_back_at: new Date().toISOString() }).eq("id", log.id);
    } catch (err) {
      console.error("[hygiene-rollback] item failed", log.id, err);
    }
    await sleep(RATE_DELAY_MS);
  }
}

function objectTypeToPath(t: string): string {
  if (t === "deal") return "deals";
  if (t === "company") return "companies";
  if (t === "engagement") return "engagements";
  return "contacts";
}

async function getAccessToken(admin: SupabaseClient, account: any): Promise<string> {
  const key = Deno.env.get("HUBSPOT_TOKEN_ENCRYPTION_KEY")!;
  const expiresAt = account.hubspot_access_token_expires_at
    ? new Date(account.hubspot_access_token_expires_at).getTime() : 0;
  if (expiresAt > Date.now() + 5 * 60 * 1000 && account.hubspot_access_token_encrypted) {
    const { data } = await admin.rpc("decrypt_token", {
      _ciphertext: account.hubspot_access_token_encrypted, _key: key,
    });
    if (data) return data as string;
  }
  const { data: refreshToken } = await admin.rpc("decrypt_token", {
    _ciphertext: account.hubspot_refresh_token_encrypted, _key: key,
  });
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
  if (!res.ok) throw new Error(`Refresh failed: ${await res.text()}`);
  const tokens = await res.json();
  const { data: encAccess } = await admin.rpc("encrypt_token", {
    _plaintext: tokens.access_token, _key: key,
  });
  await admin.from("accounts").update({
    hubspot_access_token_encrypted: encAccess,
    hubspot_access_token_expires_at: new Date(Date.now() + tokens.expires_in * 1000).toISOString(),
  }).eq("id", account.id);
  return tokens.access_token;
}
