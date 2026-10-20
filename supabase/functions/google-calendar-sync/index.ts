// Reads/writes Google Calendar events for the calling rep.
// Supports: list (fetches primary calendar), create (adds event to Google Calendar).
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.86.0";
import { verifyPortalToken, getPortalTokenFromRequest } from "../_shared/portal-token.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-portal-token, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};
const json = (s: number, b: unknown) => new Response(JSON.stringify(b), { status: s, headers: { ...corsHeaders, "Content-Type": "application/json" } });

async function getAccessToken(sb: any, repCode: string, clientId: string, clientSecret: string): Promise<string | null> {
  const { data } = await sb.from("google_oauth_tokens").select("*").eq("rep_code", repCode).maybeSingle();
  if (!data) return null;
  // Return existing token if still valid (with 60s buffer)
  if (new Date(data.expires_at).getTime() > Date.now() + 60000) return data.access_token;
  // Attempt refresh
  if (!data.refresh_token) return null;
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: "refresh_token",
      refresh_token: data.refresh_token,
    }),
  });
  const t = await res.json();
  if (!res.ok) return null;
  const expiresAt = new Date(Date.now() + (Number(t.expires_in) || 3600) * 1000).toISOString();
  await sb.from("google_oauth_tokens").update({
    access_token: t.access_token,
    expires_at: expiresAt,
    updated_at: new Date().toISOString(),
  }).eq("rep_code", repCode);
  return t.access_token;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SVC = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const CLIENT_ID = Deno.env.get("GOOGLE_OAUTH_CLIENT_ID");
    const CLIENT_SECRET = Deno.env.get("GOOGLE_OAUTH_CLIENT_SECRET");

    const claims = await verifyPortalToken(getPortalTokenFromRequest(req), SVC);
    if (!claims) return json(401, { error: "Unauthorized" });
    if (!CLIENT_ID || !CLIENT_SECRET) return json(500, { error: "Google OAuth not configured" });

    const sb = createClient(SUPABASE_URL, SVC);
    const body = await req.json().catch(() => ({}));
    const action = String(body.action || "list");

    const accessToken = await getAccessToken(sb, claims.code, CLIENT_ID, CLIENT_SECRET);
    if (!accessToken) return json(403, { error: "Google account not connected or token expired. Please reconnect." });

    if (action === "list") {
      const timeMin = body.from ? new Date(String(body.from)).toISOString() : new Date(Date.now() - 7 * 86400000).toISOString();
      const timeMax = body.to ? new Date(String(body.to)).toISOString() : new Date(Date.now() + 30 * 86400000).toISOString();
      const url = new URL("https://www.googleapis.com/calendar/v3/calendars/primary/events");
      url.searchParams.set("timeMin", timeMin);
      url.searchParams.set("timeMax", timeMax);
      url.searchParams.set("singleEvents", "true");
      url.searchParams.set("orderBy", "startTime");
      url.searchParams.set("maxResults", "50");
      const res = await fetch(url.toString(), { headers: { Authorization: `Bearer ${accessToken}` } });
      const data = await res.json();
      if (!res.ok) return json(res.status, { error: data.error?.message || "Google Calendar error" });
      return json(200, { events: data.items || [] });
    }

    if (action === "create") {
      const title = String(body.title || "").slice(0, 200);
      if (!title) return json(400, { error: "title required" });
      const startAt = body.start_at ? new Date(String(body.start_at)) : new Date();
      const endAt = body.end_at ? new Date(String(body.end_at)) : new Date(startAt.getTime() + 3600000);
      const event = {
        summary: title,
        description: body.body ? String(body.body).slice(0, 5000) : undefined,
        start: body.all_day ? { date: startAt.toISOString().slice(0, 10) } : { dateTime: startAt.toISOString(), timeZone: "UTC" },
        end: body.all_day ? { date: endAt.toISOString().slice(0, 10) } : { dateTime: endAt.toISOString(), timeZone: "UTC" },
      };
      const res = await fetch("https://www.googleapis.com/calendar/v3/calendars/primary/events", {
        method: "POST",
        headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
        body: JSON.stringify(event),
      });
      const created = await res.json();
      if (!res.ok) return json(res.status, { error: created.error?.message || "Google Calendar create error" });
      return json(200, { event: created });
    }

    return json(400, { error: "unknown action" });
  } catch (e: any) {
    console.error("google-calendar-sync", e);
    return json(500, { error: String(e?.message || e) });
  }
});
