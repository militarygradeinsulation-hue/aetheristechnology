import { supabase } from "@/integrations/supabase/client";
import { getPortalToken } from "@/lib/portalAuth";

export interface OutlookStatus {
  configured: boolean;
  connected: boolean;
  outlook_email: string | null;
  expires_at: string | null;
  connected_at: string | null;
  has_refresh_token: boolean;
  scope: string | null;
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

export const outlookConnect = {
  async getStatus(): Promise<OutlookStatus> {
    return await call("outlook-status", { action: "status" });
  },
  async getAuthUrl(): Promise<string> {
    const r = await call("outlook-oauth-start", {});
    return r.url;
  },
  async disconnect(): Promise<void> {
    await call("outlook-status", { action: "disconnect" });
  },
};
