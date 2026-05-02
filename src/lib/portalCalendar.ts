import { supabase } from "@/integrations/supabase/client";
import { getAdminToken } from "@/lib/adminAuth";
import { getPortalToken } from "@/lib/portalAuth";

export type CalendarKind = "event" | "reminder" | "note" | "follow_up" | "call" | "meeting" | "task";

export interface CalendarEvent {
  id: string;
  rep_code: string;
  kind: CalendarKind;
  title: string;
  body: string | null;
  start_at: string;
  end_at: string | null;
  all_day: boolean;
  lead_id: string | null;
  completed: boolean;
  completed_at: string | null;
  rep_notes: string | null;
  admin_notes: string | null;
  created_by: "rep" | "admin" | "system";
  created_at: string;
  updated_at: string;
}
export interface LeadSummary {
  id: string;
  business_name: string | null;
  contact_name: string | null;
  phone?: string | null;
  email?: string | null;
  status?: string | null;
  last_touched_at?: string | null;
}
export interface RepSummary {
  code: string;
  rep_name: string | null;
  role: "rep" | "partner" | null;
  is_active: boolean;
}
export interface CalendarListResponse {
  rep_code?: string;
  events: CalendarEvent[];
  leads_by_id?: Record<string, LeadSummary>;
  active_leads?: LeadSummary[];
  reps?: RepSummary[];
}

function buildHeaders(): Record<string, string> {
  const h: Record<string, string> = {};
  const portal = getPortalToken();
  if (portal) h["x-portal-token"] = portal;
  const admin = getAdminToken();
  if (admin) h["x-admin-token"] = admin;
  return h;
}

async function call<T>(body: Record<string, unknown>): Promise<T> {
  const { data, error } = await supabase.functions.invoke("portal-calendar", {
    body, headers: buildHeaders(),
  });
  if (error) throw new Error(error.message);
  if ((data as { error?: string })?.error) throw new Error((data as { error: string }).error);
  return data as T;
}

export const listCalendar = (params: { rep_code?: string; from?: string; to?: string }) =>
  call<CalendarListResponse>({ action: "list", ...params });

export const createCalendarEvent = (input: Partial<CalendarEvent> & { rep_code?: string }) =>
  call<{ event: CalendarEvent }>({ action: "create", ...input });

export const updateCalendarEvent = (id: string, patch: Partial<CalendarEvent>) =>
  call<{ event: CalendarEvent }>({ action: "update", id, ...patch });

export const deleteCalendarEvent = (id: string) =>
  call<{ ok: boolean }>({ action: "delete", id });

// ---- helpers ----
export const KIND_META: Record<CalendarKind, { label: string; icon: string; color: string }> = {
  event:     { label: "Event",       icon: "📅", color: "bg-amber/15 text-amber border-amber/30" },
  reminder:  { label: "Reminder",    icon: "⏰", color: "bg-blue-500/15 text-blue-300 border-blue-500/30" },
  note:      { label: "Note",        icon: "📝", color: "bg-muted text-muted-foreground border-border" },
  follow_up: { label: "Follow-up",   icon: "🔁", color: "bg-crimson/15 text-crimson border-crimson/40" },
  call:      { label: "Call",        icon: "📞", color: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30" },
  meeting:   { label: "Meeting",     icon: "🤝", color: "bg-violet-500/15 text-violet-300 border-violet-500/30" },
  task:      { label: "Task",        icon: "✅", color: "bg-orange-500/15 text-orange-300 border-orange-500/30" },
};
