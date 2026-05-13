import { supabase } from "@/integrations/supabase/client";
import { getAdminToken } from "@/lib/adminAuth";

export interface DailyChecklistState {
  notifications_reposted: boolean;
  connections_added: number;
  blog_posted: boolean;
}
export interface DailyBlogPayload {
  kind: "blog" | "playbook";
  title: string;
  slug: string | null;
  excerpt: string | null;
  tags: string[];
  featured_image: string | null;
  share_url: string;
  share_snippet: string;
  published_at: string | null;
  is_today: boolean;
}
export interface DailyChecklistResponse {
  date: string;
  checklist: DailyChecklistState;
  blog: DailyBlogPayload | null;
  main_linkedin: { latest_post_url: string; company_url: string };
  rep_code: string;
}

function headers(portalToken: string | null): Record<string, string> {
  const h: Record<string, string> = {};
  if (portalToken) h["x-portal-token"] = portalToken;
  const adminToken = getAdminToken();
  if (adminToken) h["x-admin-token"] = adminToken;
  return h;
}

export async function fetchDailyChecklist(portalToken: string | null): Promise<DailyChecklistResponse> {
  const { data, error } = await supabase.functions.invoke("portal-daily-checklist", {
    body: { action: "get" },
    headers: headers(portalToken),
  });
  if (error) throw new Error(error.message);
  if ((data as { error?: string })?.error) throw new Error((data as { error: string }).error);
  return data as DailyChecklistResponse;
}

export async function updateDailyChecklist(
  portalToken: string | null,
  patch: Partial<DailyChecklistState>,
): Promise<DailyChecklistResponse> {
  const { data, error } = await supabase.functions.invoke("portal-daily-checklist", {
    body: { action: "update", ...patch },
    headers: headers(portalToken),
  });
  if (error) throw new Error(error.message);
  if ((data as { error?: string })?.error) throw new Error((data as { error: string }).error);
  return data as DailyChecklistResponse;
}
