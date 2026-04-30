import { supabase } from "@/integrations/supabase/client";
import { getAdminToken } from "./adminAuth";
import { getPortalToken } from "./portalAuth";

export interface TeamAttachment {
  name: string;
  url: string;
  path: string;
  content_type: string;
  size: number;
}

export interface TeamMessage {
  id: string;
  author_code: string;
  author_name: string;
  author_role: "admin" | "rep" | "partner";
  body: string;
  attachments: TeamAttachment[];
  pinned: boolean;
  parent_id: string | null;
  edited_at: string | null;
  created_at: string;
  updated_at: string;
}

function headers(): Record<string, string> {
  const h: Record<string, string> = { "Content-Type": "application/json" };
  const adm = getAdminToken();
  if (adm) h["x-admin-token"] = adm;
  const p = getPortalToken();
  if (p) h["x-portal-token"] = p;
  return h;
}

async function call<T>(payload: Record<string, unknown>): Promise<T> {
  const url = `https://${import.meta.env.VITE_SUPABASE_PROJECT_ID}.supabase.co/functions/v1/team-messages`;
  const res = await fetch(url, {
    method: "POST",
    headers: headers(),
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `Request failed (${res.status})`);
  }
  return res.json();
}

export async function listTeamMessages(): Promise<TeamMessage[]> {
  const r = await call<{ messages: TeamMessage[] }>({ action: "list" });
  return r.messages;
}

export async function postTeamMessage(
  body: string,
  attachments: TeamAttachment[] = [],
  authorName?: string,
  parentId?: string,
): Promise<TeamMessage> {
  const r = await call<{ message: TeamMessage }>({
    action: "post",
    body,
    attachments,
    author_name: authorName,
    parent_id: parentId,
  });
  return r.message;
}

export async function editTeamMessage(id: string, body: string) {
  await call({ action: "edit", id, body });
}

export async function deleteTeamMessage(id: string) {
  await call({ action: "delete", id });
}

export async function pinTeamMessage(id: string, pinned: boolean) {
  await call({ action: "pin", id, pinned });
}

export async function uploadTeamFile(file: File): Promise<TeamAttachment> {
  const buf = await file.arrayBuffer();
  let binary = "";
  const bytes = new Uint8Array(buf);
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode.apply(null, Array.from(bytes.subarray(i, i + chunk)));
  }
  const b64 = btoa(binary);
  const r = await call<{ attachment: TeamAttachment }>({
    action: "upload",
    filename: file.name,
    content_type: file.type || "application/octet-stream",
    content_base64: b64,
  });
  return r.attachment;
}

export function subscribeTeamMessages(onChange: () => void) {
  const ch = supabase
    .channel("team_messages_live")
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "team_messages" },
      () => onChange(),
    )
    .subscribe();
  return () => {
    supabase.removeChannel(ch);
  };
}
