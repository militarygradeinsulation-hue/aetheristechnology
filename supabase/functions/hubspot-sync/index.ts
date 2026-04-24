import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const HUBSPOT_API = "https://api.hubapi.com";
const PAGE_SIZE = 100;

interface Account {
  id: string;
  hubspot_access_token_encrypted: string | null;
  hubspot_refresh_token_encrypted: string | null;
  hubspot_access_token_expires_at: string | null;
  last_sync_at: string | null;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function getAccessToken(admin: SupabaseClient, account: Account, key: string): Promise<string> {
  const expiresAt = account.hubspot_access_token_expires_at ? new Date(account.hubspot_access_token_expires_at).getTime() : 0;
  const needsRefresh = expiresAt < Date.now() + 5 * 60 * 1000;

  if (!needsRefresh && account.hubspot_access_token_encrypted) {
    const { data } = await admin.rpc("decrypt_token", { _ciphertext: account.hubspot_access_token_encrypted, _key: key });
    if (data) return data as string;
  }

  if (!account.hubspot_refresh_token_encrypted) throw new Error("No refresh token on file");
  const { data: refreshToken } = await admin.rpc("decrypt_token", { _ciphertext: account.hubspot_refresh_token_encrypted, _key: key });
  if (!refreshToken) throw new Error("Failed to decrypt refresh token");

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

  const { data: encAccess } = await admin.rpc("encrypt_token", { _plaintext: tokens.access_token, _key: key });
  await admin
    .from("accounts")
    .update({
      hubspot_access_token_encrypted: encAccess,
      hubspot_access_token_expires_at: new Date(Date.now() + tokens.expires_in * 1000).toISOString(),
    })
    .eq("id", account.id);

  return tokens.access_token;
}

async function hubspotFetch(url: string, accessToken: string): Promise<any> {
  for (let attempt = 0; attempt < 4; attempt++) {
    const res = await fetch(url, { headers: { Authorization: `Bearer ${accessToken}` } });
    if (res.status === 429) {
      await sleep(2000 * (attempt + 1));
      continue;
    }
    if (!res.ok) throw new Error(`HubSpot ${res.status}: ${await res.text()}`);
    return res.json();
  }
  throw new Error("Rate limited after retries");
}

async function syncOwners(admin: SupabaseClient, accountId: string, accessToken: string) {
  let after: string | undefined;
  do {
    const url = `${HUBSPOT_API}/crm/v3/owners?limit=${PAGE_SIZE}${after ? `&after=${after}` : ""}`;
    const data = await hubspotFetch(url, accessToken);
    const rows = (data.results || []).map((o: any) => ({
      account_id: accountId,
      hubspot_id: String(o.id),
      email: o.email,
      first_name: o.firstName,
      last_name: o.lastName,
      synced_at: new Date().toISOString(),
    }));
    if (rows.length) await admin.from("mirror_owners").upsert(rows, { onConflict: "account_id,hubspot_id" });
    after = data.paging?.next?.after;
  } while (after);
}

async function syncContacts(admin: SupabaseClient, accountId: string, accessToken: string, sinceMs: number, onProgress: (n: number) => Promise<void>) {
  let after: string | undefined;
  let total = 0;
  const properties = "email,firstname,lastname,lifecyclestage,hs_lead_status,hubspot_owner_id,createdate,lastmodifieddate";
  do {
    const body: Record<string, unknown> = {
      filterGroups: [{ filters: [{ propertyName: "lastmodifieddate", operator: "GTE", value: String(sinceMs) }] }],
      properties: properties.split(","),
      sorts: [{ propertyName: "lastmodifieddate", direction: "ASCENDING" }],
      limit: PAGE_SIZE,
    };
    if (after) body.after = after;
    console.log("[hubspot-sync] contacts request", { sinceMs, after, body_preview: JSON.stringify(body).slice(0, 300) });
    const res = await fetch(`${HUBSPOT_API}/crm/v3/objects/contacts/search`, {
      method: "POST",
      headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (res.status === 429) {
      await sleep(3000);
      continue;
    }
    if (!res.ok) {
      const errText = await res.text();
      console.error("[hubspot-sync] contacts FAILED", { status: res.status, body: errText, request: JSON.stringify(body) });
      throw new Error(`Contacts ${res.status}: ${errText}`);
    }
    const data = await res.json();
    const rows = (data.results || []).map((c: any) => ({
      account_id: accountId,
      hubspot_id: String(c.id),
      email: c.properties.email,
      first_name: c.properties.firstname,
      last_name: c.properties.lastname,
      lifecycle_stage: c.properties.lifecyclestage,
      lead_status: c.properties.hs_lead_status,
      owner_id: c.properties.hubspot_owner_id,
      created_date: c.properties.createdate || null,
      last_activity_date: c.properties.notes_last_contacted || c.properties.lastmodifieddate || null,
      properties: c.properties,
      synced_at: new Date().toISOString(),
    }));
    if (rows.length) await admin.from("mirror_contacts").upsert(rows, { onConflict: "account_id,hubspot_id" });
    total += rows.length;
    after = data.paging?.next?.after;
    await onProgress(total);
  } while (after);
  return total;
}

async function syncDeals(admin: SupabaseClient, accountId: string, accessToken: string, sinceMs: number, onProgress: (n: number) => Promise<void>) {
  let after: string | undefined;
  let total = 0;
  const properties = "dealname,amount,dealstage,pipeline,closedate,hubspot_owner_id,createdate,hs_lastmodifieddate";
  do {
    const body = {
      filterGroups: [{ filters: [{ propertyName: "hs_lastmodifieddate", operator: "GTE", value: String(sinceMs) }] }],
      properties: properties.split(","),
      sorts: [{ propertyName: "hs_lastmodifieddate", direction: "ASCENDING" }],
      limit: PAGE_SIZE,
      after,
    };
    const res = await fetch(`${HUBSPOT_API}/crm/v3/objects/deals/search`, {
      method: "POST",
      headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (res.status === 429) {
      await sleep(3000);
      continue;
    }
    if (!res.ok) throw new Error(`Deals ${res.status}: ${await res.text()}`);
    const data = await res.json();
    const rows = (data.results || []).map((d: any) => ({
      account_id: accountId,
      hubspot_id: String(d.id),
      deal_name: d.properties.dealname,
      amount: d.properties.amount ? Number(d.properties.amount) : null,
      stage: d.properties.dealstage,
      pipeline: d.properties.pipeline,
      close_date: d.properties.closedate || null,
      owner_id: d.properties.hubspot_owner_id,
      created_date: d.properties.createdate || null,
      last_activity_date: d.properties.notes_last_contacted || d.properties.hs_lastmodifieddate || null,
      properties: d.properties,
      synced_at: new Date().toISOString(),
    }));
    if (rows.length) await admin.from("mirror_deals").upsert(rows, { onConflict: "account_id,hubspot_id" });
    total += rows.length;
    after = data.paging?.next?.after;
    await onProgress(total);
  } while (after);
  return total;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  let accountIdForError: string | null = null;

  try {
    const { account_id, mode = "incremental" } = await req.json();
    if (!account_id) throw new Error("Missing account_id");
    accountIdForError = account_id;

    const encryptionKey = Deno.env.get("HUBSPOT_TOKEN_ENCRYPTION_KEY");
    if (!encryptionKey) throw new Error("Encryption key not configured");

    const { data: account, error } = await admin.from("accounts").select("*").eq("id", account_id).single();
    if (error || !account) throw new Error("Account not found");
    if (!account.hubspot_refresh_token_encrypted) throw new Error("HubSpot not connected");

    await admin
      .from("accounts")
      .update({ last_sync_status: "running", last_sync_error: null, sync_progress: { phase: "starting", percent: 0 } })
      .eq("id", account_id);

    const accessToken = await getAccessToken(admin, account as Account, encryptionKey);

    const sinceMs =
      mode === "initial" || !account.last_sync_at
        ? Date.now() - 18 * 30 * 24 * 60 * 60 * 1000
        : new Date(account.last_sync_at).getTime() - 5 * 60 * 1000;

    const setProgress = async (phase: string, percent: number) => {
      await admin.from("accounts").update({ sync_progress: { phase, percent } }).eq("id", account_id);
    };

    await setProgress("Owners", 5);
    await syncOwners(admin, account_id, accessToken);

    await setProgress("Contacts", 20);
    const contactCount = await syncContacts(admin, account_id, accessToken, sinceMs, async () => {
      await setProgress("Contacts", 40);
    });

    await setProgress("Deals", 60);
    const dealCount = await syncDeals(admin, account_id, accessToken, sinceMs, async () => {
      await setProgress("Deals", 80);
    });

    await admin
      .from("accounts")
      .update({
        last_sync_status: "success",
        last_sync_at: new Date().toISOString(),
        sync_progress: { phase: "complete", percent: 100, contacts: contactCount, deals: dealCount },
      })
      .eq("id", account_id);

    return new Response(JSON.stringify({ ok: true, contacts: contactCount, deals: dealCount }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    const msg = (e as Error).message || String(e);
    console.error("hubspot-sync failed:", msg, (e as Error).stack);
    if (accountIdForError) {
      try {
        await admin
          .from("accounts")
          .update({ last_sync_status: "error", last_sync_error: msg })
          .eq("id", accountIdForError);
      } catch (writeErr) {
        console.error("Failed to write error to account:", (writeErr as Error).message);
      }
    }
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
