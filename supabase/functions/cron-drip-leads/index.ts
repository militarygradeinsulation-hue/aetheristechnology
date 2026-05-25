import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.86.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const MAX_ACTIVE_CLAIMED = 100;

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, serviceKey);

    // Load settings
    const { data: settings } = await supabase.from("lead_drip_settings").select("*").maybeSingle();
    if (!settings || !settings.enabled) {
      return new Response(JSON.stringify({ ok: true, skipped: "disabled" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const dailyPerRep = Math.max(1, Math.min(100, settings.daily_per_rep ?? 10));
    const holdHours = Math.max(1, Math.min(168, settings.hold_hours ?? 24));

    // 1) Sweep expired holds back to pool
    const { data: expired, error: expErr } = await supabase
      .from("rep_leads")
      .update({ assigned_to_code: null, assigned_at: null, assignment_expires_at: null })
      .lt("assignment_expires_at", new Date().toISOString())
      .is("claimed_by_code", null)
      .not("assigned_to_code", "is", null)
      .select("id");
    if (expErr) console.error("sweep error:", expErr);
    const released = expired?.length || 0;

    // 2) For each active rep, top up their drip queue
    const { data: reps, error: repsErr } = await supabase
      .from("rep_codes")
      .select("code,rep_name")
      .eq("is_active", true);
    if (repsErr) throw repsErr;

    const summary: Array<{ code: string; assigned: number; reason?: string }> = [];

    for (const rep of (reps || [])) {
      // count active claimed (excluding closed)
      const { count: activeClaimed } = await supabase
        .from("rep_leads")
        .select("id", { count: "exact", head: true })
        .eq("claimed_by_code", rep.code)
        .not("status", "in", "(won,lost,dead)");

      if ((activeClaimed ?? 0) >= MAX_ACTIVE_CLAIMED) {
        summary.push({ code: rep.code, assigned: 0, reason: "at active cap" });
        continue;
      }

      // count current open drip (assigned but not claimed, not expired)
      const { count: openDrip } = await supabase
        .from("rep_leads")
        .select("id", { count: "exact", head: true })
        .eq("assigned_to_code", rep.code)
        .is("claimed_by_code", null)
        .gt("assignment_expires_at", new Date().toISOString());

      const needed = dailyPerRep - (openDrip ?? 0);
      if (needed <= 0) {
        summary.push({ code: rep.code, assigned: 0, reason: "queue full" });
        continue;
      }

      // Pull `needed` unassigned, unclaimed leads ordered by score
      const { data: candidates, error: candErr } = await supabase
        .from("rep_leads")
        .select("id")
        .is("claimed_by_code", null)
        .is("assigned_to_code", null)
        .order("score", { ascending: false, nullsFirst: false })
        .order("created_at", { ascending: false })
        .limit(needed);
      if (candErr) throw candErr;
      if (!candidates || candidates.length === 0) {
        summary.push({ code: rep.code, assigned: 0, reason: "pool empty" });
        continue;
      }

      const expiresAt = new Date(Date.now() + holdHours * 3600_000).toISOString();
      const ids = candidates.map(c => c.id);
      const { data: assigned, error: updErr } = await supabase
        .from("rep_leads")
        .update({
          assigned_to_code: rep.code,
          assigned_at: new Date().toISOString(),
          assignment_expires_at: expiresAt,
        })
        .in("id", ids)
        .is("claimed_by_code", null)
        .is("assigned_to_code", null)
        .select("id");
      if (updErr) throw updErr;

      const count = assigned?.length || 0;
      summary.push({ code: rep.code, assigned: count });

      if (count > 0) {
        await supabase.from("rep_activity").insert({
          rep_code: rep.code,
          rep_name: rep.rep_name,
          event: "drip_received",
          meta: { count, expires_at: expiresAt },
        });
      }
    }

    return new Response(JSON.stringify({ ok: true, released, summary }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("cron-drip-leads error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Server error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
