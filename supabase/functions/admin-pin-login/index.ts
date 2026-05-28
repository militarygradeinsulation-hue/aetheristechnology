// PIN-only admin login. The master admin PIN path intentionally avoids all DB
// and auth-admin calls so the login response stays near-instant on live.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.86.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const ADMIN_PIN = Deno.env.get("ADMIN_PIN");
const TOKEN_TTL_MS = 12 * 60 * 60 * 1000; // 12 hours

async function signToken(exp: number, secret: string): Promise<string> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(`${ADMIN_PIN}.${exp}`));
  const hex = Array.from(new Uint8Array(sig)).map((b) => b.toString(16).padStart(2, "0")).join("");
  return `${exp}.${hex}`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { pin } = await req.json().catch(() => ({}));
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    if (!ADMIN_PIN) {
      return new Response(JSON.stringify({ error: "Admin PIN not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fast path: the actual admin PIN must never wait on database, auth-admin,
    // rate-limit cleanup, or partner-code lookups.
    if (String(pin || "") === ADMIN_PIN) {
      const exp = Date.now() + TOKEN_TTL_MS;
      const pinToken = await signToken(exp, SUPABASE_SERVICE_ROLE_KEY);
      return new Response(
        JSON.stringify({ ok: true, token: pinToken }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // ---- Brute-force protection: per-IP rate limit via admin_kv -----------
    // Max 8 failed attempts per 15 minutes per IP. On hit, return 429.
    const ip =
      req.headers.get("cf-connecting-ip") ||
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      "unknown";
    const rlKey = `ratelimit:admin-pin-login:${ip}`;
    const WINDOW_MS = 15 * 60 * 1000;
    const MAX_FAILS = 8;
    const nowMs = Date.now();
    const { data: rlRow } = await admin
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
      return new Response(
        JSON.stringify({ error: "Too many attempts. Try again later." }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Accept an active partner's portal code as a slower fallback path.
    const { data: partner } = await admin
      .from("rep_codes")
      .select("code, role, is_active")
      .eq("code", String(pin || ""))
      .eq("role", "partner")
      .eq("is_active", true)
      .maybeSingle();
    if (!partner) {
      // Increment failure counter.
      await admin.from("admin_kv").upsert({
        key: rlKey,
        value: { count: (rlVal.count || 0) + 1, first: rlVal.first || nowMs },
        updated_at: new Date().toISOString(),
      });
      return new Response(JSON.stringify({ error: "Invalid PIN" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Successful auth — clear the rate-limit counter for this IP.
    await admin.from("admin_kv").delete().eq("key", rlKey);

    // 1. PIN-token for admin-data edge function calls.
    const exp = Date.now() + TOKEN_TTL_MS;
    const pinToken = await signToken(exp, SUPABASE_SERVICE_ROLE_KEY);

    return new Response(
      JSON.stringify({ ok: true, token: pinToken }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    console.error("admin-pin-login error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : String(e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
