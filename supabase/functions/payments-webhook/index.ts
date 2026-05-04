import { createClient } from "https://esm.sh/@supabase/supabase-js@2.86.0";
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

// Tiered commission split (replaces flat 70/15/15).
// Tier resolved from sale amount (cents):
//   T1 ≤ $59  → company 50 / rep 30 / partner 20
//   T2 ≤ $349 → company 60 / rep 25 / partner 15
//   T3  >$349 → company 70 / rep 20 / partner 10
function ratesForAmount(amountCents: number): { company: number; rep: number; partner: number; tier: 1 | 2 | 3 } {
  if (amountCents <= 5900) return { company: 0.50, rep: 0.30, partner: 0.20, tier: 1 };
  if (amountCents <= 34900) return { company: 0.60, rep: 0.25, partner: 0.15, tier: 2 };
  return { company: 0.70, rep: 0.20, partner: 0.10, tier: 3 };
}

serve(async (req) => {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  const url = new URL(req.url);
  const env = (url.searchParams.get("env") || "sandbox") as StripeEnv;

  let event: any;
  try {
    event = await verifyWebhook(req, env);
  } catch (e) {
    console.error("verify error:", e);
    return new Response("Webhook error", { status: 400 });
  }

  // Idempotency
  const { data: already } = await supabase
    .from("processed_webhook_events")
    .select("stripe_event_id")
    .eq("stripe_event_id", event.id)
    .maybeSingle();
  if (already) {
    return new Response(JSON.stringify({ received: true, duplicate: true }), {
      status: 200, headers: { "Content-Type": "application/json" },
    });
  }

  try {
    console.log("event:", event.type, "env:", env);
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
      case "invoice.paid":
        await handleInvoicePaid(event.data.object, env);
        break;
      case "invoice.payment_failed":
        await logActivity({
          event_type: "invoice.payment_failed",
          entity_type: "invoice",
          entity_id: event.data.object.id,
          summary: `Payment failed: ${event.data.object.id}`,
          metadata: { invoice: event.data.object.id, amount: event.data.object.amount_due, env },
        });
        break;
      case "charge.refunded":
        await handleChargeRefunded(event.data.object, env);
        break;
      default:
        console.log("Unhandled event:", event.type);
    }

    await supabase.from("processed_webhook_events").insert({
      stripe_event_id: event.id, event_type: event.type, environment: env,
    });
  } catch (e) {
    console.error("handler error:", e);
    return new Response("Webhook error", { status: 500 });
  }

  return new Response(JSON.stringify({ received: true }), {
    status: 200, headers: { "Content-Type": "application/json" },
  });
});

async function logActivity(row: {
  event_type: string;
  entity_type?: string;
  entity_id?: string;
  customer_id?: string | null;
  rep_code?: string | null;
  actor?: string;
  summary?: string;
  metadata?: Record<string, unknown>;
}) {
  const { error } = await supabase.from("activity_log").insert({
    event_type: row.event_type,
    entity_type: row.entity_type ?? null,
    entity_id: row.entity_id ?? null,
    customer_id: row.customer_id ?? null,
    rep_code: row.rep_code ?? null,
    actor: row.actor ?? "stripe",
    summary: row.summary ?? null,
    metadata: row.metadata ?? {},
  });
  if (error) console.error("activity_log insert error:", error);
}

async function findActivePartnerCode(): Promise<string | null> {
  const { data } = await supabase
    .from("rep_codes").select("code").eq("role", "partner").eq("is_active", true).maybeSingle();
  return data?.code ?? null;
}

