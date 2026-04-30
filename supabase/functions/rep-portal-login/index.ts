// Code-only login for the Rep / Partner Portal.
// Validates a 6-digit code from public.rep_codes (active only) and returns a
// short-lived HMAC token bound to the role (rep | partner).
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.86.0";
import { signPortalToken } from "../_shared/portal-token.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const body = await req.json().catch(() => ({}));
    const code = String(body?.code || "").trim();
    if (!/^\d{4,12}$/.test(code)) {
      return new Response(JSON.stringify({ error: "Invalid code format" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const sb = createClient(SUPABASE_URL, SERVICE_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const { data, error } = await sb.from("rep_codes")
      .select("code, rep_name, rep_email, commission_rate, total_sales_cents, total_commission_cents, role, is_active")
      .eq("code", code)
      .eq("is_active", true)
      .maybeSingle();

    if (error || !data) {
      return new Response(JSON.stringify({ error: "Invalid or inactive code" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const role: "rep" | "partner" = data.role === "partner" ? "partner" : "rep";
    const { token, exp } = await signPortalToken(data.code, role, SERVICE_KEY);

    return new Response(
      JSON.stringify({
        ok: true,
        token,
        exp,
        profile: {
          code: data.code,
          rep_name: data.rep_name,
          rep_email: data.rep_email,
          commission_rate: Number(data.commission_rate),
          total_sales_cents: data.total_sales_cents,
          total_commission_cents: data.total_commission_cents,
          role,
        },
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    console.error("rep-portal-login error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : String(e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
