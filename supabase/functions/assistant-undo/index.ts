// Operator Assistant — undo a previously executed action within 24h.
// Reads assistant_actions.before_state, issues the inverse PATCH against
// HubSpot, and marks the row undone.

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
const UNDO_WINDOW_MS = 24 * 60 * 60 * 1000;

function objectPath(t: string): string {
  if (t.includes("contact")) return "contacts";
  if (t.includes("company")) return "companies";
  return "deals";
}

async function patch(admin: SupabaseClient, account: any, type: string, id: string, properties: Record<string, unknown>) {
  const token = await getHubSpotAccessToken(admin, account);
  const res = await fetch(`${HUBSPOT_API_BASE}/crm/v3/objects/${objectPath(type)}/${id}`, {
    method: "PATCH",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ properties }),
  });
  if (!res.ok) throw new Error(`HubSpot PATCH ${res.status}: ${await res.text()}`);
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

    const { action_id } = await req.json();
    if (!action_id) return json({ error: "action_id required" }, 400);

    const { data: action } = await admin.from("assistant_actions").select("*").eq("id", action_id).maybeSingle();
    if (!action) return json({ error: "Action not found" }, 404);

    const { data: account } = await admin.from("accounts").select("*").eq("id", action.account_id).maybeSingle();
    if (!account || account.user_id !== user.id) return json({ error: "Forbidden" }, 403);

    if (action.status !== "success") return json({ error: `Cannot undo action in status ${action.status}` }, 400);
    if (action.undone_at) return json({ error: "Already undone" }, 400);
    if (Date.now() - new Date(action.executed_at).getTime() > UNDO_WINDOW_MS) {
      return json({ error: "Undo window expired (24h)" }, 400);
    }

    const before = action.before_state as any;
    if (!before) return json({ error: "No before-state recorded; cannot undo" }, 400);

    try {
      const t = action.tool_name as string;
      if (t === "update_contact" || t === "update_deal" || t === "update_company") {
        // Restore only the keys we wrote in args.properties
        const propsWritten = (action.args?.properties || {}) as Record<string, unknown>;
        const restore: Record<string, unknown> = {};
        for (const k of Object.keys(propsWritten)) {
          // before is the mirror record — try common columns first, then properties JSON
          const v = (before as any)[k] ?? (before as any).properties?.[k] ?? null;
          restore[k] = v;
        }
        await patch(admin, account, t, String(action.args.hubspot_id), restore);
      } else if (t === "bulk_update_deals") {
        const propsWritten = (action.args?.properties || {}) as Record<string, unknown>;
        const beforeDeals = (before.deals || []) as any[];
        for (const d of beforeDeals) {
          const restore: Record<string, unknown> = {};
          for (const k of Object.keys(propsWritten)) restore[k] = d[k] ?? null;
          try { await patch(admin, account, "deal", d.hubspot_id, restore); } catch (e) { console.error("undo bulk", d.hubspot_id, e); }
          await sleep(RATE_DELAY_MS);
        }
      } else if (t === "reassign_deals") {
        const beforeDeals = (before.deals || []) as any[];
        for (const d of beforeDeals) {
          try { await patch(admin, account, "deal", d.hubspot_id, { hubspot_owner_id: d.owner_id }); } catch (e) { console.error("undo reassign", d.hubspot_id, e); }
          await sleep(RATE_DELAY_MS);
        }
      } else {
        return json({ error: `Cannot undo tool type: ${t}` }, 400);
      }

      await admin
        .from("assistant_actions")
        .update({ status: "undone", undone_at: new Date().toISOString() })
        .eq("id", action_id);

      if (action.conversation_id) {
        await admin.from("assistant_messages").insert({
          conversation_id: action.conversation_id,
          role: "assistant",
          content: `↩︎ Undone: reverted ${action.tool_name}.`,
        });
      }

      return json({ ok: true });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed";
      console.error("[assistant-undo] error", msg);
      return json({ error: msg }, 500);
    }
  } catch (err) {
    return json({ error: err instanceof Error ? err.message : "Failed" }, 500);
  }
});
