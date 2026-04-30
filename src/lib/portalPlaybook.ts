import { supabase } from "@/integrations/supabase/client";
import { getAdminToken } from "@/lib/adminAuth";

export interface PortalScheduleBlock {
  id: string;
  day_of_week: number;
  block_order: number;
  title: string;
  description: string | null;
  category: string;
  duration_minutes: number | null;
}
export interface PortalPlay {
  id: string;
  title: string;
  category: string;
  stage: string | null;
  industry: string | null;
  body: string;
  tags: string[];
}
export interface PortalIdea {
  id: string;
  for_date: string;
  title: string;
  body: string;
  category: string | null;
}
export interface PortalQuota {
  id: string;
  rep_code: string;
  period: string;
  calls_target: number;
  meetings_target: number;
  proposals_target: number;
  revenue_target_cents: number;
}

export interface PortalPlaybookResponse {
  rep_code: string;
  schedule: PortalScheduleBlock[];
  plays: PortalPlay[];
  idea_today: PortalIdea | null;
  quota: PortalQuota | null;
}

export async function fetchPortalPlaybook(portalToken: string | null): Promise<PortalPlaybookResponse> {
  const adminToken = getAdminToken();
  const headers: Record<string, string> = {};
  if (portalToken) headers["x-portal-token"] = portalToken;
  if (adminToken) headers["x-admin-token"] = adminToken;
  const { data, error } = await supabase.functions.invoke("portal-playbook", { body: {}, headers });
  if (error) throw new Error(error.message);
  if ((data as { error?: string })?.error) throw new Error((data as { error: string }).error);
  return data as PortalPlaybookResponse;
}
