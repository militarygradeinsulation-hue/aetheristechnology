import { useEffect, useState, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";

const KEY = (code: string) => `aetheris_team_chat_lastseen_${code}`;

// Short ping built from a base64-encoded WAV beep (no asset file needed).
function playPing() {
  try {
    const Ctx = (window as any).AudioContext || (window as any).webkitAudioContext;
    if (!Ctx) return;
    const ctx = new Ctx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(880, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(440, ctx.currentTime + 0.18);
    gain.gain.setValueAtTime(0.0001, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.25, ctx.currentTime + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.25);
    osc.connect(gain).connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.28);
    setTimeout(() => ctx.close(), 400);
  } catch { /* ignore */ }
}

function showBrowserNotification(title: string, body: string) {
  try {
    if (typeof Notification === "undefined") return;
    if (Notification.permission === "granted") {
      new Notification(title, { body, icon: "/favicon.ico", tag: "team-msg" });
    } else if (Notification.permission !== "denied") {
      Notification.requestPermission().then((p) => {
        if (p === "granted") new Notification(title, { body, icon: "/favicon.ico", tag: "team-msg" });
      });
    }
  } catch { /* ignore */ }
}


/**
 * Tracks unread team_messages for the given viewer code.
 * Counts messages whose author_code !== viewerCode AND created_at > lastSeen.
 * Live-updates via Supabase realtime.
 */
export function useUnreadTeamMessages(viewerCode: string | null, activeTabIsChat: boolean) {
  const [unread, setUnread] = useState(0);
  const [lastMessageAt, setLastMessageAt] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!viewerCode) return;
    const lastSeen = localStorage.getItem(KEY(viewerCode)) || new Date(0).toISOString();
    try {
      const { getAdminToken } = await import("@/lib/adminAuth");
      const { getPortalToken } = await import("@/lib/portalAuth");
      const h: Record<string, string> = { "Content-Type": "application/json" };
      const a = getAdminToken(); if (a) h["x-admin-token"] = a;
      const p = getPortalToken(); if (p) h["x-portal-token"] = p;
      const url = `https://${import.meta.env.VITE_SUPABASE_PROJECT_ID}.supabase.co/functions/v1/team-messages`;
      const res = await fetch(url, {
        method: "POST",
        headers: h,
        body: JSON.stringify({ action: "unread", since: lastSeen }),
      });
      if (!res.ok) return;
      const json = await res.json();
      const data = (json.messages || []) as { id: string; created_at: string; author_code: string }[];
      setUnread(data.length);
      if (data.length > 0) setLastMessageAt(data[0].created_at);
    } catch { /* ignore */ }
  }, [viewerCode]);

  // Mark all read when chat tab is opened
  const markRead = useCallback(() => {
    if (!viewerCode) return;
    localStorage.setItem(KEY(viewerCode), new Date().toISOString());
    setUnread(0);
  }, [viewerCode]);

  useEffect(() => {
    if (!viewerCode) return;
    void refresh();
    // Realtime is blocked by RLS for anon; poll every 20s as a safe fallback.
    const iv = setInterval(() => { void refresh(); }, 20000);
    return () => { clearInterval(iv); };
  }, [viewerCode, activeTabIsChat, refresh]);

  // When tab switches TO chat, mark read
  useEffect(() => {
    if (activeTabIsChat) markRead();
  }, [activeTabIsChat, markRead]);

  return { unread, lastMessageAt, markRead, refresh };
}
