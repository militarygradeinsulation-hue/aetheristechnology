import { createClient } from "https://esm.sh/@supabase/supabase-js@2.86.0";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { type StripeEnv, verifyWebhook } from "../_shared/stripe.ts";
import { planById, planByLookupKey } from "../_shared/plans.ts";

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

// 13 Forensics systems — intake-driven AI deliverables
import { SYSTEM_SPECS } from "../_shared/system-prompts.ts";
const SYSTEM_PRICE_IDS = new Set(Object.keys(SYSTEM_SPECS));
const SYSTEM_TITLES: Record<string, string> = Object.fromEntries(
  Object.entries(SYSTEM_SPECS).map(([k, v]) => [k, v.title]),
);
const PUBLIC_SITE_URL = Deno.env.get("PUBLIC_SITE_URL") || "https://aetheris.technology";

// Tiered commission split (catalog tools + the 3 operator-led bundles).
//   T1 ≤ $59  → company 50 / rep 30 / partner 20
//   T2 ≤ $349 → company 60 / rep 25 / partner 15
//   T3  >$349 → company 70 / rep 20 / partner 10
function ratesForAmount(amountCents: number): { company: number; rep: number; partner: number; tier: 1 | 2 | 3 } {
  if (amountCents <= 5900) return { company: 0.50, rep: 0.30, partner: 0.20, tier: 1 };
  if (amountCents <= 34900) return { company: 0.60, rep: 0.25, partner: 0.15, tier: 2 };
  return { company: 0.70, rep: 0.20, partner: 0.10, tier: 3 };
}

// FLAGSHIP FIXED-DOLLAR SPLITS — sales-led offers only (Diagnostic + Active Case).
// Matches FLAGSHIP_SPLITS in src/lib/repProducts.ts and the rep portal UI.
// Mapped by Stripe price lookup_key (or lovable_external_id) passed in metadata.priceId.
//
// Diagnostic $23,500 one-time → Co $15,500 · Rep $5,000 · Partner $3,000
// Active Case   $20,000/mo       → Co $13,000 · Rep $4,000 · Partner $3,000  (every month)
const FLAGSHIP_FIXED_SPLITS: Record<string, { company: number; rep: number; partner: number; label: string }> = {
  diagnostic_21day_once:   { company: 1_550_000, rep: 500_000, partner: 300_000, label: '21-Day Diagnostic' },
  implementation_retainer: { company: 1_300_000, rep: 400_000, partner: 300_000, label: 'Active Case'   },
};