async function recordSaleAndCommissions(args: {
  amount_cents: number; currency: string;
  email?: string | null; name?: string | null; phone?: string | null;
  stripe_customer_id?: string | null;
  product_id?: string | null; price_id?: string | null; product_name?: string | null;
  kind: string; status: string;
  stripe_session_id?: string | null;
  stripe_invoice_id?: string | null;
  stripe_subscription_id?: string | null;
  stripe_charge_id?: string | null;
  rep_code?: string | null;
  metadata?: Record<string, unknown>;
  env: StripeEnv;
}) {
  // Upsert customer
  let customerId: string | null = null;
  if (args.email) {
    const { data, error } = await supabase.rpc("upsert_customer_with_sale" as any, {
      _email: args.email,
      _name: args.name ?? null,
      _phone: args.phone ?? null,
      _stripe_customer_id: args.stripe_customer_id ?? null,
      _source: "stripe",
      _rep_code: args.rep_code ?? null,
      _partner_code: null,
      _amount_cents: args.amount_cents,
    });
    if (error) console.error("customer upsert error:", error);
    else customerId = (data as any) ?? null;
  }

  // Insert sale (idempotent on session/invoice unique indexes)
  const { data: sale, error: saleErr } = await supabase
    .from("sales")
    .insert({
      customer_id: customerId,
      email: args.email ?? null,
      amount_cents: args.amount_cents,
      currency: args.currency,
      product_id: args.product_id ?? null,
      price_id: args.price_id ?? null,
      product_name: args.product_name ?? null,
      kind: args.kind,
      stripe_session_id: args.stripe_session_id ?? null,
      stripe_invoice_id: args.stripe_invoice_id ?? null,
      stripe_subscription_id: args.stripe_subscription_id ?? null,
      stripe_charge_id: args.stripe_charge_id ?? null,
      rep_code: args.rep_code ?? null,
      status: args.status,
      environment: args.env,
      metadata: args.metadata ?? {},
    })
    .select()
    .single();

  if (saleErr) {
    // Likely duplicate — that's fine for retries
    console.warn("sale insert skipped (probably duplicate):", saleErr.message);
    return;
  }

  // Commission split — company always 70%; rep 15% if rep_code; partner 15% if partner exists and != rep
  const amount = args.amount_cents;
  const commissionRows: any[] = [];

  // Company
  commissionRows.push({
    sale_id: sale.id, recipient_role: "company", recipient_code: null,
    amount_cents: Math.floor(amount * COMPANY_RATE), rate: COMPANY_RATE,
    status: "pending", environment: args.env,
  });

  let repRate = 0;
  if (args.rep_code) {
    const { data: rep } = await supabase
      .from("rep_codes")
      .select("commission_rate, role").eq("code", args.rep_code).eq("is_active", true).maybeSingle();
    repRate = rep ? Number(rep.commission_rate) : 0.15;
    commissionRows.push({
      sale_id: sale.id, recipient_role: "rep", recipient_code: args.rep_code,
      amount_cents: Math.floor(amount * repRate), rate: repRate,
      status: "pending", environment: args.env,
    });

    // Bump rep_codes totals
    await supabase.rpc("increment_rep_sales" as any, {
      _code: args.rep_code,
      _sales: amount,
      _commission: Math.floor(amount * repRate),
    });

    // Partner override (skip if rep IS the partner)
    if (rep?.role !== "partner") {
      const partnerCode = await findActivePartnerCode();
      if (partnerCode) {
        const partnerAmt = Math.floor(amount * PARTNER_RATE);
        commissionRows.push({
          sale_id: sale.id, recipient_role: "partner", recipient_code: partnerCode,
          amount_cents: partnerAmt, rate: PARTNER_RATE,
          status: "pending", environment: args.env,
        });
        await supabase.rpc("increment_rep_sales" as any, {
          _code: partnerCode, _sales: 0, _commission: partnerAmt,
        });
      }
    }
  } else {
    // No rep — 30% sits with company unsplit (or treat as partner if a partner exists)
    const partnerCode = await findActivePartnerCode();
    if (partnerCode) {
      const partnerAmt = Math.floor(amount * PARTNER_RATE);
      commissionRows.push({
        sale_id: sale.id, recipient_role: "partner", recipient_code: partnerCode,
        amount_cents: partnerAmt, rate: PARTNER_RATE,
        status: "pending", environment: args.env,
      });
      await supabase.rpc("increment_rep_sales" as any, {
        _code: partnerCode, _sales: 0, _commission: partnerAmt,
      });
    }
  }

  await supabase.from("commissions").insert(commissionRows);

  await logActivity({
    event_type: "sale." + args.kind,
    entity_type: "sale",
    entity_id: sale.id,
    customer_id: customerId,
    rep_code: args.rep_code ?? null,
    summary: `${args.kind} ${(amount / 100).toFixed(2)} ${args.currency.toUpperCase()} (${args.price_id ?? "?"})`,
    metadata: { env: args.env, ...(args.metadata ?? {}) },
  });
}

