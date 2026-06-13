// List the most recent Outlook messages between the rep and a given email address.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.86.0";
import { verifyPortalToken, getPortalTokenFromRequest } from "../_shared/portal-token.ts";
import { getValidAccessToken, graphFetch } from "../_shared/outlook-graph.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-portal-token, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};
const json = (s: number, b: unknown) =>
  new Response(JSON.stringify(b), { status: s, headers: { ...corsHeaders, "Content-Type": "application/json" } });

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SVC = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const claims = await verifyPortalToken(getPortalTokenFromRequest(req), SVC);
    if (!claims) return json(401, { error: "Unauthorized" });

    const body = await req.json().catch(() => ({}));
    const email = String(body.email || "").trim().toLowerCase();
    const top = Math.min(Math.max(Number(body.top) || 10, 1), 25);
    if (!email || !email.includes("@")) return json(400, { error: "email required" });

    const sb = createClient(SUPABASE_URL, SVC);
    let tok;
    try {
      tok = await getValidAccessToken(sb, claims.code);
    } catch (e: any) {
      if (String(e.message) === "OUTLOOK_NOT_CONNECTED") return json(409, { error: "OUTLOOK_NOT_CONNECTED" });
      throw e;
    }

    // Use OData filter for messages where the contact appears in from/to/cc.
    // Graph $search and $filter can't be combined easily; use $filter with from-only fallback if needed.
    const escaped = email.replace(/'/g, "''");
    const filter = `(from/emailAddress/address eq '${escaped}') or (toRecipients/any(r:r/emailAddress/address eq '${escaped}'))`;
    const select = "id,subject,from,toRecipients,receivedDateTime,bodyPreview,isRead,webLink,conversationId";
    const path = `/me/messages?$top=${top}&$select=${encodeURIComponent(select)}&$orderby=receivedDateTime%20desc&$filter=${encodeURIComponent(filter)}`;

    const r = await graphFetch(tok.access_token, path, { method: "GET" });
    if (!r.ok) {
      console.error("list messages failed", r.status, r.body);
      return json(r.status, { error: r.body?.error?.message || "List failed", messages: [] });
    }
    const items = (r.body?.value || []).map((m: any) => ({
      id: m.id,
      subject: m.subject || "(no subject)",
      from: m.from?.emailAddress?.address || "",
      from_name: m.from?.emailAddress?.name || "",
      to: (m.toRecipients || []).map((t: any) => t.emailAddress?.address).filter(Boolean),
      received: m.receivedDateTime,
      preview: m.bodyPreview || "",
      is_read: !!m.isRead,
      web_link: m.webLink || null,
      conversation_id: m.conversationId || null,
    }));
    return json(200, { ok: true, messages: items, from: tok.outlook_email });
  } catch (e: any) {
    console.error("outlook-list-messages", e);
    return json(500, { error: String(e?.message || e) });
  }
});
