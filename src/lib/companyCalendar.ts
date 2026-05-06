import { supabase } from "@/integrations/supabase/client";
import { getAdminToken } from "@/lib/adminAuth";
import { getPortalToken } from "@/lib/portalAuth";

export type CompanyCalendarKind = "goal" | "vertical" | "topic" | "event" | "push" | "note";

export interface CompanyCalendarAttachment {
  name: string;
  url: string;
  path: string;
  size: number;
  type: string;
}

export interface CompanyCalendarAIPlan {
  summary?: string;
  tactics?: string[];
  kpis?: string[];
  raw?: string;
  generated_at?: string;
}

export interface CompanyCalendarEntry {
  id: string;
  date: string; // YYYY-MM-DD
  kind: CompanyCalendarKind;
  title: string;
  body: string;
  attachments: CompanyCalendarAttachment[];
  ai_plan: CompanyCalendarAIPlan;
  pinned: boolean;
  color: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

function headers(): Record<string, string> {
  const h: Record<string, string> = {};
  const adm = getAdminToken();
  if (adm) h["x-admin-token"] = adm;
  const p = getPortalToken();
  if (p) h["x-portal-token"] = p;
  return h;
}

async function call<T>(payload: Record<string, unknown>): Promise<T> {
  const { data, error } = await supabase.functions.invoke("company-calendar", { body: payload, headers: headers() });
  if (error) throw new Error(error.message);
  if ((data as { error?: string })?.error) throw new Error((data as { error: string }).error);
  return data as T;
}

export const listCompanyCalendar = (params: { from?: string; to?: string } = {}) =>
  call<{ ok: true; entries: CompanyCalendarEntry[] }>({ action: "list", ...params }).then(d => d.entries);

export const upsertCompanyEntry = (entry: Partial<CompanyCalendarEntry>) =>
  call<{ ok: true; entry: CompanyCalendarEntry }>({ action: entry.id ? "update" : "create", ...entry }).then(d => d.entry);

export const deleteCompanyEntry = (id: string) =>
  call<{ ok: true }>({ action: "delete", id });

export const aiPlanCompany = (prompt: string, context = "") =>
  call<{ ok: true; plan: { title?: string; kind?: CompanyCalendarKind; summary?: string; tactics?: string[]; kpis?: string[]; suggested_date?: string | null; raw?: string } }>({ action: "ai_plan", prompt, context }).then(d => d.plan);

export const KIND_META: Record<CompanyCalendarKind, { label: string; icon: string; color: string }> = {
  goal:     { label: "Goal of the Day", icon: "🎯", color: "bg-amber/15 text-amber border-amber/40" },
  vertical: { label: "Vertical Focus",  icon: "🏭", color: "bg-blue-500/15 text-blue-300 border-blue-500/30" },
  topic:    { label: "Topic to Post",   icon: "📣", color: "bg-violet-500/15 text-violet-300 border-violet-500/30" },
  event:    { label: "Event",           icon: "📅", color: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30" },
  push:     { label: "Sales Push",      icon: "🔥", color: "bg-crimson/15 text-crimson border-crimson/40" },
  note:     { label: "Note",            icon: "📝", color: "bg-muted text-muted-foreground border-border" },
};

export const COMPANY_CAL_BUCKET = "workspace-files";
