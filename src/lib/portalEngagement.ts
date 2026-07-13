// Client wrapper for the portal-engagement edge function.
// - startHeartbeat(): call once after login; sends a heartbeat every 30s while the tab is visible.
// - logGoldenView(): call when the rep opens the Golden Report tab (deduped per session).
// - fetchSummary(): pulls last 4 weeks of engagement for all reps.

import { getPortalToken } from './portalAuth';

const FUNCTIONS_BASE =
  (import.meta as any).env?.VITE_SUPABASE_URL
    ? `${(import.meta as any).env.VITE_SUPABASE_URL}/functions/v1`
    : `https://${(import.meta as any).env?.VITE_SUPABASE_PROJECT_ID}.functions.supabase.co`;

async function call(action: string, extra: Record<string, unknown> = {}) {
  const token = getPortalToken();
  if (!token) return null;
  try {
    const res = await fetch(`${FUNCTIONS_BASE}/portal-engagement`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-portal-token': token },
      body: JSON.stringify({ action, ...extra }),
    });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

export interface EngagementRow {
  code: string;
  rep_name: string | null;
  week_start: string;
  seconds_online: number;
  golden_report_uses: number;
}
export interface EngagementSummary {
  me: string;
  current_week: string;
  weeks: string[]; // newest first, length 4
  rows: EngagementRow[];
  reps: Array<{ code: string; rep_name: string; role: string }>;
}

export async function fetchEngagementSummary(): Promise<EngagementSummary | null> {
  const r = await call('summary');
  return r?.ok ? (r as EngagementSummary) : null;
}

export async function logGoldenView() {
  await call('golden_view');
}

// Heartbeat loop: sends the elapsed seconds every ~30s while the tab is visible.
// Returns a cleanup function.
export function startHeartbeat(): () => void {
  let last = Date.now();
  let stopped = false;

  const flush = async () => {
    if (stopped || document.hidden) { last = Date.now(); return; }
    const now = Date.now();
    const seconds = Math.round((now - last) / 1000);
    last = now;
    if (seconds <= 0) return;
    await call('heartbeat', { seconds });
  };

  const id = window.setInterval(flush, 30_000);
  const onVis = () => { last = Date.now(); };
  document.addEventListener('visibilitychange', onVis);
  // Best-effort final flush on unload
  const onUnload = () => { try { flush(); } catch {} };
  window.addEventListener('beforeunload', onUnload);

  return () => {
    stopped = true;
    window.clearInterval(id);
    document.removeEventListener('visibilitychange', onVis);
    window.removeEventListener('beforeunload', onUnload);
  };
}

export function formatHours(seconds: number): string {
  if (!seconds) return '0m';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h <= 0) return `${m}m`;
  return `${h}h ${m}m`;
}
