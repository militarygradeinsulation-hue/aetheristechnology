// Temporary verification utility: resolves the Golden Report Intelligence
// price by lookup key in both Stripe environments and persists the resolved
// product/price ids on plan_entitlements for traceability. Internal only.
import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { createStripeClient, type StripeEnv } from "../_shared/stripe.ts";
import { GOLDEN_REPORT_INTELLIGENCE as PLAN } from "../_shared/plans.ts";

const SVC = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const sb = createClient(Deno.env.get("SUPABASE_URL")!, SVC);

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const bearer = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "").trim() || "";
  if (bearer !== SVC && req.headers.get("x-internal-key") !== SVC) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: corsHeaders });
  }

  const out: Record<string, unknown> = {};
  for (const env of ["sandbox", "live"] as StripeEnv[]) {
    try {
      const stripe = createStripeClient(env);
      const list = await stripe.prices.list({
        lookup_keys: [PLAN.stripe_lookup_key],
        active: true,
        expand: ["data.product"],
        limit: 10,
      });
      const prices = list.data.map((p) => ({
        id: p.id,
        product: typeof p.product === "string" ? p.product : (p.product as { id: string }).id,
        unit_amount: p.unit_amount,
        currency: p.currency,
        interval: p.recurring?.interval ?? null,
      }));
      out[env] = { count: prices.length, prices };
      const match = prices.find((p) => p.unit_amount === PLAN.amount_cents && p.currency === "usd" && p.interval === "month");
      if (match) {
        await sb.from("plan_entitlements").update(
          env === "sandbox"
            ? { stripe_price_id: match.id, stripe_product_id: match.product }
            : { stripe_live_price_id: match.id, stripe_live_product_id: match.product },
        ).eq("plan_id", PLAN.id);
      }
    } catch (e) {
      out[env] = { error: (e as Error).message };
    }
  }

  return new Response(JSON.stringify(out, null, 2), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
