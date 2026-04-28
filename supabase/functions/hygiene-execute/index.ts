// Data Hygiene Engine — Write-back to HubSpot.
// Takes an approved hygiene_action and applies the change one record at a time
// (rate-limited to ~10 req/s), logging every before/after to hygiene_log.

import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

declare const EdgeRuntime: { waitUntil: (promise: Promise<unknown>) => void };

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const HUBSPOT_API = "https://api.hubapi.com";
const RATE_DELAY_MS = 110; // ~9 req/s

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

// HubSpot CRM v3 IDs are positive integer strings (typically 5–19 digits).
// Reject anything else BEFORE we hit the API to avoid guaranteed 404s.
// Defensive: strip any accidental "contact_"/"deal_"/"company_"/"engagement_"
// prefix and non-digit characters before validating, mirroring coerceHubspotId
// in hubspot-sync. Persisted IDs should already be clean, but upstream callers
// (UI, retries, replays of old payloads) may still hand us prefixed values.
const HUBSPOT_ID_RE = /^[1-9]\d{2,18}$/;
const isValidHubspotId = (id: unknown): id is string =>
  typeof id === "string" && HUBSPOT_ID_RE.test(id.trim());
const normalizeHubspotId = (id: unknown): string | null => {
  if (id === null || id === undefined) return null;
  const digits = String(id).trim().replace(/^[a-zA-Z]+_/, "").replace(/\D/g, "");
  return HUBSPOT_ID_RE.test(digits) ? digits : null;
};

// Sentinel thrown by applyOne / merges when the HubSpot record no longer exists.
// Treated as a "skip" rather than a failure for status-rollup purposes.
class HubspotNotFoundError extends Error {
  constructor(msg: string) { super(msg); this.name = "HubspotNotFoundError"; }
}

// Sentinel for HubSpot 403 MISSING_SCOPES — fatal, abort the whole run
// instead of grinding through thousands of guaranteed failures.
class HubspotMissingScopesError extends Error {
  constructor(msg: string) { super(msg); this.name = "HubspotMissingScopesError"; }
}

const SCOPE_HINT =
  "HubSpot is missing write scopes. Reconnect HubSpot from Settings to grant contact write access, then re-approve this action.";

const isMissingScopes = (raw: string) =>
  /MISSING_SCOPES|missing.*scopes|required.*scope/i.test(raw);

// Re-fetch the action's status from the DB so we can honor user-initiated
// cancellation between records without keeping connection state.
async function isCancelled(supabase: SupabaseClient, actionId: string): Promise<boolean> {
  const { data } = await supabase
    .from("hygiene_actions")
    .select("status")
    .eq("id", actionId)
    .maybeSingle();
  return data?.status === "cancelled";
}

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

    const { action_id, record_ids, modifications, confirm_delete, merges } = await req.json();
    if (!action_id) return json({ error: "action_id required" }, 400);

    const { data: action } = await supabase
      .from("hygiene_actions")
      .select("*")
      .eq("id", action_id)
      .maybeSingle();
    if (!action) return json({ error: "Action not found" }, 404);

    const { data: acct } = await supabase
      .from("accounts")
      .select("*")
      .eq("id", action.account_id)
      .maybeSingle();
    if (!acct || acct.user_id !== user.id) return json({ error: "Forbidden" }, 403);

    // Pre-flight: HubSpot must be connected with write tokens before we queue any work.
    if (!acct.hubspot_portal_id || !acct.hubspot_refresh_token_encrypted) {
      const msg = "HubSpot is not connected. Open Dashboard → Connect HubSpot, authorize, then retry this fix.";
      await supabase
        .from("hygiene_actions")
        .update({ status: "failed", error_message: msg })
        .eq("id", action_id);
      return json({ error: msg, code: "hubspot_not_connected" }, 400);
    }

    const isMerge = Array.isArray(merges) && merges.length > 0;
    const targetIds: string[] =
      Array.isArray(record_ids) && record_ids.length > 0 ? record_ids : action.affected_record_ids;
    const totalUnits = isMerge ? merges.length : targetIds.length;

    await supabase
      .from("hygiene_actions")
      .update({
        status: "executing",
        approved_at: action.approved_at || new Date().toISOString(),
        progress: { processed: 0, total: totalUnits, message: "Starting..." },
      })
      .eq("id", action_id);

    if (isMerge) {
      EdgeRuntime.waitUntil(runMerges(supabase, acct, action, merges));
    } else {
      EdgeRuntime.waitUntil(
        runExecution(supabase, acct, action, targetIds, modifications || {}, !!confirm_delete),
      );
    }

    return json({ ok: true, total: totalUnits });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed";
    console.error("[hygiene-execute] error", err);
    return json({ error: message }, 500);
  }
});

