import { supabase } from "@/integrations/supabase/client";
import { getAdminToken } from "@/lib/adminAuth";
import { getPortalToken } from "@/lib/portalAuth";
import type { OwnerRole } from "@/lib/companyCalendar";

export interface LeadershipRole {
  id: string;
  role_slug: OwnerRole;
  display_name: string;
  title: string;
  owns: string[];
  does_not_own: string[];
  decision_authority: string[];
  accent_color: string;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

function headers(): Record<string, string> {
  const h: Record<string, string> = {};
  const a = getAdminToken(); if (a) h["x-admin-token"] = a;
  const p = getPortalToken(); if (p) h["x-portal-token"] = p;
  return h;
}

async function call<T>(body: Record<string, unknown>): Promise<T> {
  const { data, error } = await supabase.functions.invoke("company-calendar", { body, headers: headers() });
  if (error) throw new Error(error.message);
  if ((data as { error?: string })?.error) throw new Error((data as { error: string }).error);
  return data as T;
}

export const listLeadershipRoles = () =>
  call<{ ok: true; roles: LeadershipRole[] }>({ action: "list_roles" }).then(d => d.roles);

export const updateLeadershipRole = (role_slug: OwnerRole, patch: Partial<Omit<LeadershipRole, "id" | "role_slug" | "created_at" | "updated_at">>) =>
  call<{ ok: true; role: LeadershipRole }>({ action: "update_role", role_slug, ...patch }).then(d => d.role);
