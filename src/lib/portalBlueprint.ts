import { supabase } from "@/integrations/supabase/client";
import { getPortalToken } from "@/lib/portalAuth";

export interface BlueprintProgressRow {
  day_index: number;
  task_id: string;
  done_at: string;
}

export interface BlueprintResponse {
  rep_code: string;
  rep_name: string | null;
  is_partner: boolean;
  first_login_at: string | null;
  created_at: string;
  progress: BlueprintProgressRow[];
}

async function call<T>(payload: Record<string, unknown>): Promise<T> {
  const token = getPortalToken();
  if (!token) throw new Error("No portal session");
  const { data, error } = await supabase.functions.invoke("portal-blueprint", {
    body: payload,
    headers: { "x-portal-token": token },
  });
  if (error) throw new Error(error.message);
  if ((data as { error?: string })?.error) throw new Error((data as { error: string }).error);
  return data as T;
}

export const portalBlueprint = {
  get: () => call<BlueprintResponse>({ action: "get" }),
  toggle: (day_index: number, task_id: string, done: boolean) =>
    call<BlueprintResponse>({ action: "toggle", day_index, task_id, done }),
};