async function handleCheckoutCompleted(session: any, env: StripeEnv) {
  console.log("checkout.session.completed:", session.id);
  const email = session.customer_email || session.customer_details?.email || null;
  const name = session.customer_details?.name || null;
  const phone = session.customer_details?.phone || null;
  const repCode = session.metadata?.rep_code || null;
  const userId = session.metadata?.userId || null;

  // Legacy purchases table (keep for back-compat)
  if (session.mode === "payment") {
    await supabase.from("purchases").insert({
      email, stripe_session_id: session.id, stripe_customer_id: session.customer,
      amount_total: session.amount_total, currency: session.currency,
      status: session.payment_status, environment: env,
      metadata: session.metadata || {}, user_id: userId, rep_code: repCode,
    });

    // Record CRM sale
    await recordSaleAndCommissions({
      amount_cents: session.amount_total ?? 0,
      currency: session.currency ?? "usd",
      email, name, phone,
      stripe_customer_id: session.customer,
      price_id: session.metadata?.priceId || null,
      product_name: session.metadata?.product_name || null,
      kind: "one_time",
      status: session.payment_status || "paid",
      stripe_session_id: session.id,
      rep_code: repCode,
      metadata: session.metadata || {},
      env,
    });

    // Auto-deliveries (existing logic)
    if (session.metadata?.scan_type === "report" && session.metadata?.tier) {
      await supabase.from("scan_purchases").insert({
        user_id: session.metadata.user_id, tier: session.metadata.tier,
        stripe_session_id: session.id, scan_id: null,
      });
    }

    if (session.metadata?.playbook_topic) {
      try {
        const topicData = JSON.parse(session.metadata.playbook_topic_data || "{}");
        const { data: pb } = await supabase.from("generated_playbooks").insert({
          user_id: session.metadata.user_id,
          topic_title: session.metadata.playbook_topic,
          topic_data: topicData, status: "pending",
          stripe_session_id: session.id,
        }).select().single();
        if (pb) triggerFunction("generate-custom-playbook", { playbookId: pb.id });
      } catch (e) { console.error("playbook trigger:", e); }
    }

    const priceId = session.metadata?.priceId;
    if (priceId && AUTOMATABLE_PRICES[priceId]) {
      const { data: deliverable } = await supabase.from("purchase_deliverables").insert({
        stripe_session_id: session.id, email: email || "",
        user_id: userId, price_id: priceId,
        tool_type: AUTOMATABLE_PRICES[priceId], status: "pending",
        input_data: session.metadata || {},
      }).select().single();
      if (deliverable) triggerFunction("generate-purchase-delivery", { deliverableId: deliverable.id });
    }

    if (session.metadata?.bundle_items) {
      try {
        const items: string[] = JSON.parse(session.metadata.bundle_items);
        for (const itemPriceId of items) {
          const toolType = AUTOMATABLE_PRICES[itemPriceId];
          if (!toolType) continue;
          const { data: d } = await supabase.from("purchase_deliverables").insert({
            stripe_session_id: session.id, email: email || "", user_id: userId,
            price_id: itemPriceId, tool_type: toolType, status: "pending",
            input_data: session.metadata || {},
          }).select().single();
          if (d) triggerFunction("generate-purchase-delivery", { deliverableId: d.id });
        }
      } catch (e) { console.error("bundle:", e); }
    }
  }
}

