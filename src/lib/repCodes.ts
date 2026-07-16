import { getAdminToken } from "./adminAuth";
import { getPortalToken } from "./portalAuth";

export interface RepCodeRow {
  id: string;
  code: string;
  rep_name: string;
  rep_email: string | null;
  commission_rate: number;
  is_active: boolean;
  role: "rep" | "partner";
  total_sales_cents: number;
  total_commission_cents: number;
  created_at: string;
  team_name?: string | null;
}

function headers(): Record<string, string> {
  const h: Record<string, string> = { "Content-Type": "application/json" };
  const a = getAdminToken();
  if (a) h["x-admin-token"] = a;
  const p = getPortalToken();
  if (p) h["x-portal-token"] = p;
  return h;
}

async function call<T>(payload: Record<string, unknown>): Promise<T> {
  const url = `https://${import.meta.env.VITE_SUPABASE_PROJECT_ID}.supabase.co/functions/v1/admin-rep-codes`;
  const res = await fetch(url, { method: "POST", headers: headers(), body: JSON.stringify(payload) });
  if (!res.ok) {
    const e = await res.json().catch(() => ({}));
    throw new Error(e.error || `Request failed (${res.status})`);
  }
  return res.json();
}

export const listRepCodes = () => call<{ reps: RepCodeRow[] }>({ action: "list" }).then(r => r.reps);
export const createRepCode = (input: Partial<RepCodeRow>) => call<{ rep: RepCodeRow }>({ action: "create", ...input }).then(r => r.rep);
export const updateRepCode = (id: string, patch: Partial<RepCodeRow>) => call<{ rep: RepCodeRow }>({ action: "update", id, ...patch }).then(r => r.rep);
export const deleteRepCode = (id: string) => call<{ success: boolean }>({ action: "delete", id });

export interface BackfillResult {
  updated: number;
  total_candidates: number;
  results: { id: string; rep_name: string; rep_email: string; ok: boolean; error?: string }[];
}
export const backfillRepEmails = (overwrite = false) =>
  call<BackfillResult>({ action: "backfill_emails", overwrite });

export const sendRepTestEmail = (id: string, inboxOverride?: string) =>
  call<{ ok: boolean; recipient: string; response: unknown }>({
    action: "send_test_email",
    id,
    ...(inboxOverride ? { inbox: inboxOverride } : {}),
  });