async function runExecution(
  supabase: SupabaseClient,
  account: any,
  action: any,
  ids: string[],
  modifications: Record<string, Record<string, unknown>>,
  confirmDelete: boolean,
) {
  let processed = 0;
  let failures = 0;
  let skipped = 0;
  try {
    const accessToken = await getAccessToken(supabase, account);
    const fixKind: string = action.recommended_action?.fix_kind || "manual_review";
    const objectType: string = action.recommended_action?.object_type || "contact";

    for (const rawId of ids) {
      const id = normalizeHubspotId(rawId);
      if (!id) {
        skipped++;
        await supabase.from("hygiene_log").insert({
          action_id: action.id,
          account_id: action.account_id,
          hubspot_object_type: objectType,
          hubspot_object_id: String(rawId ?? ""),
          field_changes: [],
          before_value: { raw_id: rawId },
          after_value: {},
          success: false,
          error_message: `Skipped: malformed HubSpot ID "${rawId}"`,
        });
        processed++;
        continue;
      }
      try {
        await applyOne(supabase, action, accessToken, objectType, id, fixKind, modifications[id], confirmDelete);
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        if (err instanceof HubspotMissingScopesError) {
          // Fatal — abort the whole run, don't punish the user with 5,000 logged failures
          await supabase
            .from("hygiene_actions")
            .update({
              status: "failed",
              error_message: SCOPE_HINT,
              progress: { processed, total: ids.length, skipped, failures, message: SCOPE_HINT, error_kind: "missing_scopes" },
            })
            .eq("id", action.id);
          return;
        }
        if (err instanceof HubspotNotFoundError) {
          skipped++;
          await supabase.from("hygiene_log").insert({
            action_id: action.id,
            account_id: action.account_id,
            hubspot_object_type: objectType,
            hubspot_object_id: id,
            field_changes: [],
            before_value: {},
            after_value: {},
            success: false,
            error_message: `Skipped: ${message}`,
          });
        } else {
          failures++;
          await supabase.from("hygiene_log").insert({
            action_id: action.id,
            account_id: action.account_id,
            hubspot_object_type: objectType,
            hubspot_object_id: id,
            field_changes: [],
            before_value: {},
            after_value: {},
            success: false,
            error_message: message,
          });
        }
      }
      processed++;
      if (processed % 10 === 0) {
        await supabase
          .from("hygiene_actions")
          .update({ progress: { processed, total: ids.length, skipped, failures, message: `Processing ${processed} of ${ids.length}` } })
          .eq("id", action.id);
        // Honor user-initiated cancellation
        if (await isCancelled(supabase, action.id)) {
          await supabase
            .from("hygiene_actions")
            .update({
              status: "cancelled",
              error_message: "Cancelled by user",
              executed_at: new Date().toISOString(),
              progress: { processed, total: ids.length, skipped, failures, message: `Cancelled at ${processed} of ${ids.length}` },
            })
            .eq("id", action.id);
          return;
        }
      }
      await sleep(RATE_DELAY_MS);
    }

    const succeeded = processed - failures - skipped;
    await supabase
      .from("hygiene_actions")
      .update({
        status: succeeded === 0 && failures > 0 ? "failed" : "executed",
        executed_at: new Date().toISOString(),
        progress: { processed, total: ids.length, skipped, failures, message: `Done (${failures} failed, ${skipped} skipped)` },
        error_message: failures ? `${failures} of ${ids.length} records failed` : null,
      })
      .eq("id", action.id);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[hygiene-execute] fatal", err);
    await supabase
      .from("hygiene_actions")
      .update({ status: "failed", error_message: message })
      .eq("id", action.id);
  }
}

