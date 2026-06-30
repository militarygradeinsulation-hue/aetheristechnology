// Shared aggregator for live site traffic. Used by both admin-live-traffic
// (top dashboard bar) and admin-assistant (AI tool answers).
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.86.0";

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
    const d = (r.event_data || {}) as Record<string, unknown>;
    if (r.session_id) sessionsWindow.add(r.session_id);
    if (r.created_at >= since5m && r.session_id) activeNow.add(r.session_id);
    if (r.created_at >= since60m && r.session_id) activeHour.add(r.session_id);

    if (r.event_type === "page_view") {
      pageViews++;
      const path = typeof d.path === "string" ? d.path : "unknown";
      pageCounts[path] = (pageCounts[path] || 0) + 1;
      const refRaw = typeof d.referrer === "string" ? d.referrer : "";
      if (refRaw) {
        try { const h = new URL(refRaw).hostname; referrerCounts[h] = (referrerCounts[h] || 0) + 1; } catch { /* ignore */ }
      }
    } else if (r.event_type === "click" || r.event_type === "linkedin_click" || r.event_type === "book_meeting_click") {
      clicks++;
      const label = (typeof d.label === "string" && d.label) ||
                    (r.event_type === "linkedin_click" ? "linkedin" : r.event_type === "book_meeting_click" ? "book_meeting" : "click");
      const loc = typeof d.location === "string" ? ` (${d.location})` : "";
      const key = `${label}${loc}`;
      clickCounts[key] = (clickCounts[key] || 0) + 1;
    } else if (
      r.event_type === "search" ||
      r.event_type === "website_scan_started" ||
      r.event_type === "chat_quickpick"
    ) {
      searches++;
      const term = (typeof d.query === "string" && d.query) ||
                   (typeof d.url === "string" && d.url) ||
                   (typeof d.label === "string" && d.label) || "(empty)";
      searchCounts[term] = (searchCounts[term] || 0) + 1;
    }
  }

  const top = (m: Record<string, number>, n = 5) =>
    Object.entries(m).sort((a, b) => b[1] - a[1]).slice(0, n).map(([k, v]) => ({ key: k, count: v }));

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
    active_now: activeNow.size,
    active_last_hour: activeHour.size,
    sessions_window: sessionsWindow.size,
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
