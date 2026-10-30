import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";
import { type StripeEnv, createStripeClient } from "../_shared/stripe.ts";
import { integrationIdentifier, planByLookupKey } from "../_shared/plans.ts";
import { businessXrayOfferForKey, BUSINESS_XRAY_RETURN_URL } from "../_shared/business-xray-offers.ts";
import { normalizePublicCompanyUrl } from "../_shared/company-audit-offers.ts";

const AUTOMATED_WEBSITE_PRICES: Record<string,number> = {
  scan_full_report_once: 5900,
  digital_snapshot_once: 14900,
  scan_strategy_blueprint_once: 34900,
};
const AUTOMATED_RETURN_URL = "https://aetheris.technology/checkout/return?type=deliverable&session_id={CHECKOUT_SESSION_ID}";

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

    const env = (environment === "live" ? "live" : "sandbox") as StripeEnv;
    const xray = businessXrayOfferForKey(priceId);
    const websiteReport = Object.prototype.hasOwnProperty.call(AUTOMATED_WEBSITE_PRICES, priceId);
    let safeWebsiteUrl: string | null = null;
    if (websiteReport) {
      try { safeWebsiteUrl = normalizePublicCompanyUrl(metadata?.website_url).url; }
      catch { return new Response(JSON.stringify({error:"Enter a valid public business website before checkout"}), {status:400,headers:{...corsHeaders,"Content-Type":"application/json"}}); }
    }
    if (priceId.startsWith("business_xray_") && !xray) throw new Error("Unknown Business X-Ray offer");
    const stripe = createStripeClient(env);

    const prices = await stripe.prices.list({ lookup_keys: [priceId] });
    if (!prices.data.length) {
      return new Response(JSON.stringify({ error: "Price not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const stripePrice = prices.data[0];
    if (xray && (stripePrice.active !== true || stripePrice.type !== "one_time" || stripePrice.unit_amount !== xray.amountCents || stripePrice.currency !== xray.currency)) {
      return new Response(JSON.stringify({ error: "Business X-Ray price is not configured at the expected amount" }), {status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" }});
    }
    if (websiteReport && (stripePrice.active !== true || stripePrice.type !== "one_time" || stripePrice.unit_amount !== AUTOMATED_WEBSITE_PRICES[priceId] || stripePrice.currency !== "usd")) {
      return new Response(JSON.stringify({error:"The website report price is not configured at the published amount"}), {status:409,headers:{...corsHeaders,"Content-Type":"application/json"}});
    }
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
      line_items: [{ price: stripePrice.id, quantity: (xray || websiteReport) ? 1 : quantity || 1 }],
      mode: isRecurring ? "subscription" : "payment",
      ui_mode: "embedded",
      return_url: xray ? BUSINESS_XRAY_RETURN_URL : websiteReport ? AUTOMATED_RETURN_URL : returnUrl || `${req.headers.get("origin")}/checkout/return?session_id={CHECKOUT_SESSION_ID}`,
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
    if (websiteReport && safeWebsiteUrl) {
      // Public company URL is the only automatic scan target; discard untrusted extra metadata.
      for (const k of Object.keys(meta)) if (k !== "priceId") delete meta[k];
      meta.website_url = safeWebsiteUrl;
      meta.business_name = typeof metadata?.business_name === "string" ? metadata.business_name.trim().slice(0,120) : "";
      meta.source = "selfserve_website_report";
    }
    if (xray) {
      // Override any untrusted product metadata supplied by the client.
      for (const k of Object.keys(meta)) if (!["priceId", "userId"].includes(k)) delete meta[k];
      meta.purpose = "business_xray_manual_service";
      meta.xray_tier = xray.tier;
      meta.product_name = xray.label;
    }
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
