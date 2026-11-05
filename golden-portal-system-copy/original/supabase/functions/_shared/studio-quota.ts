// Daily per-rep usage caps for the rep portal studios.
// Centralises the limits so admins can tune them in one place.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.86.0";

export type StudioAction =
  | "image_generate"
  | "image_edit"
  | "video_plan"
  | "tts"
  | "music"
  | "ideas";

// Daily caps per rep (UTC day). Tuned to stop credit overruns.
export const STUDIO_DAILY_LIMITS: Record<StudioAction, number> = {
  image_generate: 15,
  image_edit: 10,
  video_plan: 5,
  tts: 25,
  music: 5,
  ideas: 20,
};

const LABELS: Record<StudioAction, string> = {
  image_generate: "image generations",
  image_edit: "image edits",
  video_plan: "video plans",
  tts: "voiceovers",
  music: "music tracks",
  ideas: "idea generations",
};

function todayUtc(): string {
  return new Date().toISOString().slice(0, 10);
}

/**
 * Check + increment a rep's daily usage atomically.
 * Returns { ok:true } if under cap (and counter was bumped),
 * or { ok:false, error } when the cap is hit.
 */
export async function consumeStudioQuota(
  serviceKey: string,
  supabaseUrl: string,
  repCode: string,
  action: StudioAction,
): Promise<{ ok: true; remaining: number } | { ok: false; error: string; limit: number; used: number }> {
  // Admin-pushed shared library writes etc. — never gate the SHARED bucket.
  if (!repCode || repCode === "SHARED") return { ok: true, remaining: 9999 };
  // Unlimited access: admins + Dean Young (rep 482917).
  if (repCode === "ADMIN" || repCode === "482917") return { ok: true, remaining: 9999 };
  const limit = STUDIO_DAILY_LIMITS[action];
  if (!limit) return { ok: true, remaining: 9999 };

  const supabase = createClient(supabaseUrl, serviceKey);
  const day = todayUtc();

  // Read current count.
  const { data: row } = await supabase
    .from("rep_studio_usage")
    .select("count")
    .eq("rep_code", repCode)
    .eq("day", day)
    .eq("action", action)
    .maybeSingle();
  const used = row?.count ?? 0;
  if (used >= limit) {
    return {
      ok: false,
      limit,
      used,
      error: `Daily limit reached: ${used}/${limit} ${LABELS[action]} for today. Resets at 00:00 UTC.`,
    };
  }
  // Upsert + increment.
  const next = used + 1;
  const { error } = await supabase
    .from("rep_studio_usage")
    .upsert(
      { rep_code: repCode, day, action, count: next, updated_at: new Date().toISOString() },
      { onConflict: "rep_code,day,action" },
    );
  if (error) {
    console.error("studio-quota upsert error", error);
    // Fail open rather than block the rep over a transient bug.
    return { ok: true, remaining: limit - next };
  }
  return { ok: true, remaining: limit - next };
}
