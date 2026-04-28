// HubSpot Self-Test — proves end-to-end write access from this app.
// Picks one mirrored contact, fetches their current `firstname` from HubSpot,
// PATCHes the same value back (true no-op), re-fetches to confirm, and
// returns a green/red verdict with the raw HubSpot response. Use this from
// Settings to confirm the OAuth token actually has working write scopes.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { getHubSpotAccessToken, HUBSPOT_API_BASE } from "../_shared/hubspot-token.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { ...corsHeaders, "Content-Type": "application/json" } });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "POST only" }, 405);

  const steps: Array<{ step: string; ok: boolean; detail?: string }> = [];
  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ ok: false, error: "Unauthorized" }, 401);
    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { data: { user } } = await admin.auth.getUser(authHeader.replace("Bearer ", ""));
    if (!user) return json({ ok: false, error: "Unauthorized" }, 401);

    const { data: account } = await admin.from("accounts").select("*").eq("user_id", user.id).maybeSingle();
    if (!account?.hubspot_portal_id) {
      return json({ ok: false, error: "HubSpot is not connected. Connect from Settings first." }, 400);
    }
    steps.push({ step: "account_loaded", ok: true, detail: `portal ${account.hubspot_portal_id}` });

    if (!(account.hubspot_scopes || "").includes("crm.objects.contacts.write")) {
      return json({ ok: false, error: "Connection is missing crm.objects.contacts.write. Reconnect HubSpot.", steps }, 400);
    }
    steps.push({ step: "scopes_ok", ok: true });

    // Pick any mirrored contact
    const { data: contact } = await admin
      .from("mirror_contacts")
      .select("hubspot_id,first_name")
      .eq("account_id", account.id)
      .not("hubspot_id", "is", null)
      .limit(1)
      .maybeSingle();
    if (!contact?.hubspot_id) {
      return json({ ok: false, error: "No mirrored contacts to test against. Run a sync first.", steps }, 400);
    }
    steps.push({ step: "contact_picked", ok: true, detail: `id ${contact.hubspot_id}` });

    const token = await getHubSpotAccessToken(admin, account);
    steps.push({ step: "token_obtained", ok: true });

    // Read current firstname from HubSpot
    const readUrl = `${HUBSPOT_API_BASE}/crm/v3/objects/contacts/${contact.hubspot_id}?properties=firstname`;
    const readRes = await fetch(readUrl, { headers: { Authorization: `Bearer ${token}` } });
    if (!readRes.ok) {
      const t = await readRes.text();
      steps.push({ step: "read_before", ok: false, detail: `${readRes.status} ${t.slice(0, 200)}` });
      return json({ ok: false, error: `HubSpot read failed: ${readRes.status}`, steps }, 400);
    }
    const before = await readRes.json();
    const currentFirstName: string = before?.properties?.firstname ?? "";
    steps.push({ step: "read_before", ok: true, detail: `firstname="${currentFirstName}"` });

    // Write the same value back (no-op)
    const writeRes = await fetch(`${HUBSPOT_API_BASE}/crm/v3/objects/contacts/${contact.hubspot_id}`, {
      method: "PATCH",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ properties: { firstname: currentFirstName } }),
    });
    if (!writeRes.ok) {
      const t = await writeRes.text();
      steps.push({ step: "write_noop", ok: false, detail: `${writeRes.status} ${t.slice(0, 300)}` });
      return json({ ok: false, error: `HubSpot write failed: ${writeRes.status}`, steps, hubspot_response: t.slice(0, 500) }, 400);
    }
    steps.push({ step: "write_noop", ok: true });

    // Re-read and verify
    const verifyRes = await fetch(readUrl, { headers: { Authorization: `Bearer ${token}` } });
    const after = await verifyRes.json();
    const afterName: string = after?.properties?.firstname ?? "";
    const verified = afterName === currentFirstName;
    steps.push({ step: "verify_after", ok: verified, detail: `firstname="${afterName}"` });

    return json({
      ok: verified,
      message: verified
        ? `HubSpot write access confirmed. Round-trip succeeded against contact ${contact.hubspot_id}.`
        : `Write succeeded but re-read returned a different value.`,
      portal_id: account.hubspot_portal_id,
      contact_id: contact.hubspot_id,
      steps,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Failed";
    console.error("[hubspot-self-test] error", msg);
    return json({ ok: false, error: msg, steps }, 500);
  }
});
