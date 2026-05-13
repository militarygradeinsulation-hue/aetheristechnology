import { supabase } from "@/integrations/supabase/client";

export type HireTeam = {
  id: string;
  name: string;
  description: string | null;
  experience_band: string | null;
  sort_order: number;
  created_at: string;
};

export type HireTeamCadence = {
  id: string;
  team_id: string;
  title: string;
  cadence: "daily" | "weekly" | "monthly" | "quarterly";
  day_of_week: number | null;
  notes: string | null;
  push_to_calendar: boolean;
  sort_order: number;
};

export type HirePlaybookEntry = {
  id: string;
  section: "day_one" | "week_one" | "red_flags" | "reactivation";
  title: string;
  body: string;
  sort_order: number;
  updated_at: string;
};

export async function listTeams(): Promise<HireTeam[]> {
  const { data, error } = await supabase.from("hire_teams").select("*").order("sort_order");
  if (error) throw error;
  return (data || []) as HireTeam[];
}

export async function createTeam(input: { name: string; description?: string; experience_band?: string }) {
  const { data, error } = await supabase.from("hire_teams").insert(input).select().single();
  if (error) throw error;
  return data as HireTeam;
}

export async function deleteTeam(id: string) {
  const { error } = await supabase.from("hire_teams").delete().eq("id", id);
  if (error) throw error;
}

export async function listCadence(): Promise<HireTeamCadence[]> {
  const { data, error } = await supabase.from("hire_team_cadence").select("*").order("sort_order");
  if (error) throw error;
  return (data || []) as HireTeamCadence[];
}

export async function createCadence(input: Partial<HireTeamCadence> & { team_id: string; title: string; cadence: string }) {
  const { data, error } = await supabase.from("hire_team_cadence").insert(input as any).select().single();
  if (error) throw error;
  return data as HireTeamCadence;
}

export async function updateCadence(id: string, patch: Partial<HireTeamCadence>) {
  const { error } = await supabase.from("hire_team_cadence").update(patch as any).eq("id", id);
  if (error) throw error;
}

export async function deleteCadence(id: string) {
  const { error } = await supabase.from("hire_team_cadence").delete().eq("id", id);
  if (error) throw error;
}

export async function listPlaybook(): Promise<HirePlaybookEntry[]> {
  const { data, error } = await supabase
    .from("hire_playbook_entries")
    .select("*")
    .order("section")
    .order("sort_order");
  if (error) throw error;
  return (data || []) as HirePlaybookEntry[];
}

export async function upsertPlaybook(entry: Partial<HirePlaybookEntry> & { section: string; title: string; body: string }) {
  if (entry.id) {
    const { error } = await supabase
      .from("hire_playbook_entries")
      .update({ title: entry.title, body: entry.body, section: entry.section })
      .eq("id", entry.id);
    if (error) throw error;
  } else {
    const { error } = await supabase.from("hire_playbook_entries").insert(entry as any);
    if (error) throw error;
  }
}

export async function deletePlaybook(id: string) {
  const { error } = await supabase.from("hire_playbook_entries").delete().eq("id", id);
  if (error) throw error;
}

export async function setRepTeam(repId: string, teamName: string) {
  const { error } = await supabase.from("rep_codes").update({ team_name: teamName } as any).eq("id", repId);
  if (error) throw error;
}

/**
 * Revoke all access for a rep — deletes their auth user (if any),
 * then their rep_codes row (which cascades to mailbox/notes/library/settings).
 */
export async function revokeRepAccess(code: string): Promise<{ revoked: boolean; auth_deleted: boolean }> {
  const { data, error } = await supabase.functions.invoke("revoke-rep-access", { body: { code } });
  if (error) throw error;
  return data as { revoked: boolean; auth_deleted: boolean };
}
