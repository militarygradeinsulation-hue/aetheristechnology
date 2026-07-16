// Portal engagement tracker: weekly seconds-online + Golden Report opens per rep.
// Gated by the portal HMAC token. History preserved forever (rolling display of last 4 weeks).
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.86.0";
import { verifyPortalToken, getPortalTokenFromRequest } from "../_shared/portal-token.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-portal-token, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const MAX_HEARTBEAT_SECONDS = 90; // guard against clock jumps / abuse

// ISO week start (Monday) in UTC as YYYY-MM-DD
function weekStart(d = new Date()): string {
  const day = d.getUTCDay(); // 0 = Sun ... 6 = Sat
  const diff = (day + 6) % 7; // days since Monday
  const monday = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() - diff));
  return monday.toISOString().slice(0, 10);
}

function jsonResp(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const secret = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const claims = await verifyPortalToken(getPortalTokenFromRequest(req), secret);
    if (!claims) return jsonResp({ error: "Unauthorized" }, 401);

    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, secret);
    const body = await req.json().catch(() => ({}));
    const action = String(body.action || "");
    const currentWeek = weekStart();

    // Look up rep_name (cheap; needed for admin displays and joining)
    const { data: rep } = await supabase
      .from("rep_codes")
      .select("rep_name")
      .eq("code", claims.code)
      .maybeSingle();
    const repName = rep?.rep_name || null;

    async function bumpRow(patch: Record<string, number>) {
      // Read existing row for this rep + week
      const { data: existing } = await supabase
        .from("rep_engagement_weekly")
        .select("seconds_online, golden_report_uses, heartbeats")
        .eq("code", claims!.code)
        .eq("week_start", currentWeek)
        .maybeSingle();

      const next = {
        code: claims!.code,
        rep_name: repName,
        week_start: currentWeek,
        seconds_online: (existing?.seconds_online || 0) + (patch.seconds_online || 0),
        golden_report_uses: (existing?.golden_report_uses || 0) + (patch.golden_report_uses || 0),
        heartbeats: (existing?.heartbeats || 0) + (patch.heartbeats || 0),
        last_heartbeat_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      await supabase.from("rep_engagement_weekly").upsert(next, { onConflict: "code,week_start" });
      return next;
    }

    if (action === "heartbeat") {
      const raw = Number(body.seconds);
      const seconds = Math.max(0, Math.min(MAX_HEARTBEAT_SECONDS, Number.isFinite(raw) ? raw : 0));
      await bumpRow({ seconds_online: seconds, heartbeats: 1 });
      return jsonResp({ ok: true });
    }

    if (action === "golden_view") {
      await bumpRow({ golden_report_uses: 1 });
      return jsonResp({ ok: true });
    }

    if (action === "summary") {
      // Last 4 weeks (current + 3 previous) — rolling month view
      const weeks: string[] = [];
      for (let i = 0; i < 4; i++) {
        const d = new Date();
        d.setUTCDate(d.getUTCDate() - i * 7);
        weeks.push(weekStart(d));
      }
      const oldest = weeks[weeks.length - 1];

      const { data: rows, error } = await supabase
        .from("rep_engagement_weekly")
        .select("code, rep_name, week_start, seconds_online, golden_report_uses")
        .gte("week_start", oldest)
        .order("week_start", { ascending: false });
      if (error) throw error;

      const { data: reps } = await supabase
        .from("rep_codes")
        .select("code, rep_name, role")
        .eq("is_active", true);

      return jsonResp({
        ok: true,
        me: claims.code,
        current_week: currentWeek,
        weeks,
        rows: rows || [],
        reps: reps || [],
      });
    }

    return jsonResp({ error: `Unknown action: ${action}` }, 400);
  } catch (e) {
    console.error("portal-engagement error:", e);
    return jsonResp({ error: e instanceof Error ? e.message : String(e) }, 500);
  }
});
