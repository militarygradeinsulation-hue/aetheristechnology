import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";
import { type StripeEnv, createStripeClient } from "../_shared/stripe.ts";
import { integrationIdentifier, planByLookupKey } from "../_shared/plans.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { priceId, quantity, customerEmail, returnUrl, environment, metadata } = await req.json();
    if (!priceId || typeof priceId !== 'string' || !/^[a-zA-Z0-9_-]+$/.test(priceId)) {
      return new Response(JSON.stringify({ error: "Invalid priceId" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const env = (environment || 'sandbox') as StripeEnv;
    const stripe = createStripeClient(env);

    const prices = await stripe.prices.list({ lookup_keys: [priceId] });
    if (!prices.data.length) {
      return new Response(JSON.stringify({ error: "Price not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const stripePrice = prices.data[0];
    const isRecurring = stripePrice.type === "recurring";
    const plan = planByLookupKey(stripePrice.lookup_key || priceId);

    // Signed-in owner is derived from the bearer token, never from the body.
    let userId: string | null = null;
    let userEmail: string | null = null;
    const bearer = req.headers.get("Authorization")?.replace(/^Bearer\s+/i, "").trim();
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY") || "";
    if (bearer && bearer !== anonKey) {
      try {
        const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
        const { data } = await sb.auth.getUser(bearer);
        if (data?.user) { userId = data.user.id; userEmail = data.user.email ?? null; }
      } catch { /* anonymous checkout is allowed */ }
    }

    const sessionParams: any = {
      line_items: [{ price: stripePrice.id, quantity: quantity || 1 }],
      mode: isRecurring ? "subscription" : "payment",
      ui_mode: "embedded",
      return_url: returnUrl || `${req.headers.get("origin")}/checkout/return?session_id={CHECKOUT_SESSION_ID}`,
      ...(customerEmail || userEmail ? { customer_email: customerEmail || userEmail } : {}),
      // Stable prefix plus 8 random lowercase letters, per Stripe's format.
      integration_identifier: integrationIdentifier("aetheris"),
    };

    // Pass metadata if provided (e.g., for custom playbook purchases, rep codes)
    const meta: Record<string, string> = {};
    if (metadata && typeof metadata === 'object') {
      // Sanitize rep_code
      if (metadata.rep_code && (typeof metadata.rep_code !== 'string' || !/^\d{6}$/.test(metadata.rep_code))) {
        delete metadata.rep_code;
      }
      Object.assign(meta, metadata);
    }
    meta.priceId = priceId;
    if (plan) meta.plan_id = plan.id;
    if (userId) meta.userId = userId;

    sessionParams.metadata = meta;
    if (isRecurring) {
      sessionParams.subscription_data = { metadata: meta };
    }


    const session = await stripe.checkout.sessions.create(sessionParams);

    return new Response(JSON.stringify({ clientSecret: session.client_secret }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
