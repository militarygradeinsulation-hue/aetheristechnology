// Live traffic snapshot for the admin dashboard top bar + assistant.
// PIN-gated. Aggregates site_events into a small, fast payload.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.86.0";
import { verifyAdminToken, getAdminTokenFromRequest } from "../_shared/admin-token.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-admin-token, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

type Row = { event_type: string; event_data: Record<string, unknown> | null; session_id: string | null; created_at: string };

export async function buildLiveTraffic(sb: ReturnType<typeof createClient>, windowHours = 24) {
  const now = Date.now();
  const sinceWindow = new Date(now - windowHours * 3600_000).toISOString();
  const since5m = new Date(now - 5 * 60_000).toISOString();
  const since60m = new Date(now - 60 * 60_000).toISOString();

  const { data, error } = await sb
    .from("site_events")
    .select("event_type,event_data,session_id,created_at")
    .gte("created_at", sinceWindow)
    .order("created_at", { ascending: false })
    .limit(5000);
  if (error) throw error;
  const rows = (data || []) as Row[];

  const activeNow = new Set<string>();
  const activeHour = new Set<string>();
  const sessionsWindow = new Set<string>();
  let pageViews = 0;
  let clicks = 0;
  let searches = 0;
  const pageCounts: Record<string, number> = {};
  const clickCounts: Record<string, number> = {};
  const searchCounts: Record<string, number> = {};
  const referrerCounts: Record<string, number> = {};

  for (const r of rows) {
    const data = (r.event_data || {}) as Record<string, unknown>;
    if (r.session_id) sessionsWindow.add(r.session_id);
    if (r.created_at >= since5m && r.session_id) activeNow.add(r.session_id);
    if (r.created_at >= since60m && r.session_id) activeHour.add(r.session_id);

    if (r.event_type === "page_view") {
      pageViews++;
      const path = typeof data.path === "string" ? data.path : "unknown";
      pageCounts[path] = (pageCounts[path] || 0) + 1;
      const ref = typeof data.referrer === "string" && data.referrer ? new URL(data.referrer).hostname : null;
      if (ref) referrerCounts[ref] = (referrerCounts[ref] || 0) + 1;
    } else if (r.event_type === "click" || r.event_type === "linkedin_click" || r.event_type === "book_meeting_click") {
      clicks++;
      const label = (typeof data.label === "string" && data.label) ||
                    (r.event_type === "linkedin_click" ? "linkedin" : r.event_type === "book_meeting_click" ? "book_meeting" : "click");
      const loc = typeof data.location === "string" ? ` (${data.location})` : "";
      const key = `${label}${loc}`;
      clickCounts[key] = (clickCounts[key] || 0) + 1;
    } else if (
      r.event_type === "search" ||
      r.event_type === "website_scan_started" ||
      r.event_type === "chat_quickpick"
    ) {
      searches++;
      const term = (typeof data.query === "string" && data.query) ||
                   (typeof data.url === "string" && data.url) ||
                   (typeof data.label === "string" && data.label) || "(empty)";
      searchCounts[term] = (searchCounts[term] || 0) + 1;
    }
  }

  const top = (m: Record<string, number>, n = 5) =>
    Object.entries(m).sort((a, b) => b[1] - a[1]).slice(0, n).map(([k, v]) => ({ key: k, count: v }));

  // Recent activity feed (last 25 events, lightly shaped).
  const recent = rows.slice(0, 25).map((r) => ({
    at: r.created_at,
    type: r.event_type,
    session: r.session_id ? r.session_id.slice(0, 8) : null,
    detail: (() => {
      const d = (r.event_data || {}) as Record<string, unknown>;
      if (r.event_type === "page_view") return String(d.path ?? "");
      if (typeof d.label === "string") return d.label + (typeof d.location === "string" ? ` · ${d.location}` : "");
      if (typeof d.url === "string") return String(d.url);
      if (typeof d.query === "string") return String(d.query);
      return "";
    })(),
  }));

  return {
    window_hours: windowHours,
    active_now: activeNow.size,          // sessions seen in last 5 minutes
    active_last_hour: activeHour.size,
    sessions_window: sessionsWindow.size, // unique visitors in the window
    page_views: pageViews,
    clicks,
    searches,
    top_pages: top(pageCounts, 8),
    top_clicks: top(clickCounts, 8),
    top_searches: top(searchCounts, 8),
    top_referrers: top(referrerCounts, 5),
    recent,
    generated_at: new Date().toISOString(),
  };
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const token = getAdminTokenFromRequest(req);
    const ok = await verifyAdminToken(token, SERVICE_KEY);
    if (!ok) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const url = new URL(req.url);
    const hours = Math.min(Math.max(parseInt(url.searchParams.get("hours") || "24", 10) || 24, 1), 720);
    const sb = createClient(SUPABASE_URL, SERVICE_KEY);
    const payload = await buildLiveTraffic(sb, hours);
    return new Response(JSON.stringify(payload), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("admin-live-traffic error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
