import { supabase } from "@/integrations/supabase/client";
import { getAdminToken } from "@/lib/adminAuth";

export interface ScheduleBlock {
  id: string;
  day_of_week: number;
  block_order: number;
  title: string;
  description: string | null;
  category: string;
  duration_minutes: number | null;
  is_active: boolean;
}
export interface Play {
  id: string;
  title: string;
  category: string;
  stage: string | null;
  industry: string | null;
  body: string;
  tags: string[];
  is_published: boolean;
  source: string;
  created_at: string;
}
export interface Quota {
  id: string;
  rep_code: string;
  period: "weekly" | "monthly" | "quarterly";
  calls_target: number;
  meetings_target: number;
  proposals_target: number;
  revenue_target_cents: number;
  notes: string | null;
}
export interface IdeaOfDay {
  id: string;
  for_date: string;
  title: string;
  body: string;
  category: string | null;
  source: string;
  is_active: boolean;
}
export interface RepRef { code: string; rep_name: string; role: string; is_active: boolean }
export interface RepCrmSummary {
  rep_code: string;
  talked_to: number; qualified: number; proposals_sent: number;
  deals_open: number; deals_won: number; deals_lost: number;
  revenue_won_cents: number;
  calls: number; emails: number; meetings: number;
}

async function call<T>(action: string, payload: Record<string, unknown> = {}): Promise<T> {
  const token = getAdminToken();
  if (!token) throw new Error("Admin not signed in");
  const { data, error } = await supabase.functions.invoke("admin-rep-playbook", {
    body: { action, ...payload },
    headers: { "x-admin-token": token },
  });
  if (error) throw new Error(error.message);
  if ((data as { error?: string })?.error) throw new Error((data as { error: string }).error);
  return data as T;
}

export const adminPlaybook = {
  getAll: () => call<{
    schedule: ScheduleBlock[]; plays: Play[]; quotas: Quota[];
    idea_today: IdeaOfDay | null; reps: RepRef[];
  }>("get_all"),
  scheduleUpsert: (row: Partial<ScheduleBlock>) => call<{ row: ScheduleBlock }>("schedule_upsert", { row }),
  scheduleDelete: (id: string) => call<{ ok: boolean }>("schedule_delete", { id }),
  playUpsert: (row: Partial<Play>) => call<{ row: Play }>("play_upsert", { row }),
  playDelete: (id: string) => call<{ ok: boolean }>("play_delete", { id }),
  playGenerate: (opts: { category: string; stage?: string; industry?: string; prompt?: string }) =>
    call<{ row: Play }>("play_generate_ai", opts),
  quotaUpsert: (row: Partial<Quota>) => call<{ row: Quota }>("quota_upsert", { row }),
  quotaDelete: (id: string) => call<{ ok: boolean }>("quota_delete", { id }),
  ideaGenerate: () => call<{ row: IdeaOfDay }>("idea_generate"),
  ideaSetManual: (title: string, body: string, category?: string) =>
    call<{ row: IdeaOfDay }>("idea_set_manual", { title, body, category }),
  crmRepSummary: () => call<{ summary: RepCrmSummary[] }>("crm_rep_summary"),
};

export const DAYS = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];
export const PLAY_CATEGORIES = [
  { value: "cold_call", label: "Cold Call Script" },
  { value: "objection", label: "Objection Handler" },
  { value: "followup", label: "Follow-Up Sequence" },
  { value: "qualification", label: "Qualification Questions" },
  { value: "email", label: "Cold Email" },
  { value: "discovery", label: "Discovery" },
  { value: "proposal", label: "Proposal Talk Track" },
];
export const SCHEDULE_CATEGORIES = [
  { value: "prospecting", label: "Prospecting" },
  { value: "followup", label: "Follow-Ups" },
  { value: "discovery", label: "Discovery Calls" },
  { value: "proposal", label: "Proposals" },
  { value: "closing", label: "Closing" },
  { value: "training", label: "Training/Coaching" },
  { value: "general", label: "General" },
];