async function applyOne(
  supabase: SupabaseClient,
  action: any,
  token: string,
  objectType: string,
  id: string,
  fixKind: string,
  modification: Record<string, unknown> | undefined,
  confirmDelete: boolean,
) {
  if (fixKind === "flag_missing") {
    // No-op write — used as a flag/export category in Phase 1.
    return;
  }

  if (fixKind === "delete_orphan_engagement") {
    if (!confirmDelete) throw new Error("Delete requires confirm_delete=true");
    const before = await fetchHubspot(token, "engagements", id);
    if (!before) throw new HubspotNotFoundError(`engagement ${id} not found in HubSpot`);
    const res = await fetch(`${HUBSPOT_API}/crm/v3/objects/engagements/${id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.status === 404) throw new HubspotNotFoundError(`engagement ${id} not found in HubSpot`);
    if (res.status === 403) {
      const body = await res.text();
      if (isMissingScopes(body)) throw new HubspotMissingScopesError(SCOPE_HINT);
      throw new Error(`HubSpot rejected delete (403). ${body}`);
    }
    if (!res.ok && res.status !== 204) throw new Error(`HubSpot ${res.status}: ${await res.text()}`);
    await supabase.from("hygiene_log").insert({
      action_id: action.id,
      account_id: action.account_id,
      hubspot_object_type: "engagement",
      hubspot_object_id: id,
      field_changes: [{ field: "_deleted", before: false, after: true }],
      before_value: before?.properties || {},
      after_value: {},
      success: true,
    });
    return;
  }

  // Fetch current state
  const objPath = objectTypeToPath(objectType);
  const before = await fetchHubspot(token, objPath, id);
  if (!before) throw new HubspotNotFoundError(`${objectType} ${id} not found in HubSpot`);

  const beforeProps = before.properties || {};
  const updates = modification || computeUpdates(fixKind, beforeProps);
  const fieldChanges = Object.entries(updates)
    .filter(([k, v]) => beforeProps[k] !== v)
    .map(([k, v]) => ({ field: k, before: beforeProps[k] ?? null, after: v }));
  if (fieldChanges.length === 0) return;

  const patchRes = await fetch(`${HUBSPOT_API}/crm/v3/objects/${objPath}/${id}`, {
    method: "PATCH",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ properties: updates }),
  });
  if (patchRes.status === 404) throw new HubspotNotFoundError(`${objectType} ${id} not found in HubSpot`);
  if (patchRes.status === 403) {
    const body = await patchRes.text();
    if (isMissingScopes(body)) throw new HubspotMissingScopesError(SCOPE_HINT);
    throw new Error(`HubSpot rejected write (403). ${body}`);
  }
  if (!patchRes.ok) throw new Error(`HubSpot ${patchRes.status}: ${await patchRes.text()}`);
  const after = await patchRes.json();

  await supabase.from("hygiene_log").insert({
    action_id: action.id,
    account_id: action.account_id,
    hubspot_object_type: objectType,
    hubspot_object_id: id,
    field_changes: fieldChanges,
    before_value: beforeProps,
    after_value: after.properties || updates,
    success: true,
  });

  // Mirror the change locally so the UI reflects it immediately
  await mirrorUpdate(supabase, action.account_id, objectType, id, updates);
}

function computeUpdates(fixKind: string, before: Record<string, any>): Record<string, unknown> {
  const u: Record<string, unknown> = {};
  switch (fixKind) {
    case "lowercase_email":
    case "trim_whitespace":
      if (before.email && before.email !== before.email.trim().toLowerCase()) u.email = before.email.trim().toLowerCase();
      if (before.firstname && before.firstname !== before.firstname.trim()) u.firstname = before.firstname.trim();
      if (before.lastname && before.lastname !== before.lastname.trim()) u.lastname = before.lastname.trim();
      if (before.company && before.company !== before.company.trim()) u.company = before.company.trim();
      if (before.firstname) {
        const v = before.firstname.trim();
        if (v === v.toLowerCase() || v === v.toUpperCase()) u.firstname = titleCase(v);
      }
      if (before.lastname) {
        const v = before.lastname.trim();
        if (v === v.toLowerCase() || v === v.toUpperCase()) u.lastname = titleCase(v);
      }
      break;
    case "title_case_name":
      if (before.firstname) u.firstname = titleCase(before.firstname.trim());
      if (before.lastname) u.lastname = titleCase(before.lastname.trim());
      break;
    case "format_phone":
      if (before.phone) {
        const digits = String(before.phone).replace(/\D/g, "");
        if (digits.length === 10) u.phone = `+1 (${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
        else if (digits.length === 11 && digits.startsWith("1"))
          u.phone = `+1 (${digits.slice(1, 4)}) ${digits.slice(4, 7)}-${digits.slice(7)}`;
      }
      break;
    case "trim_company":
      if (before.name && before.name !== before.name.trim()) u.name = before.name.trim();
      break;
  }
  return u;
}

function titleCase(s: string): string {
  return s
    .toLowerCase()
    .split(/\s+/)
    .map((w) => (w ? w[0].toUpperCase() + w.slice(1) : w))
    .join(" ");
}

function objectTypeToPath(t: string): string {
  if (t === "deal") return "deals";
  if (t === "company") return "companies";
  if (t === "engagement") return "engagements";
  return "contacts";
}

async function fetchHubspot(token: string, path: string, id: string) {
  const res = await fetch(`${HUBSPOT_API}/crm/v3/objects/${path}/${id}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`HubSpot fetch ${res.status}: ${await res.text()}`);
  return res.json();
}

async function mirrorUpdate(
  supabase: SupabaseClient,
  accountId: string,
  objectType: string,
  id: string,
  updates: Record<string, unknown>,
) {
  const table =
    objectType === "deal" ? "mirror_deals"
    : objectType === "company" ? "mirror_companies"
    : objectType === "engagement" ? "mirror_engagements"
    : "mirror_contacts";

  const patch: Record<string, unknown> = { synced_at: new Date().toISOString() };
  if (objectType === "contact") {
    if (updates.email) patch.email = updates.email;
    if (updates.firstname) patch.first_name = updates.firstname;
    if (updates.lastname) patch.last_name = updates.lastname;
  }
  await supabase.from(table).update(patch).eq("account_id", accountId).eq("hubspot_id", id);
}

// ---- Duplicate merges (HubSpot CRM v3 contacts merge endpoint) ----
async function runMerges(
  supabase: SupabaseClient,
  account: any,
  action: any,
  merges: Array<{ primary: string; secondary: string }>,
) {
  let processed = 0;
  let failures = 0;
  let skipped = 0;
  try {
    const accessToken = await getAccessToken(supabase, account);

    for (const m of merges) {
      const primary = normalizeHubspotId(m?.primary);
      const secondary = normalizeHubspotId(m?.secondary);
      try {
        if (!primary || !secondary || primary === secondary) {
          throw new HubspotNotFoundError(
            `Invalid merge pair (primary=${m?.primary}, secondary=${m?.secondary})`,
          );
        }

        const before = await fetchHubspot(accessToken, "contacts", secondary);
        if (!before) {
          throw new HubspotNotFoundError(`contact ${secondary} not found in HubSpot`);
        }
        const res = await fetch(`${HUBSPOT_API}/crm/v3/objects/contacts/merge`, {
          method: "POST",
          headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
          body: JSON.stringify({ primaryObjectId: primary, objectIdToMerge: secondary }),
        });
        if (res.status === 404) {
          throw new HubspotNotFoundError(`contact ${secondary} or ${primary} not found in HubSpot`);
        }
        if (res.status === 403) {
          const body = await res.text();
          if (isMissingScopes(body)) throw new HubspotMissingScopesError(SCOPE_HINT);
          throw new Error(`HubSpot rejected merge (403). ${body}`);
        }
        if (!res.ok) throw new Error(`HubSpot ${res.status}: ${await res.text()}`);

        await supabase.from("hygiene_log").insert({
          action_id: action.id,
          account_id: action.account_id,
          hubspot_object_type: "contact",
          hubspot_object_id: secondary,
          field_changes: [{ field: "_merged_into", before: null, after: primary }],
          before_value: before?.properties || {},
          after_value: { merged_into: primary },
          success: true,
        });

        // Remove the merged-away record from the local mirror so the UI updates immediately
        await supabase
          .from("mirror_contacts")
          .delete()
          .eq("account_id", action.account_id)
          .eq("hubspot_id", secondary);
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        if (err instanceof HubspotMissingScopesError) {
          await supabase
            .from("hygiene_actions")
            .update({
              status: "failed",
              error_message: SCOPE_HINT,
              progress: { processed, total: merges.length, skipped, failures, message: SCOPE_HINT, error_kind: "missing_scopes" },
            })
            .eq("id", action.id);
          return;
        }
        const isSkip = err instanceof HubspotNotFoundError;
        if (isSkip) skipped++; else failures++;
        await supabase.from("hygiene_log").insert({
          action_id: action.id,
          account_id: action.account_id,
          hubspot_object_type: "contact",
          hubspot_object_id: secondary || String(m?.secondary || "unknown"),
          field_changes: [],
          before_value: { primary: m?.primary, secondary: m?.secondary },
          after_value: {},
          success: false,
          error_message: isSkip ? `Skipped: ${message}` : message,
        });
      }
      processed++;
      if (processed % 5 === 0) {
        await supabase
          .from("hygiene_actions")
          .update({ progress: { processed, total: merges.length, skipped, failures, message: `Merging ${processed} of ${merges.length}` } })
          .eq("id", action.id);
        if (await isCancelled(supabase, action.id)) {
          await supabase
            .from("hygiene_actions")
            .update({
              status: "cancelled",
              error_message: "Cancelled by user",
              executed_at: new Date().toISOString(),
              progress: { processed, total: merges.length, skipped, failures, message: `Cancelled at ${processed} of ${merges.length}` },
            })
            .eq("id", action.id);
          return;
        }
      }
      await sleep(RATE_DELAY_MS);
    }

    const succeeded = processed - failures - skipped;
    await supabase
      .from("hygiene_actions")
      .update({
        status: succeeded === 0 && failures > 0 ? "failed" : "executed",
        executed_at: new Date().toISOString(),
        progress: { processed, total: merges.length, skipped, failures, message: `Done (${failures} failed, ${skipped} skipped)` },
        error_message: failures ? `${failures} of ${merges.length} merges failed` : null,
      })
      .eq("id", action.id);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[hygiene-execute] merge fatal", err);
    await supabase
      .from("hygiene_actions")
      .update({ status: "failed", error_message: message })
      .eq("id", action.id);
  }
}

// ---- HubSpot OAuth helper (mirrors hubspot-sync) ----
async function getAccessToken(admin: SupabaseClient, account: any): Promise<string> {
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

  if (!account.hubspot_refresh_token_encrypted) {
    throw new Error("HubSpot is not connected (no refresh token). Reconnect HubSpot from the Dashboard, then retry.");
  }
  const { data: refreshToken } = await admin.rpc("decrypt_token", {
    _ciphertext: account.hubspot_refresh_token_encrypted,
    _key: key,
  });
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
