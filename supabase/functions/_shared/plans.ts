// ============================================================================
// AETHERIS SUBSCRIPTION PLANS — SERVER-SIDE SOURCE OF TRUTH
// ----------------------------------------------------------------------------
// Edge functions must never read entitlements from client input or from the UI
// tier file. Everything an edge function is allowed to do for a paying
// subscriber is decided here and cross-checked against the live subscription
// row (status + price/lookup key).
// ============================================================================

export type PlanId = "intelligence";

export type PlanEntitlements = {
  /** Max companies/company-systems this plan may provision. */
  max_companies: number;
  /** Seats, enforced by subscription_members + DB trigger. */
  max_users: number;
  report_ai: boolean;
  /** Report AI may mutate internal records (goals/tasks/checks/memory/briefs). */
  safe_internal_actions: boolean;
  monthly_rescan: boolean;
  monthly_deliverables: boolean;
  company_system: boolean;
  persistent_memory: boolean;
  billing_portal: boolean;
  // Hard exclusions. Never flip these on for this plan.
  external_publishing: boolean;
  destructive_actions: boolean;
  external_integrations: boolean;
  custom_builds: boolean;
  operator_hours: number;
  verified_recovery_claims: boolean;
  /** Company System module tier this plan maps onto. */
  module_tier: "intelligence";
  /** Guaranteed monthly deliverable minimums. */
  min_imagery: number;
  min_posts: number;
  schedule_days: number;
};

export type PlanDefinition = {
  id: PlanId;
  /** Public marketing name. */
  name: string;
  stripe_lookup_key: string;
  stripe_product_name: string;
  stripe_product_description: string;
  amount_cents: number;
  currency: "usd";
  interval: "month";
  /** Stripe tax code: SaaS / electronically supplied services. */
  tax_code: string;
  entitlements: PlanEntitlements;
};

export const GOLDEN_REPORT_INTELLIGENCE: PlanDefinition = {
  id: "intelligence",
  name: "Golden Report Intelligence",
  stripe_lookup_key: "golden_report_intelligence_monthly",
  stripe_product_name: "Golden Report Intelligence",
  stripe_product_description:
    "A living Golden Report workspace and Report AI for one company. Monthly public-surface rescan, leak register, goals, tasks, checks, forecasting, and refreshed imagery, posts and 30-day schedule. Financial exposure is modeled from public evidence and stated assumptions.",
  amount_cents: 250_000,
  currency: "usd",
  interval: "month",
  tax_code: "txcd_10103001",
  entitlements: {
    max_companies: 1,
    max_users: 5,
    report_ai: true,
    safe_internal_actions: true,
    monthly_rescan: true,
    monthly_deliverables: true,
    company_system: true,
    persistent_memory: true,
    billing_portal: true,
    external_publishing: false,
    destructive_actions: false,
    external_integrations: false,
    custom_builds: false,
    operator_hours: 0,
    verified_recovery_claims: false,
    module_tier: "intelligence",
    min_imagery: 6,
    min_posts: 12,
    schedule_days: 30,
  },
};

export const PLANS: Record<PlanId, PlanDefinition> = {
  intelligence: GOLDEN_REPORT_INTELLIGENCE,
};

const BY_LOOKUP_KEY: Record<string, PlanDefinition> = Object.fromEntries(
  Object.values(PLANS).map((p) => [p.stripe_lookup_key, p]),
);

export function planByLookupKey(key: string | null | undefined): PlanDefinition | null {
  if (!key) return null;
  return BY_LOOKUP_KEY[key] ?? null;
}

export function planById(id: string | null | undefined): PlanDefinition | null {
  if (!id) return null;
  return (PLANS as Record<string, PlanDefinition>)[id] ?? null;
}

/** Statuses that grant full entitlement right now. */
export const ENTITLED_STATUSES = ["active", "trialing"] as const;
/** Payment is failing but access is preserved during Stripe's retry window. */
export const GRACE_STATUSES = ["past_due", "unpaid"] as const;

export type SubscriptionRowLike = {
  id?: string;
  status?: string | null;
  plan_id?: string | null;
  price_id?: string | null;
  current_period_end?: string | null;
  cancel_at_period_end?: boolean | null;
};

export type AccessState = "active" | "grace" | "read_only" | "none";

/**
 * One function decides access everywhere. Canceled subscriptions keep full
 * access until current_period_end, then become read-only. Data is never
 * deleted on cancellation.
 */
export function accessStateFor(sub: SubscriptionRowLike | null | undefined, now = new Date()): AccessState {
  if (!sub || !sub.status) return "none";
  const status = String(sub.status);
  const periodEnd = sub.current_period_end ? new Date(sub.current_period_end) : null;
  const stillInPeriod = !!periodEnd && periodEnd.getTime() > now.getTime();

  if ((ENTITLED_STATUSES as readonly string[]).includes(status)) return "active";
  if ((GRACE_STATUSES as readonly string[]).includes(status)) return "grace";
  if (status === "canceled" || status === "incomplete_expired" || status === "paused") {
    return stillInPeriod ? "active" : "read_only";
  }
  if (status === "incomplete") return "none";
  return "none";
}

export function canWrite(state: AccessState): boolean {
  return state === "active" || state === "grace";
}

/** Resolve the plan for a subscription row, tolerating legacy rows. */
export function planForSubscription(sub: SubscriptionRowLike | null | undefined): PlanDefinition | null {
  if (!sub) return null;
  return planById(sub.plan_id) ?? planByLookupKey(sub.price_id);
}

/**
 * Server-side entitlement gate. Returns a reason string when denied so callers
 * can surface an actionable error instead of an empty success.
 */
export function checkEntitlement(
  sub: SubscriptionRowLike | null | undefined,
  capability: keyof PlanEntitlements,
  opts: { requireWrite?: boolean } = {},
): { ok: true; plan: PlanDefinition; state: AccessState } | { ok: false; reason: string; state: AccessState } {
  const state = accessStateFor(sub);
  if (state === "none") {
    return { ok: false, reason: "No active Golden Report Intelligence subscription.", state };
  }
  const plan = planForSubscription(sub);
  if (!plan) return { ok: false, reason: "Subscription is not mapped to a known plan.", state };

  const value = plan.entitlements[capability];
  const enabled = typeof value === "number" ? value > 0 : !!value;
  if (!enabled) {
    return { ok: false, reason: `${plan.name} does not include ${String(capability)}. Upgrade required.`, state };
  }
  if (opts.requireWrite && !canWrite(state)) {
    return { ok: false, reason: "This workspace is read-only. Reactivate billing to make changes.", state };
  }
  return { ok: true, plan, state };
}

/** Stripe requires a stable prefix plus 8 random lowercase letters. */
export function integrationIdentifier(prefix = "aetheris"): string {
  const letters = "abcdefghijklmnopqrstuvwxyz";
  const bytes = crypto.getRandomValues(new Uint8Array(8));
  const suffix = Array.from(bytes, (b) => letters[b % 26]).join("");
  return `${prefix}${suffix}`;
}

/** Deterministic workflow key: one run per subscription + billing period + version. */
export const MONTHLY_WORKFLOW_VERSION = 1;

export function monthlyWorkflowKey(args: {
  subscriptionId: string;
  invoiceId?: string | null;
  periodStart?: string | null;
  version?: number;
}): string {
  const version = args.version ?? MONTHLY_WORKFLOW_VERSION;
  const period = args.periodStart ? new Date(args.periodStart).toISOString().slice(0, 10) : "no-period";
  const invoice = args.invoiceId || "no-invoice";
  return `intel-monthly:v${version}:${args.subscriptionId}:${period}:${invoice}`;
}
