import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { verifyPortalToken } from "../_shared/portal-token.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-portal-token",
};

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE);

    const portalToken = req.headers.get("x-portal-token");
    const claims = await verifyPortalToken(portalToken, SERVICE_ROLE);
    if (!claims) return json(401, { error: "Invalid portal session" });

    const body = await req.json().catch(() => ({}));
    const action = String(body.action ?? "status");

    // ── REP ACTIONS (operate on their own code) ──────────────────────────
    if (action === "status") {
      const { data, error } = await supabase
        .from("rep_time_entries")
        .select("id, clock_in_at, clock_out_at, note")
        .eq("rep_code", claims.code)
        .is("clock_out_at", null)
        .order("clock_in_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) return json(500, { error: error.message });
      return json(200, { open: data ?? null });
    }

    if (action === "clock_in") {
      // Refuse if there's already an open entry.
      const { data: existing } = await supabase
        .from("rep_time_entries")
        .select("id")
        .eq("rep_code", claims.code)
        .is("clock_out_at", null)
        .maybeSingle();
      if (existing) return json(409, { error: "Already clocked in" });

      const { data, error } = await supabase
        .from("rep_time_entries")
        .insert({ rep_code: claims.code, note: body.note ?? null })
        .select("id, clock_in_at, clock_out_at, note")
        .single();
      if (error) return json(500, { error: error.message });
      return json(200, { open: data });
    }

    if (action === "clock_out") {
      const { data: open } = await supabase
        .from("rep_time_entries")
        .select("id")
        .eq("rep_code", claims.code)
        .is("clock_out_at", null)
        .order("clock_in_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (!open) return json(409, { error: "Not clocked in" });

      const patch: Record<string, unknown> = { clock_out_at: new Date().toISOString() };
      if (typeof body.note === "string") patch.note = body.note;

      const { data, error } = await supabase
        .from("rep_time_entries")
        .update(patch)
        .eq("id", open.id)
        .select("id, clock_in_at, clock_out_at, duration_seconds, note")
        .single();
      if (error) return json(500, { error: error.message });
      return json(200, { entry: data });
    }

    if (action === "list") {
      // Rep's own history (last 100). Partner can pass `rep_code` to view another rep.
      const targetCode =
        claims.role === "partner" && typeof body.rep_code === "string"
          ? body.rep_code
          : claims.code;
      const limit = Math.min(Math.max(Number(body.limit) || 50, 1), 200);
      const { data, error } = await supabase
        .from("rep_time_entries")
        .select("id, rep_code, clock_in_at, clock_out_at, duration_seconds, note")
        .eq("rep_code", targetCode)
        .order("clock_in_at", { ascending: false })
        .limit(limit);
      if (error) return json(500, { error: error.message });
      return json(200, { entries: data ?? [] });
    }

    // ── PARTNER ACTIONS ─────────────────────────────────────────────────
    if (action === "summary") {
      if (claims.role !== "partner") return json(403, { error: "Partner only" });

      // Pull all reps + their lifetime sales/commission.
      const { data: reps, error: repsErr } = await supabase
        .from("rep_codes")
        .select("code, rep_name, role, is_active, total_sales_cents, total_commission_cents, commission_rate")
        .order("rep_name", { ascending: true });
      if (repsErr) return json(500, { error: repsErr.message });

      // Pull all time entries since `since` (default 30 days).
      const sinceIso = body.since
        ? new Date(body.since).toISOString()
        : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

      const { data: entries, error: entErr } = await supabase
        .from("rep_time_entries")
        .select("rep_code, clock_in_at, clock_out_at, duration_seconds")
        .gte("clock_in_at", sinceIso)
        .order("clock_in_at", { ascending: false });
      if (entErr) return json(500, { error: entErr.message });

      // Aggregate.
      const byRep: Record<string, { seconds_window: number; sessions_window: number; currently_open: boolean; last_in: string | null; last_out: string | null }> = {};
      for (const r of reps ?? []) {
        byRep[r.code] = { seconds_window: 0, sessions_window: 0, currently_open: false, last_in: null, last_out: null };
      }
      for (const e of entries ?? []) {
        const slot = byRep[e.rep_code] ?? (byRep[e.rep_code] = { seconds_window: 0, sessions_window: 0, currently_open: false, last_in: null, last_out: null });
        slot.sessions_window += 1;
        if (!slot.last_in || (e.clock_in_at && e.clock_in_at > slot.last_in)) slot.last_in = e.clock_in_at;
        if (e.clock_out_at && (!slot.last_out || e.clock_out_at > slot.last_out)) slot.last_out = e.clock_out_at;
        if (e.clock_out_at === null) {
          slot.currently_open = true;
          slot.seconds_window += Math.max(0, Math.floor((Date.now() - new Date(e.clock_in_at).getTime()) / 1000));
        } else if (typeof e.duration_seconds === "number") {
          slot.seconds_window += e.duration_seconds;
        }
      }

      const summary = (reps ?? []).map((r) => {
        const stats = byRep[r.code];
        const hours = stats ? stats.seconds_window / 3600 : 0;
        const dollarsPerHour =
          hours > 0 ? r.total_commission_cents / 100 / hours : null;
        return {
          code: r.code,
          rep_name: r.rep_name,
          role: r.role,
          is_active: r.is_active,
          commission_rate: r.commission_rate,
          total_sales_cents: r.total_sales_cents,
          total_commission_cents: r.total_commission_cents,
          seconds_window: stats?.seconds_window ?? 0,
          sessions_window: stats?.sessions_window ?? 0,
          currently_open: stats?.currently_open ?? false,
          last_in: stats?.last_in ?? null,
          last_out: stats?.last_out ?? null,
          dollars_per_hour: dollarsPerHour,
        };
      });

      return json(200, { summary, since: sinceIso });
    }

    return json(400, { error: `Unknown action: ${action}` });
  } catch (err) {
    return json(500, { error: (err as Error).message });
  }
});
