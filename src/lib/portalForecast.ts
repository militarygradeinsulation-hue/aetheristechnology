import { supabase } from "@/integrations/supabase/client";
import { getPortalToken } from "@/lib/portalAuth";
import { getAdminToken } from "@/lib/adminAuth";

export interface ForecastTip { headline: string; body: string; tag?: string }
export interface ForecastTrend { title: string; why: string; source_url?: string }
export interface ForecastIndustry { vertical: string; shift: string; why: string; source_url?: string }
export interface ForecastCompany {
  name: string; website?: string; industry?: string; location?: string;
  signal: string; why: string; source_url?: string;
}
export interface ForecastBriefing {
  briefing_date: string;
  tip: ForecastTip;
  tech: ForecastTrend[];
  industry: ForecastIndustry[];
  companies: ForecastCompany[];
  generated_at: string;
}

export type ForecastAuthMode = "portal" | "admin";

async function call(action: string, body: Record<string, unknown> = {}, mode: ForecastAuthMode = "portal") {
  const headers: Record<string, string> = {};
  if (mode === "admin") {
    const t = getAdminToken();
    if (!t) throw new Error("Admin not signed in");
    headers["x-admin-token"] = t;
  } else {
    const t = getPortalToken();
    if (!t) throw new Error("Not signed in");
    headers["x-portal-token"] = t;
  }
  const { data, error } = await supabase.functions.invoke("portal-forecast", {
    body: { action, ...body },
    headers,
  });
  if (error) throw new Error(error.message);
  if ((data as { error?: string })?.error) throw new Error((data as { error: string }).error);
  return data;
}

export const portalForecast = {
  getToday: (mode: ForecastAuthMode = "portal") =>
    call("get_today", {}, mode) as Promise<{ briefing: ForecastBriefing | null; age_hours: number | null }>,
  regenerate: (mode: ForecastAuthMode = "portal") =>
    call("regenerate", {}, mode) as Promise<{ ok: boolean; briefing: ForecastBriefing | null }>,
  pushLead: (company: ForecastCompany, mode: ForecastAuthMode = "portal") =>
    call("push_lead", { company }, mode) as Promise<{ ok: boolean; id?: string; duplicate?: boolean }>,
};
