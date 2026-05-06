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
    const { data, error } = await supabase
      .from("team_messages")
      .select("id, created_at, author_code")
      .gt("created_at", lastSeen)
      .neq("author_code", viewerCode)
      .order("created_at", { ascending: false })
      .limit(50);
    if (error) return;
    setUnread((data || []).length);
    if (data && data.length > 0) setLastMessageAt(data[0].created_at);
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
    const ch = supabase
      .channel(`team_unread_${viewerCode}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "team_messages" },
        (payload) => {
          const row = payload.new as { author_code: string; created_at: string };
          if (row.author_code === viewerCode) return;
          setLastMessageAt(row.created_at);
          if (activeTabIsChat) {
            // Already viewing — auto-mark read
            localStorage.setItem(KEY(viewerCode), new Date().toISOString());
            return;
          }
          setUnread((n) => n + 1);
        },
      )
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [viewerCode, activeTabIsChat, refresh]);

  // When tab switches TO chat, mark read
  useEffect(() => {
    if (activeTabIsChat) markRead();
  }, [activeTabIsChat, markRead]);

  return { unread, lastMessageAt, markRead, refresh };
}
