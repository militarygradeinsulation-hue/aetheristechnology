// Send an email through the calling rep's connected Outlook account via Microsoft Graph.
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

function toRecipientList(s: unknown): Array<{ emailAddress: { address: string } }> {
  if (!s) return [];
  const arr = Array.isArray(s)
    ? s
    : String(s).split(/[,;]/).map((x) => x.trim()).filter(Boolean);
  return arr
    .map((a: string) => (typeof a === "string" ? a.trim() : ""))
    .filter((a) => a.includes("@"))
    .map((address: string) => ({ emailAddress: { address } }));
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SVC = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const claims = await verifyPortalToken(getPortalTokenFromRequest(req), SVC);
    if (!claims) return json(401, { error: "Unauthorized" });

    const body = await req.json().catch(() => ({}));
    const to = toRecipientList(body.to);
    const cc = toRecipientList(body.cc);
    const bcc = toRecipientList(body.bcc);
    const subject = String(body.subject || "").slice(0, 1000);
    const content = String(body.body || "");
    const contentType = body.html ? "HTML" : "Text";
    const saveToSent = body.save_to_sent !== false;

    if (to.length === 0) return json(400, { error: "Recipient required" });

    const sb = createClient(SUPABASE_URL, SVC);
    let tok;
    try {
      tok = await getValidAccessToken(sb, claims.code);
    } catch (e: any) {
      if (String(e.message) === "OUTLOOK_NOT_CONNECTED") return json(409, { error: "OUTLOOK_NOT_CONNECTED" });
      throw e;
    }

    const message = {
      subject,
      body: { contentType, content },
      toRecipients: to,
      ...(cc.length ? { ccRecipients: cc } : {}),
      ...(bcc.length ? { bccRecipients: bcc } : {}),
    };

    const r = await graphFetch(tok.access_token, "/me/sendMail", {
      method: "POST",
      body: JSON.stringify({ message, saveToSentItems: saveToSent }),
    });
    if (!r.ok) {
      console.error("sendMail failed", r.status, r.body);
      return json(r.status, { error: r.body?.error?.message || "Send failed" });
    }
    return json(200, { ok: true, from: tok.outlook_email });
  } catch (e: any) {
    console.error("outlook-send-mail", e);
    return json(500, { error: String(e?.message || e) });
  }
});