function triggerFunction(name: string, body: Record<string, unknown>) {
  const URL_ = Deno.env.get("SUPABASE_URL")!;
  const KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  fetch(`${URL_}/functions/v1/${name}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "Authorization": `Bearer ${KEY}` },
    body: JSON.stringify(body),
  }).catch(e => console.error(`trigger ${name}:`, e));
}

async function handleSubscriptionCreated(subscription: any, env: StripeEnv) {
  const item = subscription.items?.data?.[0];
  const priceId = item?.price?.metadata?.lovable_external_id || item?.price?.id;
  const productId = item?.price?.product;

  let userId = subscription.metadata?.userId || null;
  const email = subscription.customer_email || subscription.customer_details?.email || null;
  if (!userId && email) {
    const { data: profile } = await supabase.from("profiles").select("id").eq("email", email).maybeSingle();
    if (profile) userId = profile.id;
  }

  await supabase.from("subscriptions").upsert({
    user_id: userId,
    stripe_subscription_id: subscription.id,
    stripe_customer_id: subscription.customer,
    product_id: productId, price_id: priceId,
    status: subscription.status,
    current_period_start: subscription.current_period_start ? new Date(subscription.current_period_start * 1000).toISOString() : null,
    current_period_end: subscription.current_period_end ? new Date(subscription.current_period_end * 1000).toISOString() : null,
    environment: env, updated_at: new Date().toISOString(),
  }, { onConflict: "stripe_subscription_id" });

  await logActivity({
    event_type: "subscription.created", entity_type: "subscription",
    entity_id: subscription.id,
    rep_code: subscription.metadata?.rep_code || null,
    summary: `Subscription created (${priceId})`,
    metadata: { env, status: subscription.status, email },
  });
}

async function handleSubscriptionUpdated(subscription: any, env: StripeEnv) {
  const item = subscription.items?.data?.[0];
  const priceId = item?.price?.metadata?.lovable_external_id || item?.price?.id;
  const productId = item?.price?.product;
  await supabase.from("subscriptions").update({
    status: subscription.status, product_id: productId, price_id: priceId,
    current_period_start: subscription.current_period_start ? new Date(subscription.current_period_start * 1000).toISOString() : null,
    current_period_end: subscription.current_period_end ? new Date(subscription.current_period_end * 1000).toISOString() : null,
    cancel_at_period_end: subscription.cancel_at_period_end || false,
    updated_at: new Date().toISOString(),
  }).eq("stripe_subscription_id", subscription.id).eq("environment", env);

  await logActivity({
    event_type: "subscription.updated", entity_type: "subscription", entity_id: subscription.id,
    summary: `Subscription updated → ${subscription.status}`, metadata: { env },
  });
}

async function handleSubscriptionDeleted(subscription: any, env: StripeEnv) {
  await supabase.from("subscriptions").update({
    status: "canceled", updated_at: new Date().toISOString(),
  }).eq("stripe_subscription_id", subscription.id).eq("environment", env);
  await logActivity({
    event_type: "subscription.canceled", entity_type: "subscription", entity_id: subscription.id,
    summary: `Subscription canceled`, metadata: { env },
  });
}

async function handleInvoicePaid(invoice: any, env: StripeEnv) {
  const email = invoice.customer_email || null;
  const subId = invoice.subscription || null;

  // Look up rep_code via subscription metadata if possible
  let repCode: string | null = null;
  if (subId) {
    const { data: sub } = await supabase.from("subscriptions")
      .select("user_id, price_id").eq("stripe_subscription_id", subId).maybeSingle();
    if (sub?.user_id) {
      // No rep on subscriptions table yet — fall back to metadata
    }
  }
  repCode = invoice.subscription_details?.metadata?.rep_code
         || invoice.metadata?.rep_code
         || null;

  const line = invoice.lines?.data?.[0];
  const priceId = line?.price?.metadata?.lovable_external_id || line?.price?.id || null;

  await recordSaleAndCommissions({
    amount_cents: invoice.amount_paid ?? 0,
    currency: invoice.currency ?? "usd",
    email,
    stripe_customer_id: invoice.customer,
    price_id: priceId,
    kind: subId ? "renewal" : "one_time",
    status: "paid",
    stripe_invoice_id: invoice.id,
    stripe_subscription_id: subId,
    rep_code: repCode,
    metadata: { billing_reason: invoice.billing_reason },
    env,
  });

  // Existing monthly delivery trigger
  if (subId) {
    triggerFunction("monthly-delivery", { subscription_id: subId, stripe_invoice_id: invoice.id });
  }
}

async function handleChargeRefunded(charge: any, env: StripeEnv) {
  const refunded = charge.amount_refunded ?? 0;
  await supabase.from("sales").insert({
    email: charge.billing_details?.email ?? null,
    amount_cents: -refunded,
    currency: charge.currency ?? "usd",
    kind: "refund", status: "refunded",
    stripe_charge_id: charge.id,
    environment: env,
    metadata: { original_charge: charge.id },
  });
  await logActivity({
    event_type: "charge.refunded", entity_type: "charge", entity_id: charge.id,
    summary: `Refund ${(refunded/100).toFixed(2)} ${(charge.currency ?? "usd").toUpperCase()}`,
    metadata: { env },
  });
}
