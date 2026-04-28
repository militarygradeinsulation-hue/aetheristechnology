// Operator Assistant — execute a previously proposed action.
// Frontend calls this after the user clicks Confirm on a proposed_action card.
// Performs the HubSpot write (or app-action) and logs before/after to
// assistant_actions for the audit trail and 24h undo window.

import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { getHubSpotAccessToken, HUBSPOT_API_BASE } from "../_shared/hubspot-token.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { ...corsHeaders, "Content-Type": "application/json" } });

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const RATE_DELAY_MS = 110;

const WRITE_SCOPES = ["crm.objects.contacts.write", "crm.objects.deals.write", "crm.objects.companies.write"];
const APP_ACTION_TOOLS = ["trigger_sync", "trigger_hygiene_scan", "trigger_leak_audit"];

function objectPath(t: "contact" | "deal" | "company"): string {
  return t === "contact" ? "contacts" : t === "deal" ? "deals" : "companies";
}

async function fetchHubSpot(method: string, url: string, token: string, body?: unknown) {
  const res = await fetch(url, {
    method,
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let parsed: any = null;
  try { parsed = text ? JSON.parse(text) : null; } catch { /* keep text */ }
  if (!res.ok) {
    throw new Error(`HubSpot ${method} ${res.status}: ${text.slice(0, 300)}`);
  }
  return parsed;
}

async function loadMirror(admin: SupabaseClient, accountId: string, type: "contact" | "deal" | "company", id: string) {
  const table = type === "contact" ? "mirror_contacts" : type === "deal" ? "mirror_deals" : "mirror_companies";
  const { data } = await admin.from(table).select("*").eq("account_id", accountId).eq("hubspot_id", id).maybeSingle();
  return data;
}

// Re-fetch a record from HubSpot and compare against the properties we just wrote.
// Returns a per-field verification map plus a boolean overall-verified flag.
async function verifyHubSpot(
  type: "contact" | "deal" | "company",
  id: string,
  token: string,
  written: Record<string, unknown>,
): Promise<{ verified: boolean; fields: Record<string, { written: unknown; actual: unknown; match: boolean }>; raw: Record<string, unknown> | null }> {
  const keys = Object.keys(written);
  if (!keys.length) return { verified: true, fields: {}, raw: null };
  try {
    const url = `${HUBSPOT_API_BASE}/crm/v3/objects/${objectPath(type)}/${id}?properties=${encodeURIComponent(keys.join(","))}`;
    const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
    if (!res.ok) return { verified: false, fields: {}, raw: null };
    const body = await res.json();
    const actual = (body?.properties || {}) as Record<string, unknown>;
    const fields: Record<string, { written: unknown; actual: unknown; match: boolean }> = {};
    let allMatch = true;
    for (const k of keys) {
      const w = written[k];
      const a = actual[k];
      // HubSpot normalizes a lot (strings, casing on enums, currency formatting). Compare loosely.
      const match = String(w ?? "").trim().toLowerCase() === String(a ?? "").trim().toLowerCase();
      if (!match) allMatch = false;
      fields[k] = { written: w, actual: a, match };
    }
    return { verified: allMatch, fields, raw: actual };
  } catch (e) {
    console.error("[assistant-execute] verify failed", id, (e as Error).message);
    return { verified: false, fields: {}, raw: null };
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "POST only" }, 405);

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "Unauthorized" }, 401);

    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { data: { user }, error: uErr } = await admin.auth.getUser(authHeader.replace("Bearer ", ""));
    if (uErr || !user) return json({ error: "Unauthorized" }, 401);

    const { conversation_id, tool_name, args } = await req.json();
    if (!tool_name || typeof tool_name !== "string") return json({ error: "tool_name required" }, 400);

    const { data: account } = await admin.from("accounts").select("*").eq("user_id", user.id).maybeSingle();
    if (!account) return json({ error: "No account on file" }, 404);

    if (conversation_id) {
      const { data: convo } = await admin.from("assistant_conversations").select("account_id").eq("id", conversation_id).maybeSingle();
      if (!convo || convo.account_id !== account.id) return json({ error: "Forbidden" }, 403);
    }

    // Insert a pending action row
    const { data: actionRow, error: insErr } = await admin
      .from("assistant_actions")
      .insert({
        conversation_id: conversation_id || null,
        account_id: account.id,
        user_id: user.id,
        tool_name,
        args: args || {},
        status: "executing",
      })
      .select()
      .single();
    if (insErr) return json({ error: insErr.message }, 500);

    let resultMessage = "";
    let beforeState: any = null;
    let afterState: any = null;
    let affected = 0;

    try {
      // ---------- App-action tools ----------
      if (APP_ACTION_TOOLS.includes(tool_name)) {
        const fnName = tool_name === "trigger_sync" ? "hubspot-sync"
                     : tool_name === "trigger_hygiene_scan" ? "hygiene-scan"
                     : "run-audit";
        const body = tool_name === "trigger_sync"
          ? { account_id: account.id, mode: args?.mode || "incremental" }
          : { account_id: account.id };
        const invokeUrl = `${Deno.env.get("SUPABASE_URL")}/functions/v1/${fnName}`;
        const inv = await fetch(invokeUrl, {
          method: "POST",
          headers: { Authorization: authHeader, "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        const txt = await inv.text();
        if (!inv.ok) throw new Error(`${fnName} returned ${inv.status}: ${txt.slice(0, 300)}`);
        resultMessage = `Started ${fnName}.`;
        afterState = { invoked: fnName, response: txt.slice(0, 500) };

      // ---------- Single-record writes ----------
      } else if (tool_name === "update_contact" || tool_name === "update_deal" || tool_name === "update_company") {
        if (!WRITE_SCOPES.every((s) => (account.hubspot_scopes || "").includes(s))) {
          throw new Error("HubSpot write scopes not granted. Reconnect HubSpot from Settings.");
        }
        const t = tool_name.replace("update_", "") as "contact" | "deal" | "company";
        const id = String(args.hubspot_id);
        const props = args.properties || {};
        if (!id) throw new Error("hubspot_id required");
        if (!Object.keys(props).length) throw new Error("properties required");

        beforeState = await loadMirror(admin, account.id, t, id);
        const token = await getHubSpotAccessToken(admin, account);
        const url = `${HUBSPOT_API_BASE}/crm/v3/objects/${objectPath(t)}/${id}`;
        const res = await fetchHubSpot("PATCH", url, token, { properties: props });
        // Verify by re-fetching from HubSpot
        const verify = await verifyHubSpot(t, id, token, props as Record<string, unknown>);
        afterState = { hubspot_response: res, hubspot_verified: verify };
        affected = 1;
        const portalId = account.hubspot_portal_id;
        const link = portalId ? `https://app.hubspot.com/contacts/${portalId}/${objectPath(t)}/${id}` : null;
        resultMessage = verify.verified
          ? `Updated ${t} ${id} — verified in HubSpot${link ? ` (${link})` : ""}.`
          : `Updated ${t} ${id} but HubSpot returned different values for some fields. Check the change log.`;

      // ---------- Bulk update deals ----------
      } else if (tool_name === "bulk_update_deals") {
        if (!WRITE_SCOPES.every((s) => (account.hubspot_scopes || "").includes(s))) {
          throw new Error("HubSpot write scopes not granted. Reconnect HubSpot from Settings.");
        }
        const f = args.filter || {};
        const props = args.properties || {};
        if (!Object.keys(props).length) throw new Error("properties required");

        let q = admin.from("mirror_deals").select("hubspot_id").eq("account_id", account.id);
        if (f.stage) q = q.eq("stage", f.stage);
        if (f.owner_id) q = q.eq("owner_id", f.owner_id);
        if (typeof f.min_amount === "number") q = q.gte("amount", f.min_amount);
        if (typeof f.max_amount === "number") q = q.lte("amount", f.max_amount);
        if (typeof f.stalled_days === "number") {
          const cutoff = new Date(Date.now() - f.stalled_days * 86400_000).toISOString();
          q = q.lt("last_activity_date", cutoff);
        }
        q = q.limit(500);
        const { data: rows } = await q;
        const ids = (rows || []).map((r: any) => r.hubspot_id).filter(Boolean);
        if (!ids.length) {
          resultMessage = "No deals matched the filter. Nothing to update.";
        } else {
          const token = await getHubSpotAccessToken(admin, account);
          const beforeRows = await admin.from("mirror_deals").select("hubspot_id,stage,amount,owner_id,name").eq("account_id", account.id).in("hubspot_id", ids);
          beforeState = { deals: beforeRows.data };
          let ok = 0;
          let fail = 0;
          const okIds: string[] = [];
          for (const id of ids) {
            try {
              await fetchHubSpot("PATCH", `${HUBSPOT_API_BASE}/crm/v3/objects/deals/${id}`, token, { properties: props });
              ok++;
              okIds.push(id);
            } catch (e) {
              fail++;
              console.error("[assistant-execute] bulk PATCH failed", id, (e as Error).message);
            }
            await sleep(RATE_DELAY_MS);
          }
          // Sample-verify the first 5 successful writes (round-trip GET)
          const sampleVerify: Array<{ id: string; verified: boolean; fields: Record<string, unknown> }> = [];
          for (const id of okIds.slice(0, 5)) {
            const v = await verifyHubSpot("deal", id, token, props as Record<string, unknown>);
            sampleVerify.push({ id, verified: v.verified, fields: v.fields });
          }
          affected = ok;
          afterState = { updated: ok, failed: fail, ids, sample_verified: sampleVerify };
          const verifiedOk = sampleVerify.filter((v) => v.verified).length;
          resultMessage = `Updated ${ok} of ${ids.length} deals${fail ? ` (${fail} failed)` : ""}. Verified ${verifiedOk}/${sampleVerify.length} sampled in HubSpot.`;
        }

      // ---------- Reassign deals ----------
      } else if (tool_name === "reassign_deals") {
        if (!WRITE_SCOPES.every((s) => (account.hubspot_scopes || "").includes(s))) {
          throw new Error("HubSpot write scopes not granted. Reconnect HubSpot from Settings.");
        }
        const from = String(args.from_owner_id);
        const to = String(args.to_owner_id);
        if (!from || !to) throw new Error("from_owner_id and to_owner_id required");
        const { data: rows } = await admin
          .from("mirror_deals")
          .select("hubspot_id,owner_id,name,stage")
          .eq("account_id", account.id)
          .eq("owner_id", from)
          .not("stage", "ilike", "closed_%")
          .limit(500);
        const ids = (rows || []).map((r: any) => r.hubspot_id);
        if (!ids.length) {
          resultMessage = `No open deals owned by ${from}. Nothing to reassign.`;
        } else {
          beforeState = { deals: rows };
          const token = await getHubSpotAccessToken(admin, account);
          let ok = 0;
          let fail = 0;
          for (const id of ids) {
            try {
              await fetchHubSpot("PATCH", `${HUBSPOT_API_BASE}/crm/v3/objects/deals/${id}`, token, { properties: { hubspot_owner_id: to } });
              ok++;
            } catch (e) {
              fail++;
              console.error("[assistant-execute] reassign failed", id, (e as Error).message);
            }
            await sleep(RATE_DELAY_MS);
          }
          affected = ok;
          afterState = { reassigned: ok, failed: fail, from, to };
          resultMessage = `Reassigned ${ok} of ${ids.length} deals from owner ${from} to ${to}${fail ? ` (${fail} failed)` : ""}.`;
        }

      } else {
        throw new Error(`Unsupported tool: ${tool_name}`);
      }

      // Determine final status: 'partial' if a verify pass disagreed with what we wrote
      const verifyBlock = (afterState as any)?.hubspot_verified;
      const sampleBlock = (afterState as any)?.sample_verified as Array<{ verified: boolean }> | undefined;
      const singleMismatch = verifyBlock && verifyBlock.verified === false;
      const sampleMismatch = Array.isArray(sampleBlock) && sampleBlock.length > 0 && sampleBlock.some((v) => !v.verified);
      const finalStatus = singleMismatch || sampleMismatch ? "partial" : "success";

      await admin
        .from("assistant_actions")
        .update({
          status: finalStatus,
          before_state: beforeState,
          after_state: afterState,
          affected_count: affected,
          executed_at: new Date().toISOString(),
        })
        .eq("id", actionRow.id);

      // Append a tool-result message to the conversation so the model has context next turn
      if (conversation_id) {
        await admin.from("assistant_messages").insert({
          conversation_id,
          role: "assistant",
          content: `${finalStatus === "success" ? "✓" : "⚠"} ${resultMessage}`,
        });
      }

      return json({ ok: true, status: finalStatus, action_id: actionRow.id, message: resultMessage, affected, after_state: afterState, before_state: beforeState });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed";
      console.error("[assistant-execute] tool error", tool_name, msg);
      await admin
        .from("assistant_actions")
        .update({ status: "error", error_message: msg, executed_at: new Date().toISOString() })
        .eq("id", actionRow.id);
      if (conversation_id) {
        await admin.from("assistant_messages").insert({
          conversation_id,
          role: "assistant",
          content: `⚠️ Failed: ${msg}`,
        });
      }
      return json({ ok: false, action_id: actionRow.id, error: msg }, 400);
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Failed";
    console.error("[assistant-execute] fatal", err);
    return json({ error: msg }, 500);
  }
});
