import { supabase } from "@/integrations/supabase/client";
import { getPortalToken } from "@/lib/portalAuth";

export interface GoogleStatus {
  configured: boolean;
  connected: boolean;
  google_email: string | null;
  expires_at: string | null;
  connected_at: string | null;
  has_refresh_token: boolean;
  scope: string | null;
}

export interface GoogleCalendarEvent {
  id: string;
  summary: string;
  description?: string;
  start: { dateTime?: string; date?: string };
  end: { dateTime?: string; date?: string };
  htmlLink?: string;
  status?: string;
  location?: string;
}

async function call(fn: string, body: Record<string, any> = {}) {
  const token = getPortalToken();
  if (!token) throw new Error("Not signed in");
  const { data, error } = await supabase.functions.invoke(fn, {
    body,
    headers: { "x-portal-token": token },
  });
  if (error) throw error;
  if (data?.error) throw new Error(data.error);
  return data;
}

export const googleConnect = {
  async getStatus(): Promise<GoogleStatus> {
    return await call("google-status", { action: "status" });
  },
  async getAuthUrl(): Promise<string> {
    const r = await call("google-oauth-start", {});
    return r.url;
  },
  async disconnect(): Promise<void> {
    await call("google-status", { action: "disconnect" });
  },
  async listCalendarEvents(params: { from?: string; to?: string } = {}): Promise<GoogleCalendarEvent[]> {
    const r = await call("google-calendar-sync", { action: "list", ...params });
    return r.events || [];
  },
  async createCalendarEvent(event: {
    title: string;
    body?: string;
    start_at: string;
    end_at?: string;
    all_day?: boolean;
  }): Promise<GoogleCalendarEvent> {
    const r = await call("google-calendar-sync", { action: "create", ...event });
    return r.event;
  },
};
