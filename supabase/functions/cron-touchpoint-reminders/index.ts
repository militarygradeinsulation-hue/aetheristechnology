// Daily touchpoint reminders — sends each active rep an email listing today's
// calendar events (auto-scheduled cadence + manually created follow-ups/calls/tasks).
// Also usable in-portal as a "today" list via ?rep_code=XYZ.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.86.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status, headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function startOfDayUTC(d = new Date()) {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 0, 0, 0));
}
function endOfDayUTC(d = new Date()) {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 23, 59, 59));
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(SUPABASE_URL, SERVICE);

    const url = new URL(req.url);
    const dryRun = url.searchParams.get("dry_run") === "1";
    const singleRep = url.searchParams.get("rep_code");

    const from = startOfDayUTC().toISOString();
    const to = endOfDayUTC().toISOString();
    const dateLabel = new Date().toLocaleDateString("en-US", {
      weekday: "short", month: "short", day: "numeric",
    });

    // Load active reps (optionally filtered to one)
    let repsQuery = supabase.from("rep_codes")
      .select("code, rep_name, rep_email")
      .eq("is_active", true);
    if (singleRep) repsQuery = repsQuery.eq("code", singleRep);
    const { data: reps, error: repsErr } = await repsQuery;
    if (repsErr) throw repsErr;

    const summary: Array<{ code: string; count: number; sent: boolean; reason?: string }> = [];

    for (const rep of reps || []) {
      const { data: events } = await supabase.from("rep_calendar_events")
        .select("id, kind, title, body, start_at, all_day, lead_id, completed, created_by")
        .eq("rep_code", rep.code)
        .gte("start_at", from).lte("start_at", to)
        .eq("completed", false)
        .order("start_at");

      const list = events || [];
      if (list.length === 0) {
        summary.push({ code: rep.code, count: 0, sent: false, reason: "no touchpoints" });
        continue;
      }

      // Load lead names in one shot
      const leadIds = Array.from(new Set(list.map(e => e.lead_id).filter(Boolean))) as string[];
      const leadsById: Record<string, string> = {};
      if (leadIds.length) {
        const { data: leads } = await supabase.from("rep_leads")
          .select("id, business_name, contact_name").in("id", leadIds);
        for (const l of leads || []) leadsById[l.id] = l.business_name || l.contact_name || "Lead";
      }

      const touchpoints = list.map((e) => ({
        title: e.title,
        kind: e.kind,
        time: e.all_day ? "All day" : new Date(e.start_at).toLocaleTimeString("en-US", {
          hour: "numeric", minute: "2-digit", timeZone: "America/New_York",
        }) + " ET",
        lead_name: e.lead_id ? leadsById[e.lead_id] : undefined,
        body: e.body || undefined,
        auto: e.created_by === "system",
      }));

      if (dryRun || !rep.rep_email) {
        summary.push({ code: rep.code, count: touchpoints.length, sent: false, reason: dryRun ? "dry_run" : "no email" });
        continue;
      }

      const { error: sendErr } = await supabase.functions.invoke("send-transactional-email", {
        body: {
          templateName: "daily-touchpoints",
          recipientEmail: rep.rep_email,
          idempotencyKey: `daily-touchpoints-${rep.code}-${from.slice(0, 10)}`,
          templateData: {
            rep_name: rep.rep_name || rep.code,
            date_label: dateLabel,
            portal_url: "https://aetheris.technology/portal",
            touchpoints,
          },
        },
      });
      if (sendErr) {
        console.error(`send failed for ${rep.code}:`, sendErr);
        summary.push({ code: rep.code, count: touchpoints.length, sent: false, reason: sendErr.message });
      } else {
        summary.push({ code: rep.code, count: touchpoints.length, sent: true });
      }
    }

    return json({ ok: true, date: from.slice(0, 10), summary });
  } catch (e) {
    console.error("cron-touchpoint-reminders error:", e);
    return json({ error: e instanceof Error ? e.message : "Server error" }, 500);
  }
});
