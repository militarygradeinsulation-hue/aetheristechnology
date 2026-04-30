import { supabase } from "@/integrations/supabase/client";
import { getAdminToken } from "@/lib/adminAuth";

export interface TopicQuery { id: string; label: string; query: string; enabled: boolean; industry?: string }
export interface IndustryPreset { id: string; label: string; queries: string[] }
export interface EducationItem { kind: "blog" | "playbook" | "topic"; id: string; title: string; enabled: boolean }

export interface ForecastSettings {
  id: string;
  is_active: boolean;
  refresh_cadence_minutes: number;
  web_window: "h" | "d" | "w" | "m";
  topic_queries: TopicQuery[];
  industry_presets: IndustryPreset[];
  sources: { aetheris_blog: boolean; aetheris_playbooks: boolean; web: boolean };
  sections: { tip: boolean; education: boolean; tech: boolean; industry: boolean; live_pulse: boolean; companies: boolean };
  education_pool: EducationItem[];
  live_pulse_minutes: number;
  updated_at: string;
}

export interface ForecastRunSummary {
  briefing_date: string;
  generated_at: string;
  model: string | null;
  signal_count: number;
  company_count: number;
  education_count: number;
  pulse_count: number;
}

async function call<T>(action: string, body: Record<string, unknown> = {}): Promise<T> {
  const token = getAdminToken();
  if (!token) throw new Error("Admin not signed in");
  const { data, error } = await supabase.functions.invoke("admin-forecast-settings", {
    body: { action, ...body },
    headers: { "x-admin-token": token },
  });
  if (error) throw new Error(error.message);
  if ((data as { error?: string })?.error) throw new Error((data as { error: string }).error);
  return data as T;
}

export const adminForecast = {
  getSettings: () => call<{ settings: ForecastSettings; education_candidates: EducationItem[] }>("get"),
  updateSettings: (patch: Partial<ForecastSettings>) =>
    call<{ settings: ForecastSettings }>("update", { patch }),
  listRuns: () => call<{ runs: ForecastRunSummary[] }>("list_runs"),
  forceRun: () => call<{ ok: boolean; date?: string; error?: string }>("force_run"),
};
