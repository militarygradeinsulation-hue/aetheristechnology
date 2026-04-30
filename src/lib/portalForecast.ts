import { supabase } from "@/integrations/supabase/client";
import { getPortalToken } from "@/lib/portalAuth";

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

async function call(action: string, body: Record<string, unknown> = {}) {
  const token = getPortalToken();
  if (!token) throw new Error("Not signed in");
  const { data, error } = await supabase.functions.invoke("portal-forecast", {
    body: { action, ...body },
    headers: { "x-portal-token": token },
  });
  if (error) throw new Error(error.message);
  if ((data as { error?: string })?.error) throw new Error((data as { error: string }).error);
  return data;
}

export const portalForecast = {
  getToday: () => call("get_today") as Promise<{ briefing: ForecastBriefing | null; age_hours: number | null }>,
  regenerate: () => call("regenerate") as Promise<{ ok: boolean; briefing: ForecastBriefing | null }>,
  pushLead: (company: ForecastCompany) =>
    call("push_lead", { company }) as Promise<{ ok: boolean; id?: string; duplicate?: boolean }>,
};
