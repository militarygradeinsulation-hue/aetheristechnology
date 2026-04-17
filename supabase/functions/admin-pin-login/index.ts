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

    // Find or create the PIN admin user via direct DB lookup (fast).
    let userId: string | null = null;
    const { data: profileRow } = await admin
      .from("profiles")
      .select("id")
      .eq("email", PIN_ADMIN_EMAIL)
      .maybeSingle();

    if (profileRow?.id) {
      userId = profileRow.id;
    } else {
      const { data: created, error: createErr } = await admin.auth.admin.createUser({
        email: PIN_ADMIN_EMAIL,
        password: PIN_ADMIN_PASSWORD,
        email_confirm: true,
      });
      if (createErr) {
        // Likely already exists — fall back to a paginated lookup once.
        const { data: list } = await admin.auth.admin.listUsers({ page: 1, perPage: 200 });
        const existing = list?.users?.find((u) => u.email === PIN_ADMIN_EMAIL);
        if (!existing) throw createErr;
        userId = existing.id;
      } else {
        userId = created.user!.id;
      }
    }

    // Ensure admin row exists (idempotent upsert avoids extra RPC round-trip).
    await admin.from("admin_users").upsert({ user_id: userId }, { onConflict: "user_id" });

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
