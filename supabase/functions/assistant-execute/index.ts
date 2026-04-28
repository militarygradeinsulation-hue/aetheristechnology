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
const APP_ACTION_TOOLS = [
  "trigger_sync", "trigger_hygiene_scan", "trigger_leak_audit",
  "approve_hygiene_action", "reject_hygiene_action", "execute_hygiene_action",
  "undo_assistant_action", "archive_audit", "restore_audit", "delete_audit_permanently",
  "disconnect_hubspot", "reconnect_hubspot",
];

function requireWriteScopes(account: any) {
  if (!WRITE_SCOPES.every((s) => (account.hubspot_scopes || "").includes(s))) {
    throw new Error("HubSpot write scopes not granted. Reconnect HubSpot from Settings.");
  }
}

// HubSpot association type ids (default labels) for v4 default-types endpoint
const ASSOC_DEFAULT_PATH: Record<string, Record<string, string>> = {
  contact: { deal: "contact_to_deal", company: "contact_to_company" },
  deal:    { contact: "deal_to_contact", company: "deal_to_company" },
  company: { contact: "company_to_contact", deal: "company_to_deal" },
};

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

    let { conversation_id, tool_name, args } = await req.json();
    if (!tool_name || typeof tool_name !== "string") return json({ error: "tool_name required" }, 400);

    // ---- Shorthand expansions (must run before dispatch + before insert) ----
    if (tool_name === "set_lifecycle_stage") {
      if (!args?.stage) return json({ error: "stage required" }, 400);
      args = { filter: args.filter || {}, properties: { lifecyclestage: String(args.stage) } };
      tool_name = "bulk_update_contacts";
    }

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
        // Sub-dispatch: hygiene queue management
        if (tool_name === "approve_hygiene_action" || tool_name === "reject_hygiene_action") {
          const newStatus = tool_name === "approve_hygiene_action" ? "approved" : "rejected";
          const { data: act, error } = await admin
            .from("hygiene_actions")
            .update({ status: newStatus, approved_at: newStatus === "approved" ? new Date().toISOString() : null })
            .eq("id", String(args.action_id))
            .eq("account_id", account.id)
            .select()
            .single();
          if (error) throw new Error(error.message);
          resultMessage = `Hygiene action ${args.action_id} marked ${newStatus}.`;
          afterState = { hygiene_action: act };

        } else if (tool_name === "execute_hygiene_action") {
          // Approve then invoke hygiene-execute
          await admin
            .from("hygiene_actions")
            .update({ status: "approved", approved_at: new Date().toISOString() })
            .eq("id", String(args.action_id))
            .eq("account_id", account.id);
          const invokeUrl = `${Deno.env.get("SUPABASE_URL")}/functions/v1/hygiene-execute`;
          const inv = await fetch(invokeUrl, {
            method: "POST",
            headers: { Authorization: authHeader, "Content-Type": "application/json" },
            body: JSON.stringify({ action_id: String(args.action_id) }),
          });
          const txt = await inv.text();
          if (!inv.ok) throw new Error(`hygiene-execute returned ${inv.status}: ${txt.slice(0, 300)}`);
          resultMessage = `Approved & started hygiene fix ${args.action_id}.`;
          afterState = { invoked: "hygiene-execute", response: txt.slice(0, 500) };

        } else if (tool_name === "undo_assistant_action") {
          const invokeUrl = `${Deno.env.get("SUPABASE_URL")}/functions/v1/assistant-undo`;
          const inv = await fetch(invokeUrl, {
            method: "POST",
            headers: { Authorization: authHeader, "Content-Type": "application/json" },
            body: JSON.stringify({ action_id: String(args.action_id) }),
          });
          const txt = await inv.text();
          if (!inv.ok) throw new Error(`assistant-undo returned ${inv.status}: ${txt.slice(0, 300)}`);
          resultMessage = `Undid prior action ${args.action_id}.`;
          afterState = { invoked: "assistant-undo", response: txt.slice(0, 500) };

        } else if (tool_name === "archive_audit") {
          const { error } = await admin.from("audit_runs")
            .update({ deleted_at: new Date().toISOString() })
            .eq("id", String(args.audit_id))
            .eq("account_id", account.id);
          if (error) throw new Error(error.message);
          resultMessage = `Audit ${args.audit_id} moved to trash.`;

        } else if (tool_name === "restore_audit") {
          const { error } = await admin.from("audit_runs")
            .update({ deleted_at: null })
            .eq("id", String(args.audit_id))
            .eq("account_id", account.id);
          if (error) throw new Error(error.message);
          resultMessage = `Audit ${args.audit_id} restored.`;

        } else if (tool_name === "delete_audit_permanently") {
          const { error } = await admin.from("audit_runs")
            .delete()
            .eq("id", String(args.audit_id))
            .eq("account_id", account.id);
          if (error) throw new Error(error.message);
          resultMessage = `Audit ${args.audit_id} permanently deleted.`;

        } else if (tool_name === "disconnect_hubspot") {
          const invokeUrl = `${Deno.env.get("SUPABASE_URL")}/functions/v1/hubspot-disconnect`;
          const inv = await fetch(invokeUrl, {
            method: "POST",
            headers: { Authorization: authHeader, "Content-Type": "application/json" },
            body: JSON.stringify({}),
          });
          const txt = await inv.text();
          if (!inv.ok) throw new Error(`hubspot-disconnect returned ${inv.status}: ${txt.slice(0, 300)}`);
          resultMessage = "HubSpot disconnected.";
          afterState = { invoked: "hubspot-disconnect" };

        } else if (tool_name === "reconnect_hubspot") {
          resultMessage = "Opening Settings — click 'Reconnect HubSpot' to re-authorize.";
          afterState = { navigate_to: "/app/settings", toast: "Click Reconnect HubSpot to re-authorize." };

        } else {
          // trigger_sync / trigger_hygiene_scan / trigger_leak_audit
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
        }

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

      // ---------- Create record ----------
      } else if (tool_name === "create_contact" || tool_name === "create_deal" || tool_name === "create_company") {
        requireWriteScopes(account);
        const t = tool_name.replace("create_", "") as "contact" | "deal" | "company";
        const props = args.properties || {};
        if (!Object.keys(props).length) throw new Error("properties required");
        const token = await getHubSpotAccessToken(admin, account);
        const created = await fetchHubSpot(
          "POST",
          `${HUBSPOT_API_BASE}/crm/v3/objects/${objectPath(t)}`,
          token,
          { properties: props },
        );
        const newId = created?.id;
        // Optional associations on deal create
        if (t === "deal" && newId) {
          if (args.associate_contact_id) {
            try {
              await fetchHubSpot(
                "PUT",
                `${HUBSPOT_API_BASE}/crm/v4/objects/deals/${newId}/associations/default/contacts/${args.associate_contact_id}`,
                token,
              );
            } catch (e) { console.error("[create_deal] assoc contact failed", (e as Error).message); }
          }
          if (args.associate_company_id) {
            try {
              await fetchHubSpot(
                "PUT",
                `${HUBSPOT_API_BASE}/crm/v4/objects/deals/${newId}/associations/default/companies/${args.associate_company_id}`,
                token,
              );
            } catch (e) { console.error("[create_deal] assoc company failed", (e as Error).message); }
          }
        }
        affected = 1;
        afterState = { hubspot_response: created };
        const portalId = account.hubspot_portal_id;
        const link = portalId && newId ? `https://app.hubspot.com/contacts/${portalId}/${objectPath(t)}/${newId}` : null;
        resultMessage = `Created ${t} ${newId || ""}${link ? ` (${link})` : ""}.`;

      // ---------- Delete record ----------
      } else if (tool_name === "delete_contact" || tool_name === "delete_deal" || tool_name === "delete_company") {
        requireWriteScopes(account);
        const t = tool_name.replace("delete_", "") as "contact" | "deal" | "company";
        const id = String(args.hubspot_id);
        if (!id) throw new Error("hubspot_id required");
        beforeState = await loadMirror(admin, account.id, t, id);
        const token = await getHubSpotAccessToken(admin, account);
        await fetchHubSpot("DELETE", `${HUBSPOT_API_BASE}/crm/v3/objects/${objectPath(t)}/${id}`, token);
        affected = 1;
        afterState = { archived: true, id };
        resultMessage = `Archived ${t} ${id} in HubSpot.`;

      // ---------- Bulk update contacts ----------
      } else if (tool_name === "bulk_update_contacts") {
        requireWriteScopes(account);
        const f = args.filter || {};
        const props = args.properties || {};
        if (!Object.keys(props).length) throw new Error("properties required");
        let q = admin.from("mirror_contacts").select("hubspot_id").eq("account_id", account.id);
        if (f.lifecycle_stage) q = q.eq("lifecycle_stage", f.lifecycle_stage);
        if (f.owner_id) q = q.eq("owner_id", f.owner_id);
        if (f.search) q = q.or(`first_name.ilike.%${f.search}%,last_name.ilike.%${f.search}%,email.ilike.%${f.search}%`);
        if (typeof f.inactive_days === "number") {
          const cutoff = new Date(Date.now() - f.inactive_days * 86400_000).toISOString();
          q = q.lt("last_activity_date", cutoff);
        }
        q = q.limit(500);
        const { data: rows } = await q;
        const ids = (rows || []).map((r: any) => r.hubspot_id).filter(Boolean);
        if (!ids.length) {
          resultMessage = "No contacts matched the filter.";
        } else {
          const token = await getHubSpotAccessToken(admin, account);
          const beforeRows = await admin.from("mirror_contacts").select("hubspot_id,email,lifecycle_stage").eq("account_id", account.id).in("hubspot_id", ids);
          beforeState = { contacts: beforeRows.data };
          let ok = 0, fail = 0;
          for (const id of ids) {
            try {
              await fetchHubSpot("PATCH", `${HUBSPOT_API_BASE}/crm/v3/objects/contacts/${id}`, token, { properties: props });
              ok++;
            } catch (e) { fail++; console.error("[bulk_update_contacts] failed", id, (e as Error).message); }
            await sleep(RATE_DELAY_MS);
          }
          affected = ok;
          afterState = { updated: ok, failed: fail, ids };
          resultMessage = `Updated ${ok} of ${ids.length} contacts${fail ? ` (${fail} failed)` : ""}.`;
        }

      // ---------- Bulk update companies ----------
      } else if (tool_name === "bulk_update_companies") {
        requireWriteScopes(account);
        const f = args.filter || {};
        const props = args.properties || {};
        if (!Object.keys(props).length) throw new Error("properties required");
        let q = admin.from("mirror_companies").select("hubspot_id").eq("account_id", account.id);
        if (f.industry) q = q.eq("industry", f.industry);
        if (f.owner_id) q = q.eq("owner_id", f.owner_id);
        if (f.search) q = q.or(`name.ilike.%${f.search}%,domain.ilike.%${f.search}%`);
        if (typeof f.min_employees === "number") q = q.gte("num_employees", f.min_employees);
        if (typeof f.max_employees === "number") q = q.lte("num_employees", f.max_employees);
        if (typeof f.inactive_days === "number") {
          const cutoff = new Date(Date.now() - f.inactive_days * 86400_000).toISOString();
          q = q.lt("last_activity_date", cutoff);
        }
        q = q.limit(500);
        const { data: rows } = await q;
        const ids = (rows || []).map((r: any) => r.hubspot_id).filter(Boolean);
        if (!ids.length) {
          resultMessage = "No companies matched the filter.";
        } else {
          const token = await getHubSpotAccessToken(admin, account);
          const beforeRows = await admin.from("mirror_companies").select("hubspot_id,name,domain,industry").eq("account_id", account.id).in("hubspot_id", ids);
          beforeState = { companies: beforeRows.data };
          let ok = 0, fail = 0;
          for (const id of ids) {
            try {
              await fetchHubSpot("PATCH", `${HUBSPOT_API_BASE}/crm/v3/objects/companies/${id}`, token, { properties: props });
              ok++;
            } catch (e) { fail++; console.error("[bulk_update_companies] failed", id, (e as Error).message); }
            await sleep(RATE_DELAY_MS);
          }
          affected = ok;
          afterState = { updated: ok, failed: fail, ids };
          resultMessage = `Updated ${ok} of ${ids.length} companies${fail ? ` (${fail} failed)` : ""}.`;
        }

      // ---------- Bulk delete deals ----------
      } else if (tool_name === "bulk_delete_deals") {
        requireWriteScopes(account);
        const f = args.filter || {};
        let q = admin.from("mirror_deals").select("hubspot_id,deal_name,stage,amount,owner_id").eq("account_id", account.id);
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
          resultMessage = "No deals matched the filter.";
        } else {
          beforeState = { deals: rows };
          const token = await getHubSpotAccessToken(admin, account);
          let ok = 0, fail = 0;
          for (const id of ids) {
            try {
              await fetchHubSpot("DELETE", `${HUBSPOT_API_BASE}/crm/v3/objects/deals/${id}`, token);
              ok++;
            } catch (e) { fail++; console.error("[bulk_delete_deals] failed", id, (e as Error).message); }
            await sleep(RATE_DELAY_MS);
          }
          affected = ok;
          afterState = { archived: ok, failed: fail, ids };
          resultMessage = `Archived ${ok} of ${ids.length} deals${fail ? ` (${fail} failed)` : ""}.`;
        }

      // ---------- Add note ----------
      } else if (tool_name === "add_note_to_record") {
        requireWriteScopes(account);
        const t = String(args.type) as "contact" | "deal" | "company";
        const id = String(args.hubspot_id);
        const body = String(args.body || "");
        if (!id || !body) throw new Error("type, hubspot_id, body required");
        const token = await getHubSpotAccessToken(admin, account);
        // Create note then associate
        const created = await fetchHubSpot("POST", `${HUBSPOT_API_BASE}/crm/v3/objects/notes`, token, {
          properties: { hs_note_body: body, hs_timestamp: Date.now() },
        });
        const noteId = created?.id;
        if (noteId) {
          try {
            await fetchHubSpot(
              "PUT",
              `${HUBSPOT_API_BASE}/crm/v4/objects/notes/${noteId}/associations/default/${objectPath(t)}/${id}`,
              token,
            );
          } catch (e) { console.error("[add_note] assoc failed", (e as Error).message); }
        }
        affected = 1;
        afterState = { note_id: noteId };
        resultMessage = `Added note to ${t} ${id}.`;

      // ---------- Create task ----------
      } else if (tool_name === "create_task_for_record") {
        requireWriteScopes(account);
        const t = String(args.type) as "contact" | "deal" | "company";
        const id = String(args.hubspot_id);
        if (!id || !args.subject) throw new Error("type, hubspot_id, subject required");
        const dueMs = Date.now() + ((Number(args.due_in_days) || 1) * 86400_000);
        const props: Record<string, unknown> = {
          hs_task_subject: args.subject,
          hs_task_body: args.body || "",
          hs_task_status: "NOT_STARTED",
          hs_task_priority: args.priority || "MEDIUM",
          hs_timestamp: dueMs,
        };
        if (args.owner_id) props.hubspot_owner_id = args.owner_id;
        const token = await getHubSpotAccessToken(admin, account);
        const created = await fetchHubSpot("POST", `${HUBSPOT_API_BASE}/crm/v3/objects/tasks`, token, { properties: props });
        const taskId = created?.id;
        if (taskId) {
          try {
            await fetchHubSpot(
              "PUT",
              `${HUBSPOT_API_BASE}/crm/v4/objects/tasks/${taskId}/associations/default/${objectPath(t)}/${id}`,
              token,
            );
          } catch (e) { console.error("[create_task] assoc failed", (e as Error).message); }
        }
        affected = 1;
        afterState = { task_id: taskId };
        resultMessage = `Created task "${args.subject}" on ${t} ${id}.`;

      // ---------- Associate records ----------
      } else if (tool_name === "associate_records") {
        requireWriteScopes(account);
        const ft = String(args.from_type) as "contact" | "deal" | "company";
        const tt = String(args.to_type) as "contact" | "deal" | "company";
        const fid = String(args.from_id);
        const tid = String(args.to_id);
        if (!fid || !tid) throw new Error("from_id and to_id required");
        const token = await getHubSpotAccessToken(admin, account);
        await fetchHubSpot(
          "PUT",
          `${HUBSPOT_API_BASE}/crm/v4/objects/${objectPath(ft)}/${fid}/associations/default/${objectPath(tt)}/${tid}`,
          token,
        );
        affected = 1;
        afterState = { associated: { from: { type: ft, id: fid }, to: { type: tt, id: tid } } };
        resultMessage = `Associated ${ft} ${fid} ↔ ${tt} ${tid}.`;

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
