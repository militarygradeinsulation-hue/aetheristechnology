// New-rep blueprint state for the logged-in rep.
// - get:    returns first_login_at + which task_ids are done. Sets first_login_at
//           on the first call if it's null (the moment the rep first opens
//           their portal with their code).
// - toggle: marks a (day_index, task_id) as done or not done.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";
import { verifyPortalToken, getPortalTokenFromRequest } from "../_shared/portal-token.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-portal-token, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};
const json = (b: unknown, status = 200) =>
  new Response(JSON.stringify(b), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const claims = await verifyPortalToken(getPortalTokenFromRequest(req), SERVICE).catch(() => null);
    if (!claims?.code) return json({ error: "Unauthorized" }, 401);
    const repCode = claims.code;
    const isPartner = claims.role === "partner";

    const admin = createClient(SUPABASE_URL, SERVICE);
    const body = await req.json().catch(() => ({} as Record<string, unknown>));
    const action = (body.action as string) || "get";

    // Read rep + stamp first_login_at if it's null (the trigger event for Day 1).
    const { data: rep } = await admin
      .from("rep_codes")
      .select("code, rep_name, role, first_login_at, created_at")
      .eq("code", repCode)
      .maybeSingle();
    if (!rep) return json({ error: "Rep not found" }, 404);

    let firstLoginAt = rep.first_login_at as string | null;
    if (!firstLoginAt) {
      const stamp = new Date().toISOString();
      const { error: stampErr } = await admin
        .from("rep_codes")
        .update({ first_login_at: stamp })
        .eq("code", repCode)
        .is("first_login_at", null);
      if (!stampErr) firstLoginAt = stamp;
    }

    if (action === "toggle") {
      const dayIndex = Math.max(1, Math.floor(Number(body.day_index) || 0));
      const taskId = String(body.task_id || "").slice(0, 80);
      const done = !!body.done;
      if (!dayIndex || !taskId) return json({ error: "day_index and task_id required" }, 400);
      if (done) {
        await admin
          .from("rep_blueprint_progress")
          .upsert(
            { rep_code: repCode, day_index: dayIndex, task_id: taskId, done_at: new Date().toISOString() },
            { onConflict: "rep_code,day_index,task_id" },
          );
      } else {
        await admin
          .from("rep_blueprint_progress")
          .delete()
          .eq("rep_code", repCode)
          .eq("day_index", dayIndex)
          .eq("task_id", taskId);
      }
    }

    const { data: progress } = await admin
      .from("rep_blueprint_progress")
      .select("day_index, task_id, done_at")
      .eq("rep_code", repCode)
      .order("day_index", { ascending: true });

    return json({
      rep_code: repCode,
      rep_name: rep.rep_name || null,
      is_partner: isPartner,
      first_login_at: firstLoginAt,
      created_at: rep.created_at,
      progress: progress ?? [],
    });
  } catch (e) {
    console.error("portal-blueprint error", e);
    return json({ error: (e as Error).message || "Internal error" }, 500);
  }
});
