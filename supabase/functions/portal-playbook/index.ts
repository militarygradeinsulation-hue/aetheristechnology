// Portal-side READ-ONLY access to the rep playbook: this week's schedule, plays library, idea-of-day.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";
import { verifyPortalToken, getPortalTokenFromRequest } from "../_shared/portal-token.ts";
import { verifyAdminToken, getAdminTokenFromRequest } from "../_shared/admin-token.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-portal-token, x-admin-token",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Accept either a portal token (real reps) OR an admin token (admin preview)
    let repCode: string | null = null;
    const portalClaims = await verifyPortalToken(getPortalTokenFromRequest(req), SERVICE).catch(() => null);
    if (portalClaims?.code) {
      repCode = portalClaims.code;
    } else {
      const adminOk = await verifyAdminToken(getAdminTokenFromRequest(req), SERVICE);
      if (!adminOk) return json({ error: "Unauthorized" }, 401);
      repCode = "ADMIN";
    }

    const admin = createClient(SUPABASE_URL, SERVICE);
    const today = new Date().toISOString().slice(0, 10);

    const [schedule, plays, idea, quota] = await Promise.all([
      admin.from("rep_playbook_schedule").select("*").eq("is_active", true).order("day_of_week").order("block_order"),
      admin.from("rep_plays").select("*").eq("is_published", true).order("category").order("title"),
      admin.from("rep_idea_of_day").select("*").eq("for_date", today).eq("is_active", true).maybeSingle(),
      repCode === "ADMIN" ? Promise.resolve({ data: null }) :
        admin.from("rep_quotas").select("*").eq("rep_code", repCode).eq("period", "weekly").maybeSingle(),
    ]);

    return json({
      rep_code: repCode,
      schedule: schedule.data || [],
      plays: plays.data || [],
      idea_today: idea.data || null,
      quota: quota.data || null,
    });
  } catch (e) {
    console.error("portal-playbook error", e);
    return json({ error: (e as Error).message || "Internal error" }, 500);
  }
});
