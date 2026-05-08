import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.86.0";
import { verifyPortalToken, getPortalTokenFromRequest } from "../_shared/portal-token.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-portal-token, x-admin-token",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const portalToken = getPortalTokenFromRequest(req);
    const claims = await verifyPortalToken(portalToken, SERVICE_ROLE);
    if (!claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE);
    const { action, module_slug, watched_seconds, completed } = await req.json();

    if (action === "list") {
      const { data, error } = await supabase
        .from("onboarding_progress")
        .select("module_slug, watched_seconds, completed_at")
        .eq("rep_code", claims.code);
      if (error) throw error;
      return new Response(JSON.stringify({ progress: data || [] }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "update") {
      if (!module_slug) throw new Error("module_slug required");
      const row: Record<string, unknown> = {
        rep_code: claims.code,
        module_slug,
        watched_seconds: Math.max(0, Number(watched_seconds) || 0),
      };
      if (completed) row.completed_at = new Date().toISOString();
      const { error } = await supabase
        .from("onboarding_progress")
        .upsert(row, { onConflict: "rep_code,module_slug" });
      if (error) throw error;
      return new Response(JSON.stringify({ ok: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "unknown action" }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
