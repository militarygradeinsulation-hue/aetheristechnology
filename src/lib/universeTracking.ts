// Fire-and-forget beacons for Aetheris Universe tool interactions.
const URL_BASE = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/universe-tool-event`;
const SESSION_KEY = 'aetheris_session_id';

function sessionId(): string {
  try {
    let id = localStorage.getItem(SESSION_KEY);
    if (!id) { id = crypto.randomUUID(); localStorage.setItem(SESSION_KEY, id); }
    return id;
  } catch { return ''; }
}

export type UniverseEvent = 'universe_tool_open' | 'universe_tool_launch';

export function trackUniverseTool(toolId: string, toolName: string, evt: UniverseEvent) {
  if (!toolId) return;
  try {
    const payload = JSON.stringify({
      tool_id: toolId,
      tool_name: toolName,
      event_type: evt,
      session_id: sessionId(),
      route: typeof window !== 'undefined' ? window.location.pathname : null,
    });
    if (typeof navigator !== 'undefined' && 'sendBeacon' in navigator) {
      const blob = new Blob([payload], { type: 'application/json' });
      navigator.sendBeacon(URL_BASE, blob);
    } else {
      fetch(URL_BASE, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: payload,
        keepalive: true,
        mode: 'no-cors',
      }).catch(() => {});
    }
  } catch { /* ignore */ }
}
