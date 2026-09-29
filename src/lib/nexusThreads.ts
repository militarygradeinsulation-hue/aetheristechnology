// Server side sync for Aetheris Nexus chat threads.
// localStorage stays the fast local cache. When the visitor has a portal or
// admin session, threads are mirrored to the database so a browser reset
// (or a Chrome profile wipe) never loses history again.
import { getPortalToken } from "@/lib/portalAuth";
import { getAdminToken } from "@/lib/adminAuth";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;
const ANON_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string;

export type SyncThread = {
  id: string;
  title: string;
  updatedAt: number;
  messages: unknown[];
  identity?: 'default' | 'the-architect';
};

function authHeaders(): Record<string, string> | null {
  const portal = getPortalToken();
  if (portal) return { "x-portal-token": portal };
  const admin = getAdminToken();
  if (admin) return { "x-admin-token": admin };
  return null;
}

/** True when the current visitor has an identity we can persist threads under. */
export function canSyncNexus(): boolean {
  return authHeaders() !== null;
}

async function call(action: string, payload: Record<string, unknown> = {}) {
  const headers = authHeaders();
  if (!headers) return null;
  const res = await fetch(`${SUPABASE_URL}/functions/v1/nexus-threads`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${ANON_KEY}`,
      apikey: ANON_KEY,
      ...headers,
    },
    body: JSON.stringify({ action, ...payload }),
  });
  if (!res.ok) throw new Error(`nexus-threads ${action} failed: ${res.status}`);
  return res.json();
}

export async function fetchRemoteThreads(): Promise<SyncThread[]> {
  const data = await call("list");
  const threads = data?.threads;
  return Array.isArray(threads) ? (threads as SyncThread[]) : [];
}

export async function pushThread(thread: SyncThread): Promise<void> {
  if (!thread?.id) return;
  await call("save", { thread });
}

export async function importThreads(threads: SyncThread[]): Promise<void> {
  if (threads.length === 0) return;
  await call("import", { threads });
}

export async function deleteRemoteThread(threadId: string): Promise<void> {
  await call("delete", { threadId });
}

/**
 * Merge local and remote threads. Newest `updatedAt` wins per thread id, and
 * empty threads never overwrite one that has messages.
 */
export function mergeThreads(local: SyncThread[], remote: SyncThread[]): SyncThread[] {
  const byId = new Map<string, SyncThread>();
  for (const t of [...remote, ...local]) {
    if (!t?.id) continue;
    const existing = byId.get(t.id);
    if (!existing) { byId.set(t.id, t); continue; }
    const incomingCount = t.messages?.length ?? 0;
    const existingCount = existing.messages?.length ?? 0;
    if (incomingCount === 0 && existingCount > 0) continue;
    if (existingCount === 0 && incomingCount > 0) { byId.set(t.id, t); continue; }
    if ((t.updatedAt ?? 0) > (existing.updatedAt ?? 0)) byId.set(t.id, t);
  }
  return Array.from(byId.values()).sort((a, b) => (b.updatedAt ?? 0) - (a.updatedAt ?? 0));
}