function flagshipFixedSplit(priceId: string | null | undefined) {
  if (!priceId) return null;
  return FLAGSHIP_FIXED_SPLITS[priceId] ?? null;
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

  // ---------------------------------------------------------------------
  // ATOMIC IDEMPOTENCY CLAIM
  // Insert first. The unique index on stripe_event_id means two concurrent
  // deliveries of the same event can never both win the claim, so a handler
  // runs exactly once. If the handler then fails we release the claim and
  // return 500 so Stripe retries.
  // ---------------------------------------------------------------------
  const { error: claimErr } = await supabase.from("processed_webhook_events").insert({
    stripe_event_id: event.id,
    event_type: event.type,
    environment: env,
    status: "running",
    claimed_at: new Date().toISOString(),
  });

  if (claimErr) {
    // 23505 = unique_violation → another delivery already claimed this event.
    if ((claimErr as any).code === "23505") {
      return new Response(JSON.stringify({ received: true, duplicate: true }), {
        status: 200, headers: { "Content-Type": "application/json" },
      });
    }
    console.error("claim error:", claimErr.message);
    return new Response("Webhook error", { status: 500 });
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
        await handleInvoicePaymentFailed(event.data.object, env);
        break;
      case "charge.refunded":
        await handleChargeRefunded(event.data.object, env);
        break;
      default:
        console.log("Unhandled event:", event.type);
    }

    await supabase
      .from("processed_webhook_events")
      .update({ status: "completed" })
      .eq("stripe_event_id", event.id);
  } catch (e) {
    // Never leave a failed handler marked complete. Release the claim so the
    // Stripe retry can execute it. Log the message only — never the payload.
    const msg = e instanceof Error ? e.message : "unknown handler error";
    console.error("handler error:", msg);
    await supabase.from("processed_webhook_events").delete().eq("stripe_event_id", event.id);
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

  // Commission split — flagship fixed-dollar overrides tiered percentages.
  const amount = args.amount_cents;
  const fixed = flagshipFixedSplit(args.price_id);
  const tierRates = ratesForAmount(amount);
  const commissionRows: any[] = [];

  // Resolve final company/rep/partner amounts + a rate value to store.
  const companyAmt = fixed ? fixed.company : Math.floor(amount * tierRates.company);
  const repAmt     = fixed ? fixed.rep     : Math.floor(amount * tierRates.rep);
  const partnerAmt = fixed ? fixed.partner : Math.floor(amount * tierRates.partner);
  const companyRate = fixed ? (fixed.company / amount) : tierRates.company;
  const repRate     = fixed ? (fixed.rep     / amount) : tierRates.rep;
  const partnerRate = fixed ? (fixed.partner / amount) : tierRates.partner;
  const splitMeta = fixed
    ? { split_model: 'flagship_fixed', flagship: fixed.label, tier: null }
    : { split_model: 'tiered', tier: tierRates.tier };

  // Company always gets a row.
  commissionRows.push({
    sale_id: sale.id, recipient_role: "company", recipient_code: null,
    amount_cents: companyAmt, rate: companyRate,
    status: "pending", environment: args.env,
    metadata: splitMeta,
  });

  if (args.rep_code) {
    const { data: rep } = await supabase
      .from("rep_codes")
      .select("commission_rate, role").eq("code", args.rep_code).eq("is_active", true).maybeSingle();
    commissionRows.push({
      sale_id: sale.id, recipient_role: "rep", recipient_code: args.rep_code,
      amount_cents: repAmt, rate: repRate,
      status: "pending", environment: args.env,
      metadata: splitMeta,
    });

    await supabase.rpc("increment_rep_sales" as any, {
      _code: args.rep_code,
      _sales: amount,
      _commission: repAmt,
    });

    // Partner override (skip if rep IS the partner)
    if (rep?.role !== "partner") {
      const partnerCode = await findActivePartnerCode();
      if (partnerCode) {
        commissionRows.push({
          sale_id: sale.id, recipient_role: "partner", recipient_code: partnerCode,
          amount_cents: partnerAmt, rate: partnerRate,
          status: "pending", environment: args.env,
          metadata: splitMeta,
        });
        await supabase.rpc("increment_rep_sales" as any, {
          _code: partnerCode, _sales: 0, _commission: partnerAmt,
        });
      }
    }
  } else {
    // No rep — partner still earns their override if one is configured.
    const partnerCode = await findActivePartnerCode();
    if (partnerCode) {
      commissionRows.push({
        sale_id: sale.id, recipient_role: "partner", recipient_code: partnerCode,
        amount_cents: partnerAmt, rate: partnerRate,
        status: "pending", environment: args.env,
        metadata: splitMeta,
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
    summary: `${args.kind} ${(amount / 100).toFixed(2)} ${args.currency.toUpperCase()} (${args.price_id ?? "?"})${fixed ? ' [FLAGSHIP]' : ''}`,
    metadata: { env: args.env, ...splitMeta, ...(args.metadata ?? {}) },
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

    // 13 Forensics systems — create deliverable + send magic link for client intake
    if (priceId && SYSTEM_PRICE_IDS.has(priceId)) {
      const accessToken = crypto.randomUUID().replace(/-/g, "") +
        crypto.randomUUID().replace(/-/g, "").slice(0, 16);
      const { data: d } = await supabase.from("purchase_deliverables").insert({
        stripe_session_id: session.id,
        email: email || "",
        user_id: userId,
        price_id: priceId,
        tool_type: priceId,
        status: "awaiting_intake",
        input_data: session.metadata || {},
        access_token: accessToken,
      }).select().single();

      if (d && email) {
        const intakeUrl =
          `${PUBLIC_SITE_URL}/deliverable/${accessToken}`;
        triggerFunction("send-transactional-email", {
          templateName: "deliverable-magic-link",
          recipientEmail: email,
          idempotencyKey: `deliv-${d.id}`,
          templateData: {
            title: SYSTEM_TITLES[priceId] || "Your purchase",
            intakeUrl,
            name: name || undefined,
          },
        });
      }
    }

    // Resume Forensics scan credits
    const RESUME_PACKS: Record<string, number> = {
      resume_scan_1: 1,
      resume_scan_5: 5,
      resume_scan_10: 10,
    };
    if (priceId && RESUME_PACKS[priceId] && email) {
      const credits = RESUME_PACKS[priceId];
      const { error: grantErr } = await supabase.rpc("grant_resume_credits" as any, {
        _email: email,
        _credits: credits,
      });
      if (grantErr) console.error("grant_resume_credits error:", grantErr);
      else console.log(`granted ${credits} resume scan credits to ${email}`);
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

    // Careers test access fee — email a resume link so the applicant can take the test.
    if (session.metadata?.purpose === "careers_test_fee" && email) {
      const testUrl = `${PUBLIC_SITE_URL}/careers/test?session_id=${session.id}`;
      triggerFunction("send-transactional-email", {
        templateName: "careers-test-access",
        recipientEmail: email,
        idempotencyKey: `careers-test-${session.id}`,
        templateData: { testUrl, name: name || undefined },
      });
    }

    // ---- Tool Shop: mint lifetime license code ----
    if (session.metadata?.shop === "tools" && email) {
      try {
        const plan = String(session.metadata.plan || "single");
        let toolIds: string[] = [];
        try { toolIds = JSON.parse(session.metadata.tool_ids || "[]"); } catch { toolIds = []; }
        if (!["single","triple","unlimited"].includes(plan)) throw new Error("bad plan");
        if (plan === "single" && toolIds.length !== 1) throw new Error("single requires 1 tool");
        if (plan === "triple" && (toolIds.length < 1 || toolIds.length > 3)) throw new Error("triple requires up to 3 tools");
        if (plan === "unlimited") toolIds = [];

        // Generate a friendly 12-char code: LEAK-XXXX-XXXX
        const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
        const rand = (n: number) => Array.from(crypto.getRandomValues(new Uint8Array(n)))
          .map(b => alphabet[b % alphabet.length]).join("");
        const code = `LEAK-${rand(4)}-${rand(4)}`;

        const { data: lic, error: licErr } = await supabase.from("tool_licenses").insert({
          code, email, plan, tool_ids: toolIds,
          stripe_session_id: session.id,
          amount_cents: session.amount_total ?? null,
        }).select().single();

        if (licErr) console.error("tool_licenses insert:", licErr);

        if (lic) {
          const portalUrl = `${PUBLIC_SITE_URL}/tools-shop/redeem?code=${encodeURIComponent(code)}`;
          triggerFunction("send-transactional-email", {
            templateName: "tool-shop-license",
            recipientEmail: email,
            idempotencyKey: `tool-lic-${lic.id}`,
            templateData: {
              code, plan, portalUrl,
              tools: toolIds,
              name: name || undefined,
            },
          });
        }
      } catch (e) {
        console.error("tool shop mint:", e);
      }
    }

    // ---- Brand Voice Extension: scan URL, mint EXT- code, save brand kit ----
    if ((session.metadata?.shop === "extension" || priceId === "brand_voice_extension") && email) {
      try {
        const brandUrl = String(session.metadata?.brand_url || "").trim();
        const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
        const rand = (n: number) => Array.from(crypto.getRandomValues(new Uint8Array(n)))
          .map(b => alphabet[b % alphabet.length]).join("");
        const code = `EXT-${rand(4)}-${rand(4)}`;

        // Scan brand via Firecrawl (branding + summary) if URL provided + key present.
        let brandTone = "";
        let brandKit: Record<string, unknown> = {};
        const fcKey = Deno.env.get("FIRECRAWL_API_KEY");
        if (brandUrl && fcKey && /^https?:\/\//i.test(brandUrl)) {
          try {
            const r = await fetch("https://api.firecrawl.dev/v2/scrape", {
              method: "POST",
              headers: { "Authorization": `Bearer ${fcKey}`, "Content-Type": "application/json" },
              body: JSON.stringify({
                url: brandUrl,
                formats: ["branding", "summary"],
                onlyMainContent: true,
              }),
            });
            const j = await r.json();
            const branding = j?.branding || j?.data?.branding || {};
            const summary = j?.summary || j?.data?.summary || "";
            brandKit = {
              name: j?.metadata?.title || branding?.name || brandUrl,
              summary,
              colors: branding?.colors || {},
              fonts: branding?.fonts || [],
              logo: branding?.images?.logo || branding?.logo || null,
            };
            brandTone = summary
              ? `Voice pulled from ${brandUrl}: ${String(summary).slice(0, 400)}`
              : `Voice pulled from ${brandUrl}. Speak like the brand's homepage.`;
          } catch (e) {
            console.error("brand scan failed:", e);
            brandTone = `Scan pending. Default: professional, direct, no fluff. Source: ${brandUrl}`;
          }
        } else {
          brandTone = `Default voice: professional, direct, human. Source: ${brandUrl || "not provided"}`;
        }

        const { data: lic, error: licErr } = await supabase.from("tool_licenses").insert({
          code, email, plan: "extension",
          tool_ids: ["brand-voice-extension"],
          stripe_session_id: session.id,
          amount_cents: session.amount_total ?? null,
          brand_url: brandUrl || null,
          brand_tone: brandTone,
        }).select().single();

        if (licErr) console.error("extension license insert:", licErr);

        if (lic) {
          await supabase.from("tool_memory").upsert({
            license_code: code,
            tool_id: "brand-voice-extension",
            memory: brandKit,
          });

          triggerFunction("send-transactional-email", {
            templateName: "tool-shop-license",
            recipientEmail: email,
            idempotencyKey: `ext-lic-${lic.id}`,
            templateData: {
              code, plan: "extension",
              portalUrl: `${PUBLIC_SITE_URL}/brand-voice-extension`,
              tools: ["Brand Voice Chrome Extension"],
              name: name || undefined,
            },
          });
        }
      } catch (e) {
        console.error("brand voice extension mint:", e);
      }
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

/**
 * Resolve the human-readable price id. `lookup_key` first: it is stable across
 * sandbox and live and is what every plan mapping keys off.
 */
function resolvePriceId(price: any): string | null {
  return price?.lookup_key || price?.metadata?.lovable_external_id || price?.id || null;
}

async function handleSubscriptionCreated(subscription: any, env: StripeEnv) {
  const item = subscription.items?.data?.[0];
  const priceId = resolvePriceId(item?.price);
  const productId = item?.price?.product;
  const plan = planByLookupKey(priceId);

  let userId = subscription.metadata?.userId || null;
  const email = subscription.customer_email || subscription.customer_details?.email || null;
  if (!userId && email) {
    const { data: profile } = await supabase.from("profiles").select("id").eq("email", email).maybeSingle();
    if (profile) userId = profile.id;
  }

  const periodStart = item?.current_period_start ?? subscription.current_period_start;
  const periodEnd = item?.current_period_end ?? subscription.current_period_end;

  await supabase.from("subscriptions").upsert({
    user_id: userId,
    stripe_subscription_id: subscription.id,
    stripe_customer_id: subscription.customer,
    product_id: productId, price_id: priceId,
    plan_id: plan?.id ?? subscription.metadata?.plan_id ?? null,
    seats_limit: plan?.entitlements.max_users ?? 5,
    customer_email: email,
    status: subscription.status,
    current_period_start: periodStart ? new Date(periodStart * 1000).toISOString() : null,
    current_period_end: periodEnd ? new Date(periodEnd * 1000).toISOString() : null,
    environment: env, updated_at: new Date().toISOString(),
  }, { onConflict: "stripe_subscription_id" });

  await logActivity({
    event_type: "subscription.created", entity_type: "subscription",
    entity_id: subscription.id,
    rep_code: subscription.metadata?.rep_code || null,
    summary: `Subscription created (${priceId})`,
    metadata: { env, status: subscription.status, email, plan_id: plan?.id ?? null },
  });

  await maybeActivateIntelligence(subscription.id, subscription.status, env);
}

async function handleSubscriptionUpdated(subscription: any, env: StripeEnv) {
  const item = subscription.items?.data?.[0];
  const priceId = resolvePriceId(item?.price);
  const productId = item?.price?.product;
  const plan = planByLookupKey(priceId);
  const periodStart = item?.current_period_start ?? subscription.current_period_start;
  const periodEnd = item?.current_period_end ?? subscription.current_period_end;

  const patch: Record<string, unknown> = {
    status: subscription.status, product_id: productId, price_id: priceId,
    current_period_start: periodStart ? new Date(periodStart * 1000).toISOString() : null,
    current_period_end: periodEnd ? new Date(periodEnd * 1000).toISOString() : null,
    cancel_at_period_end: subscription.cancel_at_period_end || false,
    updated_at: new Date().toISOString(),
  };
  if (plan) {
    patch.plan_id = plan.id;
    patch.seats_limit = plan.entitlements.max_users;
  }

  await supabase.from("subscriptions").update(patch)
    .eq("stripe_subscription_id", subscription.id).eq("environment", env);

  await logActivity({
    event_type: "subscription.updated", entity_type: "subscription", entity_id: subscription.id,
    summary: `Subscription updated → ${subscription.status}`, metadata: { env, plan_id: plan?.id ?? null },
  });

  // An upgrade or a recovered payment can be the first moment the workspace
  // becomes entitled. Activation is idempotent, so calling it again is safe.
  await maybeActivateIntelligence(subscription.id, subscription.status, env);
}

async function handleSubscriptionDeleted(subscription: any, env: StripeEnv) {
  // Access is NOT revoked here. accessStateFor() keeps the workspace live
  // until current_period_end and then makes it read-only. Data is never deleted.
  await supabase.from("subscriptions").update({
    status: "canceled", updated_at: new Date().toISOString(),
  }).eq("stripe_subscription_id", subscription.id).eq("environment", env);
  await logActivity({
    event_type: "subscription.canceled", entity_type: "subscription", entity_id: subscription.id,
    summary: `Subscription canceled`, metadata: { env },
  });
}

/**
 * Fire the one internal orchestrator that provisions the Golden Report
 * Intelligence workspace. Only for entitled statuses, only for that plan.
 */
async function maybeActivateIntelligence(stripeSubscriptionId: string, status: string, env: StripeEnv) {
  if (status !== "active" && status !== "trialing") return;
  const { data: sub } = await supabase
    .from("subscriptions")
    .select("id, plan_id, price_id")
    .eq("stripe_subscription_id", stripeSubscriptionId)
    .eq("environment", env)
    .maybeSingle();
  if (!sub) return;
  const plan = planById(sub.plan_id as string) ?? planByLookupKey(sub.price_id as string);
  if (plan?.id !== "intelligence") return;

  triggerFunction("subscription-orchestrator", {
    action: "activate",
    subscription_id: sub.id,
    environment: env,
  });
}

async function handleInvoicePaymentFailed(invoice: any, env: StripeEnv) {
  const subId = invoice.subscription || invoice.parent?.subscription_details?.subscription || null;
  await logActivity({
    event_type: "invoice.payment_failed",
    entity_type: "invoice",
    entity_id: invoice.id,
    summary: `Payment failed: ${invoice.id}`,
    metadata: { invoice: invoice.id, amount: invoice.amount_due, subscription: subId, env },
  });
  // No revocation. Stripe retries; the UI shows a grace banner via accessStateFor().
}

async function handleInvoicePaid(invoice: any, env: StripeEnv) {
  const email = invoice.customer_email || null;
  const subId = invoice.subscription || invoice.parent?.subscription_details?.subscription || null;

  const repCode = invoice.subscription_details?.metadata?.rep_code
         || invoice.metadata?.rep_code
         || null;

  const line = invoice.lines?.data?.[0];
  const priceId = resolvePriceId(line?.price);

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

  if (!subId) return;

  const { data: sub } = await supabase
    .from("subscriptions")
    .select("id, plan_id, price_id")
    .eq("stripe_subscription_id", subId)
    .eq("environment", env)
    .maybeSingle();

  const plan = planById(sub?.plan_id as string) ?? planByLookupKey(sub?.price_id as string ?? priceId);

  if (plan?.id === "intelligence" && sub) {
    // One idempotent monthly workflow per subscription + billing period.
    triggerFunction("subscription-orchestrator", {
      action: "enqueue_monthly",
      subscription_id: sub.id,
      environment: env,
      stripe_invoice_id: invoice.id,
      billing_period_start: line?.period?.start ? new Date(line.period.start * 1000).toISOString() : null,
      billing_period_end: line?.period?.end ? new Date(line.period.end * 1000).toISOString() : null,
    });
    return;
  }

  // Legacy monthly delivery products keep working exactly as before.
  triggerFunction("monthly-delivery", { subscription_id: subId, stripe_invoice_id: invoice.id });
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
