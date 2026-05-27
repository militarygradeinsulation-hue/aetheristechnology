// PIN-only admin login. Validates the PIN, returns a short HMAC-signed token
// (used by admin-data edge function), AND issues a one-time magic-link
// `token_hash` that the client exchanges for a real Supabase Auth session
// so direct PostgREST queries gated by `is_admin(auth.uid())` work.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.86.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const ADMIN_PIN = Deno.env.get("ADMIN_PIN");
const ADMIN_EMAIL = "admin@aetheris.technology";
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

const ADMIN_USER_CACHE_KEY = "admin:user_id";

async function ensureAdminUser(admin: any): Promise<string> {
  // Fast path: cached admin user_id in admin_kv. Avoids the slow
  // auth.admin.listUsers() call on every login.
  try {
    const { data: cached } = await admin
      .from("admin_kv")
      .select("value")
      .eq("key", ADMIN_USER_CACHE_KEY)
      .maybeSingle();
    const cachedId = (cached?.value as { user_id?: string } | undefined)?.user_id;
    if (cachedId) return cachedId;
  } catch { /* fall through */ }

  // Slow path (first login or cache miss): look up by email, then cache.
  const { data: list, error: listErr } = await admin.auth.admin.listUsers({ page: 1, perPage: 200 });
  if (listErr) throw listErr;
  let user = list.users.find((u: { email?: string | null }) => (u.email || "").toLowerCase() === ADMIN_EMAIL);

  if (!user) {
    const { data: created, error: createErr } = await admin.auth.admin.createUser({
      email: ADMIN_EMAIL,
      password: crypto.randomUUID() + crypto.randomUUID(),
      email_confirm: true,
    });
    if (createErr) throw createErr;
    user = created.user!;
  }

  // Ensure the user is in admin_users so is_admin() returns true.
  await (admin.from("admin_users") as any).upsert(
    { user_id: user.id },
    { onConflict: "user_id", ignoreDuplicates: true },
  );

  // Cache for future logins.
  await admin.from("admin_kv").upsert({
    key: ADMIN_USER_CACHE_KEY,
    value: { user_id: user.id },
    updated_at: new Date().toISOString(),
  });

  return user.id;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { pin } = await req.json().catch(() => ({}));
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
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

    // Accept either the master ADMIN_PIN or an active partner's portal code.
    let isPartnerPin = false;
    if (pin !== ADMIN_PIN) {
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
      isPartnerPin = true;
    }

    // Successful auth — clear the rate-limit counter for this IP.
    await admin.from("admin_kv").delete().eq("key", rlKey);

    // 1. PIN-token for admin-data edge function calls.
    const exp = Date.now() + TOKEN_TTL_MS;
    const pinToken = await signToken(exp, SUPABASE_SERVICE_ROLE_KEY);

    // 2. Magic-link token_hash for a real Supabase Auth session.
    // Race against a short timeout — Supabase auth admin endpoints
    // (listUsers + generateLink) can take 10s+ under load and were
    // making PIN login feel broken. The admin UI works without this
    // (admin-data edge function uses the pin-token), so we treat the
    // session bootstrap as best-effort.
    let tokenHash: string | null = null;
    const bootstrap = (async () => {
      await ensureAdminUser(admin);
      const { data: linkData, error: linkErr } = await admin.auth.admin.generateLink({
        type: "magiclink",
        email: ADMIN_EMAIL,
      });
      if (linkErr) throw linkErr;
      return (linkData?.properties as any)?.hashed_token || null;
    })();
    try {
      tokenHash = await Promise.race<string | null>([
        bootstrap,
        new Promise<null>((resolve) => setTimeout(() => resolve(null), 2500)),
      ]);
    } catch (sessionErr) {
      console.error("admin-pin-login session-issue error:", sessionErr);
    }
    // Don't await leftover bootstrap — let it finish in the background.
    bootstrap.catch((e) => console.error("admin-pin-login bg bootstrap error:", e));

    return new Response(
      JSON.stringify({ ok: true, token: pinToken, tokenHash, email: ADMIN_EMAIL }),
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
