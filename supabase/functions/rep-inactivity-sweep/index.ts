// Daily sweep: deactivate reps with no portal activity for N days and email admin.
// "Activity" = newest of: rep_activity.created_at, rep_time_entries.clock_in_at,
// or rep_codes.created_at (grace window for brand-new hires).

import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-cron-secret",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const THRESHOLD_DAYS = Number(Deno.env.get("REP_INACTIVITY_DAYS") || 3);

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const url = Deno.env.get("SUPABASE_URL")!;
    const svc = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const admin = createClient(url, svc, { auth: { persistSession: false } });

    const cutoffMs = Date.now() - THRESHOLD_DAYS * 86400000;
    const cutoffIso = new Date(cutoffMs).toISOString();

    // Pull all active reps. Filter in-memory; rep counts are small.
    const { data: reps, error: repsErr } = await admin
      .from("rep_codes")
      .select("id, code, rep_name, rep_email, role, created_at, is_active")
      .eq("is_active", true);
    if (repsErr) throw repsErr;

    const inactive: Array<{
      code: string; rep_name: string; rep_email: string | null;
      role: string | null; last_seen: string | null; days_idle: number;
    }> = [];

    for (const r of reps || []) {
      // Honor grace window: a rep hired less than THRESHOLD_DAYS ago is never swept.
      if (new Date(r.created_at).getTime() > cutoffMs) continue;

      const [{ data: act }, { data: clk }] = await Promise.all([
        admin.from("rep_activity")
          .select("created_at").eq("rep_code", r.code)
          .order("created_at", { ascending: false }).limit(1).maybeSingle(),
        admin.from("rep_time_entries")
          .select("clock_in_at").eq("rep_code", r.code)
          .order("clock_in_at", { ascending: false }).limit(1).maybeSingle(),
      ]);

      const lastTs = Math.max(
        act?.created_at ? new Date(act.created_at).getTime() : 0,
        clk?.clock_in_at ? new Date(clk.clock_in_at).getTime() : 0,
      );

      if (lastTs > cutoffMs) continue; // recent activity, skip

      const lastSeenIso = lastTs ? new Date(lastTs).toISOString() : null;
      const daysIdle = lastTs
        ? Math.floor((Date.now() - lastTs) / 86400000)
        : Math.floor((Date.now() - new Date(r.created_at).getTime()) / 86400000);

      inactive.push({
        code: r.code, rep_name: r.rep_name, rep_email: r.rep_email,
        role: r.role, last_seen: lastSeenIso, days_idle: daysIdle,
      });
    }

    // Soft-revoke: deactivate. Reversible from Admin → Reps.
    let revoked = 0;
    if (inactive.length) {
      const codes = inactive.map(i => i.code);
      const { error: upErr } = await admin
        .from("rep_codes")
        .update({ is_active: false })
        .in("code", codes);
      if (upErr) throw upErr;
      revoked = codes.length;
    }

    // Notify admin (always, even on zero, so the cron is visible).
    let emailed = false;
    try {
      const resp = await fetch(`${url}/functions/v1/send-transactional-email`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${svc}`,
          "apikey": svc,
        },
        body: JSON.stringify({
          templateName: "rep-inactivity-alert",
          templateData: { reps: inactive, threshold_days: THRESHOLD_DAYS, revoked: revoked > 0 },
          idempotencyKey: `rep-inactivity-${new Date().toISOString().slice(0, 10)}`,
          purpose: "transactional",
        }),
      });
      emailed = resp.ok;
      if (!resp.ok) console.error("email send failed:", await resp.text());
    } catch (e) {
      console.error("email send threw:", e);
    }

    return new Response(
      JSON.stringify({
        ok: true, threshold_days: THRESHOLD_DAYS, checked: reps?.length || 0,
        inactive: inactive.length, revoked, emailed, reps: inactive,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    console.error("rep-inactivity-sweep error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : String(e) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
