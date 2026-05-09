import { supabase } from "@/integrations/supabase/client";
import { getAdminToken } from "@/lib/adminAuth";
import { getPortalToken } from "@/lib/portalAuth";

export interface AdminMailboxRow {
  code: string;
  rep_name: string;
  role: string;
  is_active: boolean;
  mailbox: {
    id: string;
    address: string;
    signature: string | null;
    forwarding_to: string | null;
    auto_reply_enabled: boolean;
    auto_reply_body: string | null;
    is_active: boolean;
    last_inbound_at: string | null;
    last_outbound_at: string | null;
    message_count: number;
    created_at: string;
  } | null;
}

async function call(action: string, body: Record<string, any> = {}) {
  const headers: Record<string, string> = {};
  const adminTok = getAdminToken();
  if (adminTok) headers["x-admin-token"] = adminTok;
  else {
    const portalTok = getPortalToken();
    if (portalTok) headers["x-portal-token"] = portalTok;
  }
  const { data, error } = await supabase.functions.invoke("admin-mailboxes", {
    body: { action, ...body },
    headers,
  });
  if (error) throw error;
  if (data?.error) throw new Error(data.error);
  return data;
}

export const adminMailboxes = {
  async list(): Promise<AdminMailboxRow[]> {
    return (await call("list")).rows || [];
  },
  async create(code: string, address?: string) {
    return (await call("create", { code, address })).mailbox;
  },
  async bulkGenerate() {
    return await call("bulk_generate");
  },
  async update(id: string, patch: Record<string, any>) {
    return (await call("update", { id, ...patch })).mailbox;
  },
  async remove(id: string) {
    await call("delete", { id });
  },
};
