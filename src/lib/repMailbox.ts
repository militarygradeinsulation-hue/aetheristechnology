import { supabase } from "@/integrations/supabase/client";
import { getPortalToken } from "@/lib/portalAuth";

export interface RepMailbox {
  id: string;
  code: string;
  address: string;
  signature: string | null;
  forwarding_to: string | null;
  auto_reply_enabled: boolean;
  auto_reply_body: string | null;
  is_active: boolean;
  last_inbound_at: string | null;
  last_outbound_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface RepEmailMessage {
  id: string;
  direction: "inbound" | "outbound";
  folder: "inbox" | "sent" | "drafts" | "trash";
  from_address: string;
  from_name: string | null;
  to_addresses: string[];
  cc_addresses: string[];
  bcc_addresses?: string[];
  subject: string | null;
  body_text: string | null;
  body_html?: string | null;
  message_id?: string | null;
  in_reply_to?: string | null;
  thread_id: string | null;
  attachments: Array<{ name: string; size: number; mime: string; storage_path?: string; signed_url?: string | null }>;
  is_read: boolean;
  is_starred: boolean;
  created_at: string;
}

async function call(action: string, body: Record<string, any> = {}) {
  const token = getPortalToken();
  if (!token) throw new Error("Not signed in");
  const { data, error } = await supabase.functions.invoke("portal-mailbox", {
    body: { action, ...body },
    headers: { "x-portal-token": token },
  });
  if (error) throw error;
  if (data?.error) throw new Error(data.error);
  return data;
}

export const repMailbox = {
  async getMailbox() {
    return (await call("get_mailbox")).mailbox as RepMailbox;
  },
  async unreadCount(): Promise<number> {
    return (await call("unread_count")).count || 0;
  },
  async list(folder: RepEmailMessage["folder"], search?: string) {
    return ((await call("list_messages", { folder, search })).messages || []) as RepEmailMessage[];
  },
  async get(id: string) {
    return (await call("get_message", { id })).message as RepEmailMessage;
  },
  async markRead(id: string, isRead = true) {
    await call("mark_read", { id, is_read: isRead });
  },
  async toggleStar(id: string) {
    await call("toggle_star", { id });
  },
  async trash(id: string) {
    await call("move_to_trash", { id });
  },
  async deleteForever(id: string) {
    await call("delete_forever", { id });
  },
  async send(payload: {
    to: string[];
    cc?: string[];
    bcc?: string[];
    subject: string;
    body_text: string;
    in_reply_to?: string | null;
    thread_id?: string | null;
  }) {
    return await call("send", payload);
  },
  async updateSettings(patch: Partial<Pick<RepMailbox, "signature" | "forwarding_to" | "auto_reply_enabled" | "auto_reply_body">>) {
    return (await call("update_settings", patch)).mailbox as RepMailbox;
  },
};
