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

const ADMIN_PIN = "9822";
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

async function ensureAdminUser(admin: ReturnType<typeof createClient>): Promise<string> {
  // Try to find the existing admin user by email.
  const { data: list, error: listErr } = await admin.auth.admin.listUsers({ page: 1, perPage: 200 });
  if (listErr) throw listErr;
  let user = list.users.find((u) => (u.email || "").toLowerCase() === ADMIN_EMAIL);

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
  await admin.from("admin_users").upsert(
    { user_id: user.id },
    { onConflict: "user_id", ignoreDuplicates: true },
  );

  return user.id;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { pin } = await req.json().catch(() => ({}));
    if (pin !== ADMIN_PIN) {
      return new Response(JSON.stringify({ error: "Invalid PIN" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // 1. PIN-token for admin-data edge function calls.
    const exp = Date.now() + TOKEN_TTL_MS;
    const pinToken = await signToken(exp, SUPABASE_SERVICE_ROLE_KEY);

    // 2. Magic-link token_hash for a real Supabase Auth session.
    let tokenHash: string | null = null;
    try {
      await ensureAdminUser(admin);
      const { data: linkData, error: linkErr } = await admin.auth.admin.generateLink({
        type: "magiclink",
        email: ADMIN_EMAIL,
      });
      if (linkErr) throw linkErr;
      // Supabase returns `properties.hashed_token` for magic links.
      tokenHash = (linkData?.properties as any)?.hashed_token || null;
    } catch (sessionErr) {
      // Log but do not block PIN login — the dashboard can still call admin-data.
      console.error("admin-pin-login session-issue error:", sessionErr);
    }

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
