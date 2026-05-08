import { supabase } from "@/integrations/supabase/client";
import { getAdminToken } from "@/lib/adminAuth";
import { getPortalToken } from "@/lib/portalAuth";

export interface OnboardingSlide {
  title: string;
  bullets: string[];
  narration: string;
  audio_url?: string;
  duration_sec?: number;
  /** Route inside the app to embed as a live screenshot while this slide narrates (e.g. "/portal?tab=leads"). */
  route?: string;
  /** Optional override: a static image URL to show instead of the live route iframe. */
  image_url?: string;
}

export interface OnboardingModule {
  id: string;
  slug: string;
  title: string;
  summary: string | null;
  order_index: number;
  status: "pending" | "generating" | "ready" | "failed";
  slides_json: OnboardingSlide[];
  total_duration_sec: number | null;
  error_message: string | null;
  generated_at: string | null;
  created_at: string;
}

export async function listModules(): Promise<OnboardingModule[]> {
  const { data, error } = await supabase
    .from("onboarding_modules")
    .select("*")
    .order("order_index", { ascending: true });
  if (error) throw error;
  return (data || []) as unknown as OnboardingModule[];
}

export async function generateModule(args: {
  slug: string;
  title: string;
  summary: string;
  scriptOutline: string;
  order_index: number;
  routeHints?: Record<string, string>;
}): Promise<OnboardingModule> {
  const token = getAdminToken();
  if (!token) throw new Error("Admin session required");
  const { data, error } = await supabase.functions.invoke("onboarding-generate", {
    body: args,
    headers: { "x-admin-token": token },
  });
  if (error) throw new Error(error.message);
  if ((data as { error?: string })?.error) throw new Error((data as { error: string }).error);
  return (data as { module: OnboardingModule }).module;
}

export async function updateModule(
  id: string,
  patch: Partial<Pick<OnboardingModule, "title" | "summary" | "slides_json" | "order_index" | "status">>,
): Promise<OnboardingModule> {
  const token = getAdminToken();
  if (!token) throw new Error("Admin session required");
  const { data, error } = await supabase.functions.invoke("onboarding-manage", {
    body: { action: "update", id, patch },
    headers: { "x-admin-token": token },
  });
  if (error) throw new Error(error.message);
  if ((data as { error?: string })?.error) throw new Error((data as { error: string }).error);
  return (data as { module: OnboardingModule }).module;
}

export async function deleteModule(id: string): Promise<void> {
  const token = getAdminToken();
  if (!token) throw new Error("Admin session required");
  const { data, error } = await supabase.functions.invoke("onboarding-manage", {
    body: { action: "delete", id },
    headers: { "x-admin-token": token },
  });
  if (error) throw new Error(error.message);
  if ((data as { error?: string })?.error) throw new Error((data as { error: string }).error);
}

// ─── Screenshots ───
export async function listScreenshots(): Promise<Record<string, string>> {
  const token = getAdminToken();
  if (!token) throw new Error("Admin session required");
  const { data, error } = await supabase.functions.invoke("onboarding-manage", {
    body: { action: "list_screenshots" },
    headers: { "x-admin-token": token },
  });
  if (error) throw new Error(error.message);
  if ((data as { error?: string })?.error) throw new Error((data as { error: string }).error);
  return (data as { screenshots: Record<string, string> }).screenshots || {};
}

export async function uploadScreenshot(key: string, base64: string): Promise<string> {
  const token = getAdminToken();
  if (!token) throw new Error("Admin session required");
  const { data, error } = await supabase.functions.invoke("onboarding-manage", {
    body: { action: "upload_screenshot", key, base64 },
    headers: { "x-admin-token": token },
  });
  if (error) throw new Error(error.message);
  if ((data as { error?: string })?.error) throw new Error((data as { error: string }).error);
  return (data as { url: string }).url;
}

export async function deleteScreenshot(key: string): Promise<void> {
  const token = getAdminToken();
  if (!token) throw new Error("Admin session required");
  const { data, error } = await supabase.functions.invoke("onboarding-manage", {
    body: { action: "delete_screenshot", key },
    headers: { "x-admin-token": token },
  });
  if (error) throw new Error(error.message);
  if ((data as { error?: string })?.error) throw new Error((data as { error: string }).error);
}

// ─── Rep progress ───
export interface ProgressRow {
  module_slug: string;
  watched_seconds: number;
  completed_at: string | null;
}

export async function listProgress(): Promise<ProgressRow[]> {
  const token = getPortalToken();
  if (!token) return [];
  const { data, error } = await supabase.functions.invoke("onboarding-progress", {
    body: { action: "list" },
    headers: { "x-portal-token": token },
  });
  if (error) throw new Error(error.message);
  return ((data as { progress: ProgressRow[] })?.progress) || [];
}

export async function updateProgress(slug: string, watchedSeconds: number, completed = false) {
  const token = getPortalToken();
  if (!token) return;
  await supabase.functions.invoke("onboarding-progress", {
    body: { action: "update", module_slug: slug, watched_seconds: watchedSeconds, completed },
    headers: { "x-portal-token": token },
  });
}
