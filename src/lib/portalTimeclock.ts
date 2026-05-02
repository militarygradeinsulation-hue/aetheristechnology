import { supabase } from "@/integrations/supabase/client";
import { getPortalToken } from "@/lib/portalAuth";

export interface TimeEntry {
  id: string;
  rep_code?: string;
  clock_in_at: string;
  clock_out_at: string | null;
  duration_seconds?: number | null;
  note?: string | null;
}

export interface TimeSummaryRow {
  code: string;
  rep_name: string;
  role: "rep" | "partner";
  is_active: boolean;
  commission_rate: number;
  total_sales_cents: number;
  total_commission_cents: number;
  seconds_window: number;
  sessions_window: number;
  currently_open: boolean;
  last_in: string | null;
  last_out: string | null;
  dollars_per_hour: number | null;
}

async function call<T>(action: string, payload: Record<string, unknown> = {}): Promise<T> {
  const token = getPortalToken();
  if (!token) throw new Error("No portal session");
  const { data, error } = await supabase.functions.invoke("portal-timeclock", {
    body: { action, ...payload },
    headers: { "x-portal-token": token },
  });
  if (error) throw new Error(error.message);
  if ((data as { error?: string })?.error) throw new Error((data as { error: string }).error);
  return data as T;
}

export const portalTimeclock = {
  status: () => call<{ open: TimeEntry | null }>("status"),
  clockIn: (note?: string) => call<{ open: TimeEntry }>("clock_in", { note }),
  clockOut: (note?: string) => call<{ entry: TimeEntry }>("clock_out", { note }),
  list: (opts: { rep_code?: string; limit?: number } = {}) =>
    call<{ entries: TimeEntry[] }>("list", opts),
  summary: (sinceIso?: string) =>
    call<{ summary: TimeSummaryRow[]; since: string }>("summary", { since: sinceIso }),
};

export function formatDuration(seconds: number | null | undefined): string {
  if (!seconds || seconds <= 0) return "0h 0m";
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  return `${h}h ${m}m`;
}
