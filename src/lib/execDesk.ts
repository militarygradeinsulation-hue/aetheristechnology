import { supabase } from "@/integrations/supabase/client";
import { getAdminToken } from "@/lib/adminAuth";
import { getPortalToken } from "@/lib/portalAuth";

export type ExecKind = "event" | "task" | "note";
export type ExecStatus = "open" | "doing" | "done";
export type ExecPriority = "low" | "normal" | "high" | "urgent";
export type ExecPerson = "joseph" | "braden" | "dean";

/** Codes allowed into the Executive Desk (Joseph, Braden, Dean). */
export const EXEC_CODES = new Set(["163675", "963169", "482917"]);
export const execPersonLabel = (p: string) =>
  p === "joseph" ? "Joseph" : p === "braden" ? "Braden" : p === "dean" ? "Dean" : "Everyone";

export interface ExecItem {
  id: string;
  kind: ExecKind;
  title: string;
  details: string | null;
  starts_at: string | null;
  ends_at: string | null;
  all_day: boolean;
  status: ExecStatus;
  priority: ExecPriority;
  assignee: string;
  author: string;
  pinned: boolean;
  created_at: string;
  updated_at: string;
}

function headers(): Record<string, string> {
  const h: Record<string, string> = {};
  const a = getAdminToken(); if (a) h["x-admin-token"] = a;
  const p = getPortalToken(); if (p) h["x-portal-token"] = p;
  return h;
}

async function call<T>(body: Record<string, unknown>): Promise<T> {
  const { data, error } = await supabase.functions.invoke("exec-desk", { body, headers: headers() });
  if (error) {
    // Surface the real server message instead of "non-2xx status code".
    const res = (error as { context?: Response }).context;
    if (res && typeof res.text === "function") {
      try {
        const txt = await res.text();
        const parsed = JSON.parse(txt) as { error?: string };
        const msg = parsed?.error || txt;
        throw new Error(res.status === 401 ? `401 ${msg}` : msg || error.message);
      } catch (e) {
        if (e instanceof Error && e.message && !/JSON/i.test(e.message)) throw e;
      }
    }
    throw new Error(error.message);
  }
  if ((data as { error?: string })?.error) throw new Error((data as { error: string }).error);
  return data as T;
}


export const listExecItems = () =>
  call<{ ok: true; me: ExecPerson; items: ExecItem[] }>({ action: "list" });

export const createExecItem = (patch: Partial<ExecItem>) =>
  call<{ ok: true; item: ExecItem }>({ action: "create", ...patch }).then((d) => d.item);

export const updateExecItem = (id: string, patch: Partial<ExecItem>) =>
  call<{ ok: true; item: ExecItem }>({ action: "update", id, ...patch }).then((d) => d.item);

export const deleteExecItem = (id: string) => call<{ ok: true }>({ action: "delete", id });
