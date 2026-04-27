import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.86.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const HUBSPOT_API = "https://api.hubapi.com";
const PAGE_SIZE = 100;
const MAX_HUBSPOT_SEARCH_RESULTS = 10000;
const MIN_SEARCH_WINDOW_MS = 1000;

// Time budget per invocation. Edge functions have a hard ~150s wall clock.
// We stop work at 110s, persist a resume cursor, and re-invoke ourselves.
const INVOCATION_BUDGET_MS = 110_000;

interface Account {
  id: string;
  hubspot_access_token_encrypted: string | null;
  hubspot_refresh_token_encrypted: string | null;
  hubspot_access_token_expires_at: string | null;
  last_sync_at: string | null;
}

type SyncPhase = "companies" | "contacts" | "deals";

// Cursor stored in accounts.sync_progress.cursor when we yield mid-sync.
interface SyncCursor {
  phase: SyncPhase;
  sinceMs: number;
  endMs: number;
  windowStartMs: number;
  windowEndMs: number;
  after: string | null;
  companyCount: number;
  contactCount: number;
  dealCount: number;
  mode: string;
}

class TimeBudgetExceeded extends Error {
  cursor: SyncCursor;
  constructor(cursor: SyncCursor) {
    super("time budget exceeded");
    this.cursor = cursor;
  }
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

async function hubspotPost(endpoint: string, accessToken: string, body: Record<string, unknown>, label: string): Promise<any> {
  for (let attempt = 0; attempt < 4; attempt++) {
    const res = await fetch(`${HUBSPOT_API}${endpoint}`, {
      method: "POST",
      headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (res.status === 429) {
      await sleep(3000 * (attempt + 1));
      continue;
    }

    if (!res.ok) {
      const errText = await res.text();
      console.error(`[hubspot-sync] ${label.toLowerCase()} FAILED`, { status: res.status, body: errText });
      throw new Error(`${label} ${res.status}: ${errText}`);
    }

    return res.json();
  }

  throw new Error(`${label} rate limited after retries`);
}

async function syncOwners(admin: SupabaseClient, accountId: string, accessToken: string) {
  let after: string | undefined;
  let pageNum = 0;
  let total = 0;
  do {
    pageNum++;
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
    total += rows.length;
    console.log("[hubspot-sync] owners page", { pageNum, returned: rows.length, hasNext: !!data.paging?.next?.after, paging: data.paging });
    after = data.paging?.next?.after;
  } while (after);
  console.log("[hubspot-sync] owners complete", { totalOwners: total, pages: pageNum });
}

/**
 * Fetch deal→contact and deal→company associations for a batch of deal IDs.
 */
async function syncDealAssociations(
  admin: SupabaseClient,
  accountId: string,
  accessToken: string,
  dealIds: string[],
) {
  if (!dealIds.length) return;

  const inputs = dealIds.map((id) => ({ id }));

  // Fetch deal->contact and deal->company in PARALLEL (was serial — ~half the wall clock).
  const [contactRes, companyRes] = await Promise.allSettled([
    hubspotPost("/crm/v4/associations/deals/contacts/batch/read", accessToken, { inputs }, "DealContacts"),
    hubspotPost("/crm/v4/associations/deals/companies/batch/read", accessToken, { inputs }, "DealCompanies"),
  ]);

  if (contactRes.status === "fulfilled") {
    const linkRows: any[] = [];
    for (const result of contactRes.value.results || []) {
      const dealId = String(result.from?.id ?? result._from?.id ?? "");
      if (!dealId) continue;
      for (const to of result.to || []) {
        linkRows.push({
          account_id: accountId,
          deal_id: dealId,
          contact_id: String(to.toObjectId ?? to.id),
          synced_at: new Date().toISOString(),
        });
      }
    }
    if (linkRows.length) {
      await admin.from("mirror_deal_contacts").upsert(linkRows, { onConflict: "account_id,deal_id,contact_id" });
    }
  } else {
    console.warn("[hubspot-sync] deal->contact associations failed (continuing):", contactRes.reason?.message);
  }

  if (companyRes.status === "fulfilled") {
    const linkRows: any[] = [];
    for (const result of companyRes.value.results || []) {
      const dealId = String(result.from?.id ?? result._from?.id ?? "");
      if (!dealId) continue;
      for (const to of result.to || []) {
        linkRows.push({
          account_id: accountId,
          deal_id: dealId,
          company_id: String(to.toObjectId ?? to.id),
          synced_at: new Date().toISOString(),
        });
      }
    }
    if (linkRows.length) {
      await admin.from("mirror_deal_companies").upsert(linkRows, { onConflict: "account_id,deal_id,company_id" });
    }
  } else {
    console.warn("[hubspot-sync] deal->company associations failed (continuing):", companyRes.reason?.message);
  }
}

/**
 * Sync a date-windowed search. Returns updated cursor state.
 * Throws TimeBudgetExceeded with a resumable cursor if it runs out of time.
 */
async function syncWindowed(
  admin: SupabaseClient,
  accountId: string,
  accessToken: string,
  cursor: SyncCursor,
  startTime: number,
  setProgress: (extra: Record<string, unknown>) => Promise<void>,
): Promise<SyncCursor> {
  let endpoint: string;
  let dateField: string;
  let properties: string[];
  let label: string;
  let mirrorTable: string;

  if (cursor.phase === "companies") {
    endpoint = "/crm/v3/objects/companies/search";
    dateField = "hs_lastmodifieddate";
    properties = ["name", "domain", "industry", "hubspot_owner_id", "createdate", "hs_lastmodifieddate", "numberofemployees", "annualrevenue"];
    label = "Companies";
    mirrorTable = "mirror_companies";
  } else if (cursor.phase === "contacts") {
    endpoint = "/crm/v3/objects/contacts/search";
    dateField = "lastmodifieddate";
    properties = ["email", "firstname", "lastname", "lifecyclestage", "hs_lead_status", "hubspot_owner_id", "createdate", "lastmodifieddate"];
    label = "Contacts";
    mirrorTable = "mirror_contacts";
  } else {
    endpoint = "/crm/v3/objects/deals/search";
    dateField = "hs_lastmodifieddate";
    properties = ["dealname", "amount", "dealstage", "pipeline", "closedate", "hubspot_owner_id", "createdate", "hs_lastmodifieddate"];
    label = "Deals";
    mirrorTable = "mirror_deals";
  }

  // Process windows of [windowStartMs, windowEndMs). Walk forward window-by-window
  // until we cover [sinceMs, endMs).
  while (cursor.windowStartMs < cursor.endMs) {
    if (cursor.windowEndMs > cursor.endMs) cursor.windowEndMs = cursor.endMs;

    const baseBody: Record<string, unknown> = {
      filterGroups: [{
        filters: [
          { propertyName: dateField, operator: "GTE", value: String(cursor.windowStartMs) },
          { propertyName: dateField, operator: "LT", value: String(cursor.windowEndMs) },
        ],
      }],
      properties,
      sorts: [{ propertyName: dateField, direction: "ASCENDING" }],
      limit: PAGE_SIZE,
    };

    const reqBody: Record<string, unknown> = cursor.after ? { ...baseBody, after: cursor.after } : baseBody;
    const data = await hubspotPost(endpoint, accessToken, reqBody, label);

    // If first page of a window blows past the search cap, halve the window.
    if (!cursor.after && typeof data.total === "number" && data.total >= MAX_HUBSPOT_SEARCH_RESULTS) {
      const windowSize = cursor.windowEndMs - cursor.windowStartMs;
      if (windowSize <= MIN_SEARCH_WINDOW_MS) {
        throw new Error(`${label} window exceeded HubSpot search limit at ${new Date(cursor.windowStartMs).toISOString()}`);
      }
      cursor.windowEndMs = cursor.windowStartMs + Math.floor(windowSize / 2);
      continue;
    }

    const results = data.results || [];
    let rows: any[];

    if (cursor.phase === "companies") {
      rows = results.map((c: any) => ({
        account_id: accountId,
        hubspot_id: String(c.id),
        name: c.properties.name,
        domain: c.properties.domain,
        industry: c.properties.industry,
        owner_id: c.properties.hubspot_owner_id,
        created_date: c.properties.createdate || null,
        last_activity_date: c.properties.hs_lastmodifieddate || null,
        num_employees: c.properties.numberofemployees ? Number(c.properties.numberofemployees) : null,
        annual_revenue: c.properties.annualrevenue ? Number(c.properties.annualrevenue) : null,
        properties: c.properties,
        synced_at: new Date().toISOString(),
      }));
    } else if (cursor.phase === "contacts") {
      rows = results.map((c: any) => ({
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
    } else {
      rows = results.map((c: any) => ({
        account_id: accountId,
        hubspot_id: String(c.id),
        deal_name: c.properties.dealname,
        amount: c.properties.amount ? Number(c.properties.amount) : null,
        stage: c.properties.dealstage,
        pipeline: c.properties.pipeline,
        close_date: c.properties.closedate || null,
        owner_id: c.properties.hubspot_owner_id,
        created_date: c.properties.createdate || null,
        last_activity_date: c.properties.notes_last_contacted || c.properties.hs_lastmodifieddate || null,
        properties: c.properties,
        synced_at: new Date().toISOString(),
      }));
    }

    if (rows.length) await admin.from(mirrorTable).upsert(rows, { onConflict: "account_id,hubspot_id" });

    // For deals, fetch associations for the IDs we just upserted
    if (cursor.phase === "deals" && rows.length) {
      const dealIds = rows.map((r) => r.hubspot_id);
      await syncDealAssociations(admin, accountId, accessToken, dealIds);
    }

    if (cursor.phase === "companies") cursor.companyCount += rows.length;
    else if (cursor.phase === "contacts") cursor.contactCount += rows.length;
    else cursor.dealCount += rows.length;

    const next = data.paging?.next?.after ?? null;

    await setProgress({
      companies: cursor.companyCount,
      contacts: cursor.contactCount,
      deals: cursor.dealCount,
    });

    if (next) {
      cursor.after = next;
    } else {
      // Window done — advance to next window
      cursor.windowStartMs = cursor.windowEndMs;
      cursor.windowEndMs = cursor.endMs;
      cursor.after = null;
    }

    if (Date.now() - startTime > INVOCATION_BUDGET_MS) {
      throw new TimeBudgetExceeded({ ...cursor });
    }
  }

  return cursor;
}

function phaseLabel(p: SyncPhase): string {
  return p === "companies" ? "Companies" : p === "contacts" ? "Contacts" : "Deals";
}

function phasePercent(p: SyncPhase): number {
  // owners(5) -> companies(25) -> contacts(55) -> deals(85) -> complete(100)
  return p === "companies" ? 25 : p === "contacts" ? 55 : 85;
}

async function runSync(admin: SupabaseClient, account_id: string, mode: string, resumeCursor?: SyncCursor) {
  const startTime = Date.now();
  let cursor: SyncCursor | null = null;

  try {
    const encryptionKey = Deno.env.get("HUBSPOT_TOKEN_ENCRYPTION_KEY");
    if (!encryptionKey) throw new Error("Encryption key not configured");

    const { data: account, error } = await admin.from("accounts").select("*").eq("id", account_id).single();
    if (error || !account) throw new Error("Account not found");
    if (!account.hubspot_refresh_token_encrypted) throw new Error("HubSpot not connected");

    const accessToken = await getAccessToken(admin, account as Account, encryptionKey);

    if (resumeCursor) {
      cursor = resumeCursor;
      console.log("[hubspot-sync] resuming", { phase: cursor.phase, windowStartMs: cursor.windowStartMs, after: cursor.after });
    } else {
      const effectiveMode = mode === "resume" ? "initial" : mode;
      const sinceMs =
        effectiveMode === "initial" || !account.last_sync_at
          ? Date.now() - 18 * 30 * 24 * 60 * 60 * 1000
          : new Date(account.last_sync_at).getTime() - 5 * 60 * 1000;
      const endMs = Date.now() + 1;

      // Owners run only at start of fresh sync (small + fast)
      await admin.from("accounts").update({
        sync_progress: { phase: "Owners", percent: 5, heartbeat: new Date().toISOString() },
      }).eq("id", account_id);

      await syncOwners(admin, account_id, accessToken);

      // Start with companies (must precede contacts/deals so associations resolve)
      cursor = {
        phase: "companies",
        sinceMs,
        endMs,
        windowStartMs: sinceMs,
        windowEndMs: endMs,
        after: null,
        companyCount: 0,
        contactCount: 0,
        dealCount: 0,
        mode,
      };
    }

    const setProgress = async (extra: Record<string, unknown>) => {
      await admin
        .from("accounts")
        .update({
          sync_progress: {
            phase: phaseLabel(cursor!.phase),
            percent: phasePercent(cursor!.phase),
            heartbeat: new Date().toISOString(),
            cursor,
            ...extra,
          },
        })
        .eq("id", account_id);
    };

    // Phase: companies
    if (cursor.phase === "companies") {
      cursor = await syncWindowed(admin, account_id, accessToken, cursor, startTime, setProgress);
      cursor.phase = "contacts";
      cursor.windowStartMs = cursor.sinceMs;
      cursor.windowEndMs = cursor.endMs;
      cursor.after = null;
    }

    // Phase: contacts
    if (cursor.phase === "contacts") {
      cursor = await syncWindowed(admin, account_id, accessToken, cursor, startTime, setProgress);
      cursor.phase = "deals";
      cursor.windowStartMs = cursor.sinceMs;
      cursor.windowEndMs = cursor.endMs;
      cursor.after = null;
    }

    // Phase: deals
    if (cursor.phase === "deals") {
      cursor = await syncWindowed(admin, account_id, accessToken, cursor, startTime, setProgress);
    }

    // Done
    await admin
      .from("accounts")
      .update({
        last_sync_status: "success",
        last_sync_at: new Date().toISOString(),
        sync_progress: {
          phase: "complete",
          percent: 100,
          companies: cursor.companyCount,
          contacts: cursor.contactCount,
          deals: cursor.dealCount,
          heartbeat: new Date().toISOString(),
        },
      })
      .eq("id", account_id);

    console.log("hubspot-sync completed:", { account_id, companies: cursor.companyCount, contacts: cursor.contactCount, deals: cursor.dealCount });
  } catch (e) {
    if (e instanceof TimeBudgetExceeded) {
      console.log("[hubspot-sync] yielding for re-invocation", { phase: e.cursor.phase, companies: e.cursor.companyCount, contacts: e.cursor.contactCount, deals: e.cursor.dealCount });
      await admin
        .from("accounts")
        .update({
          last_sync_status: "running",
          sync_progress: {
            phase: phaseLabel(e.cursor.phase),
            percent: phasePercent(e.cursor.phase),
            heartbeat: new Date().toISOString(),
            companies: e.cursor.companyCount,
            contacts: e.cursor.contactCount,
            deals: e.cursor.dealCount,
            cursor: e.cursor,
            resuming: true,
          },
        })
        .eq("id", account_id);

      const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
      const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
      const reinvoke = fetch(`${supabaseUrl}/functions/v1/hubspot-sync`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${serviceKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ account_id, mode: "resume" }),
      })
        .then(() => console.log("[hubspot-sync] re-invoked successfully"))
        .catch((invokeErr) => console.error("[hubspot-sync] failed to re-invoke:", (invokeErr as Error).message));
      try {
        // @ts-ignore EdgeRuntime is available in Supabase Edge Functions
        EdgeRuntime.waitUntil(reinvoke);
      } catch {
        await reinvoke;
      }
      return;
    }

    const msg = (e as Error).message || String(e);
    console.error("hubspot-sync failed:", msg, (e as Error).stack);
    try {
      await admin
        .from("accounts")
        .update({ last_sync_status: "error", last_sync_error: msg })
        .eq("id", account_id);
    } catch (writeErr) {
      console.error("Failed to write error to account:", (writeErr as Error).message);
    }
  }
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

  try {
    const { account_id, mode = "incremental" } = await req.json();
    if (!account_id) throw new Error("Missing account_id");

    let resumeCursor: SyncCursor | undefined;

    const { data: acct } = await admin
      .from("accounts")
      .select("sync_progress, last_sync_status")
      .eq("id", account_id)
      .single();
    const sp = (acct?.sync_progress as { cursor?: SyncCursor; heartbeat?: string }) || {};
    const heartbeatAge = sp.heartbeat ? Date.now() - new Date(sp.heartbeat).getTime() : Infinity;
    const STALE_MS = 5 * 60 * 1000;
    const isStale = acct?.last_sync_status === "running" && heartbeatAge > STALE_MS;

    if (mode === "resume") {
      if (sp.cursor) {
        resumeCursor = sp.cursor;
      } else {
        console.warn("[hubspot-sync] resume requested but no cursor — restarting fresh initial scan");
      }
    } else {
      if (acct?.last_sync_status === "running" && !isStale) {
        return new Response(
          JSON.stringify({ ok: true, queued: false, reason: "already_running" }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
      if (isStale && sp.cursor && mode !== "initial") {
        console.log("[hubspot-sync] watchdog: taking over stale running sync via cursor");
        resumeCursor = sp.cursor;
      } else {
        await admin
          .from("accounts")
          .update({
            last_sync_status: "running",
            last_sync_error: null,
            sync_progress: { phase: "starting", percent: 0, heartbeat: new Date().toISOString() },
          })
          .eq("id", account_id);
      }
    }

    // @ts-ignore EdgeRuntime is available in Supabase Edge Functions
    EdgeRuntime.waitUntil(runSync(admin, account_id, mode, resumeCursor));

    return new Response(JSON.stringify({ ok: true, queued: true, resumed: !!resumeCursor }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    const msg = (e as Error).message || String(e);
    console.error("hubspot-sync invoke failed:", msg);
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
