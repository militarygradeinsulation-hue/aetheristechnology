// Stripe Billing Portal — self serve plan and payment management.
// The portal URL is short lived, so a new session is minted on every request.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";
import { type StripeEnv, createStripeClient } from "../_shared/stripe.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};
const json = (b: unknown, status = 200) =>
  new Response(JSON.stringify(b), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  try {
    // Ownership comes from the bearer token, never from the request body.
    const token = req.headers.get("Authorization")?.replace(/^Bearer\s+/i, "").trim();
    if (!token) return json({ error: "Unauthorized" }, 401);
    const { data: auth, error: authErr } = await supabase.auth.getUser(token);
    if (authErr || !auth?.user) return json({ error: "Unauthorized" }, 401);

    const body = await req.json().catch(() => ({}));
    const environment = (body.environment === "live" ? "live" : "sandbox") as StripeEnv;
    const returnUrl = typeof body.returnUrl === "string" ? body.returnUrl : undefined;

    const { data: sub } = await supabase
      .from("subscriptions")
      .select("stripe_customer_id")
      .eq("user_id", auth.user.id)
      .eq("environment", environment)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    const customerId = (sub as { stripe_customer_id?: string } | null)?.stripe_customer_id;
    if (!customerId) return json({ error: "No subscription found for this account." }, 404);

    const stripe = createStripeClient(environment);
    const portal = await stripe.billingPortal.sessions.create({
      customer: customerId,
      ...(returnUrl && { return_url: returnUrl }),
    });

    return json({ url: portal.url });
  } catch (e) {
    console.error("portal session error:", (e as Error).message);
    return json({ error: "Could not open the billing portal. Try again shortly." }, 500);
  }
});
