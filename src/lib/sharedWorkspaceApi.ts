import { getAdminToken } from "./adminAuth";
import {
  Person,
  SharedTask,
  SharedNote,
  SharedFile,
  SharedNotification,
} from "./sharedWorkspace";

const FN_URL = `https://${import.meta.env.VITE_SUPABASE_PROJECT_ID}.supabase.co/functions/v1/shared-workspace`;

function headers(): Record<string, string> {
  const h: Record<string, string> = { "Content-Type": "application/json" };
  const t = getAdminToken();
  if (t) h["x-admin-token"] = t;
  return h;
}

async function call<T>(payload: Record<string, unknown>): Promise<T> {
  const res = await fetch(FN_URL, { method: "POST", headers: headers(), body: JSON.stringify(payload) });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `Request failed (${res.status})`);
  }
  return res.json();
}

export async function fetchSharedWorkspace(): Promise<{
  tasks: SharedTask[]; notes: SharedNote[]; files: SharedFile[];
}> {
  return call({ action: "list" });
}

export async function fetchNotifications(recipient: Person): Promise<SharedNotification[]> {
  const r = await call<{ notifications: SharedNotification[] }>({ action: "notifications", recipient });
  return r.notifications;
}

export async function fetchUnreadNotificationCount(recipient: Person): Promise<number> {
  const r = await call<{ count: number }>({ action: "unread_count", recipient });
  return r.count;
}

export async function deleteSharedTask(id: string): Promise<void> {
  await call({ action: "delete_task", id });
}

export async function deleteSharedNote(id: string): Promise<void> {
  await call({ action: "delete_note", id });
}

export async function deleteSharedFile(id: string, storage_path: string): Promise<void> {
  await call({ action: "delete_file", id, storage_path });
}
