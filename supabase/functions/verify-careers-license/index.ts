// Verifies a Stripe Checkout Session for the $500 Aetheris Instant Rep License.
// On success: generates a unique rep_code, inserts into public.rep_codes, and
// returns { paid, code, email } so the client can show the credential.
import { type StripeEnv, createStripeClient } from "../_shared/stripe.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), {
    status: s,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

function randomCode(): string {
  // 6-digit numeric code, matches existing rep_codes convention (4-12 digits).
  const n = Math.floor(100000 + Math.random() * 900000);
  return String(n);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  try {
    const { session_id, environment, name } = await req.json();
    if (!session_id || typeof session_id !== "string" || !/^cs_[a-zA-Z0-9_]+$/.test(session_id)) {
      return json({ error: "Invalid session_id" }, 400);
    }
    const env = (environment === "live" ? "live" : "sandbox") as StripeEnv;
    const stripe = createStripeClient(env);
    const session = await stripe.checkout.sessions.retrieve(session_id);

    const paid = session.payment_status === "paid";
    const purpose = session.metadata?.purpose;
    if (!paid || purpose !== "careers_instant_license") {
      return json({ paid: false, error: "Payment not confirmed" }, 400);
    }

    const email =
      session.customer_details?.email || session.customer_email || null;

    const sb = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const idKey = `stripe:${session_id}`;

    // Idempotency: if we already provisioned a code for this session, return it.
    const { data: existing } = await sb
      .from("rep_codes")
      .select("code, rep_name, rep_email")
      .eq("certification_id", idKey)
      .maybeSingle();

    if (existing?.code) {
      return json({
        paid: true,
        code: existing.code,
        email: existing.rep_email || email,
        already: true,
      });
    }

    // Generate a unique code (retry a few times on collision).
    let code = "";
    for (let i = 0; i < 8; i++) {
      const candidate = randomCode();
      const { data: hit } = await sb
        .from("rep_codes")
        .select("code")
        .eq("code", candidate)
        .maybeSingle();
      if (!hit) { code = candidate; break; }
    }
    if (!code) return json({ error: "Could not allocate a unique code" }, 500);

    const repName =
      (typeof name === "string" && name.trim()) ||
      session.customer_details?.name ||
      (email ? email.split("@")[0] : "Instant Licensed Rep");

    const { error: insErr } = await sb.from("rep_codes").insert({
      code,
      rep_name: repName,
      rep_email: email,
      commission_rate: 0.15,
      role: "rep",
      is_active: true,
      team_name: "Team 3 — Instant License",
      certification_id: idKey,
      certification_issued_at: new Date().toISOString().slice(0, 10),
    });
    if (insErr) return json({ error: insErr.message }, 500);

    return json({ paid: true, code, email, name: repName });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unknown error";
    return json({ error: message }, 500);
  }
});
