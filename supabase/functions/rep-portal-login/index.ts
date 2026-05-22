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
      return new Response(JSON.stringify({ ok: false, error: "Invalid code format" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const sb = createClient(SUPABASE_URL, SERVICE_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // ---- Brute-force protection: per-IP rate limit via admin_kv ----------
    const ip =
      req.headers.get("cf-connecting-ip") ||
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      "unknown";
    const rlKey = `ratelimit:rep-portal-login:${ip}`;
    const WINDOW_MS = 5 * 60 * 1000;
    const MAX_FAILS = 10;
    const nowMs = Date.now();
    const { data: rlRow } = await sb
      .from("admin_kv")
      .select("value")
      .eq("key", rlKey)
      .maybeSingle();
    const rlVal = (rlRow?.value as { count?: number; first?: number } | undefined) || { count: 0, first: nowMs };
    if (nowMs - (rlVal.first || 0) > WINDOW_MS) {
      rlVal.count = 0;
      rlVal.first = nowMs;
    }
    if ((rlVal.count || 0) >= MAX_FAILS) {
      return new Response(JSON.stringify({ ok: false, error: "Too many attempts. Try again later." }), {
        status: 429,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data, error } = await sb.from("rep_codes")
      .select("code, rep_name, rep_email, commission_rate, total_sales_cents, total_commission_cents, role, is_active")
      .eq("code", code)
      .eq("is_active", true)
      .maybeSingle();

    if (error || !data) {
      await sb.from("admin_kv").upsert({
        key: rlKey,
        value: { count: (rlVal.count || 0) + 1, first: rlVal.first || nowMs },
        updated_at: new Date().toISOString(),
      });
      return new Response(JSON.stringify({ ok: false, error: "Invalid or inactive code" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Success — clear the rate-limit counter for this IP.
    await sb.from("admin_kv").delete().eq("key", rlKey);

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
