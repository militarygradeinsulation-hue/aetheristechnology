import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.86.0";
import { verifyPortalToken, getPortalTokenFromRequest } from "../_shared/portal-token.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-portal-token",
};

const ALLOWED = new Set([
  "login", "lead_claim", "lead_release", "lead_touch", "lead_status",
  "lead_upload", "lead_download", "tool_open", "tab_view",
]);

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const secret = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const claims = await verifyPortalToken(getPortalTokenFromRequest(req), secret);
    if (!claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const body = await req.json().catch(() => ({}));
    const event = String(body.event || "");
    if (!ALLOWED.has(event)) {
      return new Response(JSON.stringify({ error: "Invalid event" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const meta = (body.meta && typeof body.meta === "object") ? body.meta : {};
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || null;
    const ua = req.headers.get("user-agent") || null;

    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, secret);

    // Look up rep_name for nicer admin display (cheap, cached client-side anyway).
    const { data: rep } = await supabase
      .from("rep_codes").select("rep_name").eq("code", claims.code).maybeSingle();

    await supabase.from("rep_activity").insert({
      rep_code: claims.code,
      rep_name: rep?.rep_name || null,
      event,
      meta,
      ip,
      user_agent: ua,
    });

    return new Response(JSON.stringify({ ok: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    console.error("portal-activity error:", e);
    return new Response(JSON.stringify({ error: "Server error" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
