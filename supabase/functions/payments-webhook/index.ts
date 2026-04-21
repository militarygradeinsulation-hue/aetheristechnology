import { createClient } from "npm:@supabase/supabase-js@2";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { type StripeEnv, verifyWebhook } from "../_shared/stripe.ts";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

// Map price IDs to tool types for auto-delivery
const AUTOMATABLE_PRICES: Record<string, string> = {
  scan_full_report_once: "website_report",
  digital_snapshot_once: "digital_snapshot",
  scan_strategy_blueprint_once: "strategy_blueprint",
  social_content_pack_once: "social_content",
  sales_script_pack_once: "sales_scripts",
  content_calendar_once: "content_calendar",
  follow_up_plan_once: "follow_up_plan",
  strategic_question_engine_once: "strategic_questions",
  brand_contradiction_finder_once: "brand_contradictions",
  friction_vocabulary_audit_once: "friction_audit",
};

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
    const email = session.customer_email || session.customer_details?.email;
    const userId = session.metadata?.userId || null;

    const { error } = await supabase.from("purchases").insert({
      email,
      stripe_session_id: session.id,
      stripe_customer_id: session.customer,
      amount_total: session.amount_total,
      currency: session.currency,
      status: session.payment_status,
      environment: env,
      metadata: session.metadata || {},
      user_id: userId,
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
          triggerFunction("generate-custom-playbook", { playbookId: pb.id });
        }
      } catch (e) {
        console.error("Playbook generation trigger error:", e);
      }
    }

    // Auto-deliver automatable purchases
    const priceId = session.metadata?.priceId;
    if (priceId && AUTOMATABLE_PRICES[priceId]) {
      const toolType = AUTOMATABLE_PRICES[priceId];
      console.log("Auto-delivering:", priceId, "->", toolType);

      const { data: deliverable, error: dErr } = await supabase
        .from("purchase_deliverables")
        .insert({
          stripe_session_id: session.id,
          email: email || "",
          user_id: userId,
          price_id: priceId,
          tool_type: toolType,
          status: "pending",
          input_data: session.metadata || {},
        })
        .select()
        .single();

      if (dErr) {
        console.error("Insert deliverable error:", dErr);
      } else if (deliverable) {
        triggerFunction("generate-purchase-delivery", { deliverableId: deliverable.id });
      }
    }

    // Handle bundle purchases (multiple deliverables)
    if (session.metadata?.bundle_items) {
      try {
        const bundleItems: string[] = JSON.parse(session.metadata.bundle_items);
        for (const itemPriceId of bundleItems) {
          const toolType = AUTOMATABLE_PRICES[itemPriceId];
          if (!toolType) continue;

          const { data: deliverable, error: dErr } = await supabase
            .from("purchase_deliverables")
            .insert({
              stripe_session_id: session.id,
              email: email || "",
              user_id: userId,
              price_id: itemPriceId,
              tool_type: toolType,
              status: "pending",
              input_data: session.metadata || {},
            })
            .select()
            .single();

          if (dErr) {
            console.error("Insert bundle deliverable error:", dErr);
          } else if (deliverable) {
            triggerFunction("generate-purchase-delivery", { deliverableId: deliverable.id });
          }
        }
      } catch (e) {
        console.error("Bundle delivery trigger error:", e);
      }
    }
  }
}

function triggerFunction(name: string, body: Record<string, unknown>) {
  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  fetch(`${SUPABASE_URL}/functions/v1/${name}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
    },
    body: JSON.stringify(body),
  }).catch(e => console.error(`Trigger ${name} error:`, e));
}

async function handleSubscriptionCreated(subscription: any, env: StripeEnv) {
  const item = subscription.items?.data?.[0];
  const priceId = item?.price?.metadata?.lovable_external_id || item?.price?.id;
  const productId = item?.price?.product;

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
  if (!invoice.subscription) return;
  console.log("Invoice paid for subscription:", invoice.subscription);

  try {
    const resp = await fetch(`${Deno.env.get("SUPABASE_URL")!}/functions/v1/monthly-delivery`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!}`,
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
