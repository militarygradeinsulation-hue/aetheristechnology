// PIN-based admin login. Verifies PIN server-side, ensures a fixed admin user exists,
// promotes them to admin, and returns a usable session for the client.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const ADMIN_PIN = "9822";
const PIN_ADMIN_EMAIL = "pin-admin@aetheris.local";
// Deterministic strong password for the PIN-bound admin account.
const PIN_ADMIN_PASSWORD = "Aetheris-PinAdmin-9822-Secure!";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const { pin } = await req.json().catch(() => ({}));
    if (pin !== ADMIN_PIN) {
      return new Response(JSON.stringify({ error: "Invalid PIN" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Find or create the PIN admin user.
    let userId: string | null = null;
    const { data: list } = await admin.auth.admin.listUsers();
    const existing = list?.users?.find((u) => u.email === PIN_ADMIN_EMAIL);
    if (existing) {
      userId = existing.id;
    } else {
      const { data: created, error: createErr } = await admin.auth.admin.createUser({
        email: PIN_ADMIN_EMAIL,
        password: PIN_ADMIN_PASSWORD,
        email_confirm: true,
      });
      if (createErr) throw createErr;
      userId = created.user!.id;
    }

    // Ensure they are in admin_users.
    const { data: isAdmin } = await admin.rpc("is_admin", { _user_id: userId });
    if (isAdmin !== true) {
      await admin.from("admin_users").insert({ user_id: userId });
    }

    return new Response(
      JSON.stringify({ ok: true, email: PIN_ADMIN_EMAIL, password: PIN_ADMIN_PASSWORD }),
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
