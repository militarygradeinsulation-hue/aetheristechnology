import { supabase } from "@/integrations/supabase/client";
import { getPortalToken } from "@/lib/portalAuth";
import { getAdminToken } from "@/lib/adminAuth";

export interface LeadActionItem {
  id: string;
  lead_id: string;
  rep_code: string | null;
  kind: "touch" | "followup";
  step_key: string;
  title: string;
  description: string | null;
  order_idx: number;
  due_at: string | null;
  completed_at: string | null;
  completed_by: string | null;
  skipped_at: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

function headers() {
  const h: Record<string, string> = {};
  const pt = getPortalToken();
  if (pt) h["x-portal-token"] = pt;
  const at = getAdminToken();
  if (at) h["x-admin-token"] = at;
  return h;
}

async function call<T = any>(action: string, body: Record<string, any> = {}): Promise<T> {
  const { data, error } = await supabase.functions.invoke("lead-actions", {
    body: { action, ...body },
    headers: headers(),
  });
  if (error) throw error;
  if ((data as any)?.error) throw new Error((data as any).error);
  return data as T;
}

export const leadActions = {
  list:     (lead_id: string)                             => call<{ items: LeadActionItem[] }>("list", { lead_id }),
  complete: (item_id: string, notes?: string)             => call("complete", { item_id, notes }),
  uncheck:  (item_id: string)                             => call("uncheck", { item_id }),
  skip:     (item_id: string, notes?: string)             => call("skip", { item_id, notes }),
  snooze:   (item_id: string, days: number)               => call("snooze", { item_id, days }),
  note:     (item_id: string, notes: string)              => call("note", { item_id, notes }),
  overview: ()                                            => call<{ leads: any[]; items: LeadActionItem[]; reps: any[] }>("overview"),
};
