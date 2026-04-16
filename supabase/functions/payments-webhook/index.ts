import { createClient } from "npm:@supabase/supabase-js@2";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { type StripeEnv, verifyWebhook } from "../_shared/stripe.ts";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

serve(async (req) => {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  const url = new URL(req.url);
  const env = (url.searchParams.get('env') || 'sandbox') as StripeEnv;

  try {
    const event = await verifyWebhook(req, env);
    console.log("Received event:", event.type, "env:", env);

    switch (event.type) {
      case "checkout.session.completed":
        await handleCheckoutCompleted(event.data.object, env);
        break;
      case "customer.subscription.created":
        await handleSubscriptionCreated(event.data.object, env);
        break;
      case "customer.subscription.updated":
        await handleSubscriptionUpdated(event.data.object, env);
        break;
      case "customer.subscription.deleted":
        await handleSubscriptionDeleted(event.data.object, env);
        break;
      case "invoice.payment_failed":
        console.log("Payment failed:", event.data.object.id);
        break;
      case "invoice.paid":
        await handleInvoicePaid(event.data.object);
        break;
      default:
        console.log("Unhandled event:", event.type);
    }

    return new Response(JSON.stringify({ received: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("Webhook error:", e);
    return new Response("Webhook error", { status: 400 });
  }
});

async function handleCheckoutCompleted(session: any, env: StripeEnv) {
  console.log("Checkout completed:", session.id, "mode:", session.mode);
  if (session.mode === 'payment') {
    const { error } = await supabase.from("purchases").insert({
      email: session.customer_email || session.customer_details?.email,
      stripe_session_id: session.id,
      stripe_customer_id: session.customer,
      amount_total: session.amount_total,
      currency: session.currency,
      status: session.payment_status,
      environment: env,
      metadata: session.metadata || {},
    });
    if (error) console.error("Insert purchase error:", error);

    // Check if this is a scan report purchase
    if (session.metadata?.scan_type === 'report' && session.metadata?.tier) {
      const { error: spError } = await supabase.from("scan_purchases").insert({
        user_id: session.metadata.user_id,
        tier: session.metadata.tier,
        stripe_session_id: session.id,
        scan_id: null,
      });
      if (spError) console.error("Insert scan_purchases error:", spError);
    }

    // Check if this is a custom playbook purchase
    if (session.metadata?.playbook_topic) {
      try {
        const topicData = JSON.parse(session.metadata.playbook_topic_data || '{}');
        const { data: pb, error: pbError } = await supabase.from("generated_playbooks").insert({
          user_id: session.metadata.user_id,
          topic_title: session.metadata.playbook_topic,
          topic_data: topicData,
          status: "pending",
          stripe_session_id: session.id,
        }).select().single();

        if (pbError) {
          console.error("Insert generated_playbooks error:", pbError);
        } else if (pb) {
          const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
          const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
          fetch(`${SUPABASE_URL}/functions/v1/generate-custom-playbook`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
            },
            body: JSON.stringify({ playbookId: pb.id }),
          }).catch(e => console.error("Trigger generation error:", e));
        }
      } catch (e) {
        console.error("Playbook generation trigger error:", e);
      }
    }
  }
}

async function handleSubscriptionCreated(subscription: any, env: StripeEnv) {
  const item = subscription.items?.data?.[0];
  const priceId = item?.price?.metadata?.lovable_external_id || item?.price?.id;
  const productId = item?.price?.product;

  // Extract userId from metadata, fall back to email lookup
  let userId = subscription.metadata?.userId || null;
  if (!userId) {
    const email = subscription.customer_email || subscription.customer_details?.email;
    if (email) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("id")
        .eq("email", email)
        .maybeSingle();
      if (profile) userId = profile.id;
    }
  }

  await supabase.from("subscriptions").upsert(
    {
      user_id: userId,
      stripe_subscription_id: subscription.id,
      stripe_customer_id: subscription.customer,
      product_id: productId,
      price_id: priceId,
      status: subscription.status,
      current_period_start: subscription.current_period_start ? new Date(subscription.current_period_start * 1000).toISOString() : null,
      current_period_end: subscription.current_period_end ? new Date(subscription.current_period_end * 1000).toISOString() : null,
      environment: env,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "stripe_subscription_id" }
  );
}

async function handleSubscriptionUpdated(subscription: any, env: StripeEnv) {
  const item = subscription.items?.data?.[0];
  const priceId = item?.price?.metadata?.lovable_external_id || item?.price?.id;
  const productId = item?.price?.product;

  await supabase
    .from("subscriptions")
    .update({
      status: subscription.status,
      product_id: productId,
      price_id: priceId,
      current_period_start: subscription.current_period_start ? new Date(subscription.current_period_start * 1000).toISOString() : null,
      current_period_end: subscription.current_period_end ? new Date(subscription.current_period_end * 1000).toISOString() : null,
      cancel_at_period_end: subscription.cancel_at_period_end || false,
      updated_at: new Date().toISOString(),
    })
    .eq("stripe_subscription_id", subscription.id)
    .eq("environment", env);
}

async function handleSubscriptionDeleted(subscription: any, env: StripeEnv) {
  await supabase
    .from("subscriptions")
    .update({ status: "canceled", updated_at: new Date().toISOString() })
    .eq("stripe_subscription_id", subscription.id)
    .eq("environment", env);
}

async function handleInvoicePaid(invoice: any) {
  // Only trigger for subscription invoices (not one-time payments)
  if (!invoice.subscription) return;
  console.log("Invoice paid for subscription:", invoice.subscription);

  // Trigger the monthly-delivery edge function
  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  try {
    const resp = await fetch(`${SUPABASE_URL}/functions/v1/monthly-delivery`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
      },
      body: JSON.stringify({
        subscription_id: invoice.subscription,
        stripe_invoice_id: invoice.id,
      }),
    });

    if (!resp.ok) {
      const text = await resp.text();
      console.error("Monthly delivery trigger failed:", resp.status, text);
    } else {
      console.log("Monthly delivery triggered successfully");
    }
  } catch (e) {
    console.error("Monthly delivery trigger error:", e);
  }
}
