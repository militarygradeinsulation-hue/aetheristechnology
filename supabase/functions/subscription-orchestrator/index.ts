// ============================================================================
// SUBSCRIPTION ORCHESTRATOR — Golden Report Intelligence ($2,500/mo)
// ----------------------------------------------------------------------------
// One internal orchestrator, one event path. Every side effect is idempotent
// and every long job is a resumable stage in `subscription_workflows`.
//
//   activate         subscription.activated -> profile/company -> latest valid
//                    archive -> exactly one intelligence Company System ->
//                    seeded memory -> Report AI enabled. Then runs cycle #1.
//   enqueue_monthly  invoice.paid -> one workflow per subscription + period.
//   run              execute/resume a workflow through its stages.
//   retry            admin: reset a failed/dead-letter workflow and run it.
//   status           admin/owner diagnostics for one subscription.
//
// Auth: internal service-role key, or admin PIN token. Never public.
// ============================================================================

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";
import { verifyAdminToken, getAdminTokenFromRequest } from "../_shared/admin-token.ts";
import {
  GOLDEN_REPORT_INTELLIGENCE,
  MONTHLY_WORKFLOW_VERSION,
  accessStateFor,
  canWrite,
  monthlyWorkflowKey,
  planById,
  planByLookupKey,
} from "../_shared/plans.ts";
import {
  type ReportDeliverables,
  buildFallbackDeliverables,
  deliverablesComplete,
} from "../_shared/report-deliverables.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-admin-token, x-internal-key",
};
const json = (b: unknown, status = 200) =>
  new Response(JSON.stringify(b), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SVC = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const PUBLIC_SITE_URL = Deno.env.get("PUBLIC_SITE_URL") || "https://aetheris.technology";
const sb = createClient(SUPABASE_URL, SVC);

const nowIso = () => new Date().toISOString();
const PLAN = GOLDEN_REPORT_INTELLIGENCE;

/** A stage failure that should be retried later rather than dead-lettered now. */
class RetryableError extends Error {
  constructor(message: string, readonly retryInSeconds = 60) {
    super(message);
    this.name = "RetryableError";
  }
}

async function callFunction(name: string, body: unknown, init: RequestInit = {}) {
  const res = await fetch(`${SUPABASE_URL}/functions/v1/${name}`, {
    method: "POST",
    ...init,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${SVC}`,
      "x-internal-key": SVC,
      ...(init.headers as Record<string, string> | undefined),
    },
    body: JSON.stringify(body),
  });
  const text = await res.text();
  let parsed: unknown = null;
  try { parsed = JSON.parse(text); } catch { parsed = { raw: text.slice(0, 400) }; }
  if (!res.ok) throw new Error(`${name} failed (${res.status}): ${JSON.stringify(parsed).slice(0, 300)}`);
  return parsed as Record<string, unknown>;
}

/* ───────────────────────────── event bus ───────────────────────────────── */

async function emit(args: {
  system_id?: string | null;
  company_id?: string | null;
  event_type: string;
  correlation_id: string;
  causation_id?: string | null;
  payload?: Record<string, unknown>;
  status?: string;
}) {
  const { error } = await sb.from("company_system_event_bus").insert({
    system_id: args.system_id ?? null,
    company_id: args.company_id ?? null,
    event_type: args.event_type,
    status: args.status ?? "emitted",
    idempotency_key: `${args.event_type}:${args.correlation_id}`,
    payload: {
      ...(args.payload ?? {}),
      correlation_id: args.correlation_id,
      causation_id: args.causation_id ?? null,
      source: "subscription-orchestrator",
      emitted_at: nowIso(),
    },
  });
  // Duplicate idempotency keys are expected on replay and are not an error.
  if (error && (error as { code?: string }).code !== "23505") {
    console.error("event emit error:", error.message);
  }
}

/* ─────────────────────── subscription + identity ───────────────────────── */

type SubRow = Record<string, unknown> & {
  id: string;
  user_id: string | null;
  plan_id: string | null;
  price_id: string | null;
  status: string | null;
  current_period_end: string | null;
  customer_email: string | null;
  company_id: string | null;
  system_id: string | null;
  archive_id: string | null;
  environment: string | null;
  stripe_subscription_id: string | null;
  stripe_customer_id: string | null;
};

async function loadSubscription(id: string): Promise<SubRow | null> {
  const { data } = await sb.from("subscriptions").select("*").eq("id", id).maybeSingle();
  return (data as SubRow | null) ?? null;
}

function isIntelligence(sub: SubRow): boolean {
  const plan = planById(sub.plan_id) ?? planByLookupKey(sub.price_id);
  return plan?.id === "intelligence";
}

/** Subscriber profile is the client-stated business context. Never invented. */
async function loadProfile(sub: SubRow) {
  const { data } = await sb
    .from("subscriber_profiles").select("*")
    .eq("subscription_id", sub.id)
    .order("created_at", { ascending: false })
    .limit(1).maybeSingle();
  return data as Record<string, unknown> | null;
}

function normalizeDomain(input: string | null | undefined): string | null {
  if (!input) return null;
  try {
    const url = new URL(/^https?:\/\//i.test(input) ? input : `https://${input}`);
    return url.hostname.replace(/^www\./i, "").toLowerCase();
  } catch { return null; }
}

/**
 * Resolve the Golden Report company for this subscription. Domain first —
 * a stated business name may be a person's name, and the domain is the only
 * reliable business identity we hold.
 */
async function resolveCompany(sub: SubRow, profile: Record<string, unknown> | null) {
  if (sub.company_id) {
    const { data } = await sb.from("golden_report_companies").select("*").eq("id", sub.company_id).maybeSingle();
    if (data) return data as Record<string, unknown>;
  }
  const domain = normalizeDomain(profile?.website_url as string | null);
  if (domain) {
    const { data } = await sb.from("golden_report_companies").select("*").eq("primary_domain", domain).maybeSingle();
    if (data) return data as Record<string, unknown>;
  }
  return null;
}

/** Latest VALID archive for the company. Invalid reports never drive a system. */
async function latestValidArchive(companyId: string) {
  const { data } = await sb
    .from("golden_report_archive").select("*")
    .eq("company_id", companyId).eq("is_valid", true)
    .order("completed_at", { ascending: false, nullsFirst: false })
    .limit(1).maybeSingle();
  return data as Record<string, unknown> | null;
}

async function previousArchive(companyId: string, excludeId: string) {
  const { data } = await sb
    .from("golden_report_archive").select("*")
    .eq("company_id", companyId).eq("is_valid", true).neq("id", excludeId)
    .order("completed_at", { ascending: false, nullsFirst: false })
    .limit(1).maybeSingle();
  return data as Record<string, unknown> | null;
}

/* ───────────────────────────── workflows ───────────────────────────────── */

type Workflow = Record<string, unknown> & {
  id: string;
  subscription_id: string;
  status: string;
  stage: string | null;
  stages_completed: string[];
  attempts: number;
  max_attempts: number;
  correlation_id: string;
  idempotency_key: string;
  company_id: string | null;
  system_id: string | null;
  archive_id: string | null;
  scan_id: string | null;
  stripe_invoice_id: string | null;
  billing_period_start: string | null;
  result: Record<string, unknown>;
};

async function enqueueWorkflow(args: {
  sub: SubRow;
  stripe_invoice_id?: string | null;
  billing_period_start?: string | null;
  billing_period_end?: string | null;
  workflow_type?: string;
}): Promise<{ workflow: Workflow; created: boolean }> {
  const key = monthlyWorkflowKey({
    subscriptionId: args.sub.id,
    invoiceId: args.stripe_invoice_id,
    periodStart: args.billing_period_start,
  });

  const { data: existing } = await sb
    .from("subscription_workflows").select("*").eq("idempotency_key", key).maybeSingle();
  if (existing) return { workflow: existing as Workflow, created: false };

  const insert = {
    subscription_id: args.sub.id,
    stripe_subscription_id: args.sub.stripe_subscription_id,
    stripe_invoice_id: args.stripe_invoice_id ?? null,
    plan_id: "intelligence",
    company_id: args.sub.company_id,
    system_id: args.sub.system_id,
    archive_id: args.sub.archive_id,
    workflow_type: args.workflow_type ?? "intelligence_monthly",
    workflow_version: MONTHLY_WORKFLOW_VERSION,
    billing_period_start: args.billing_period_start ?? null,
    billing_period_end: args.billing_period_end ?? null,
    idempotency_key: key,
    status: "queued",
    environment: args.sub.environment ?? "sandbox",
  };

  const { data, error } = await sb.from("subscription_workflows").insert(insert).select("*").maybeSingle();
  if (error) {
    if ((error as { code?: string }).code === "23505") {
      const { data: again } = await sb
        .from("subscription_workflows").select("*").eq("idempotency_key", key).maybeSingle();
      if (again) return { workflow: again as Workflow, created: false };
    }
    throw error;
  }
  return { workflow: data as Workflow, created: true };
}

async function patchWorkflow(id: string, patch: Record<string, unknown>) {
  await sb.from("subscription_workflows").update({ ...patch, updated_at: nowIso() }).eq("id", id);
}

/* ─────────────────────────────── stages ────────────────────────────────── */

const STAGES = [
  "validate",
  "rescan",
  "archive",
  "compare",
  "compose",
  "refresh",
  "deliverables",
  "memory",
  "delivery",
  "notify",
] as const;
type Stage = typeof STAGES[number];

type Ctx = {
  wf: Workflow;
  sub: SubRow;
  profile: Record<string, unknown> | null;
  company: Record<string, unknown> | null;
  archive: Record<string, unknown> | null;
  scan: Record<string, unknown> | null;
  comparison: Record<string, unknown> | null;
  system: Record<string, unknown> | null;
  deliverables: ReportDeliverables | null;
  delivery_id: string | null;
};

/** 1. Entitlement + ownership. Nothing runs for an unentitled subscription. */
async function stageValidate(ctx: Ctx) {
  const state = accessStateFor(ctx.sub);
  if (!canWrite(state)) {
    throw new Error(`Subscription is not entitled to run a cycle (access state: ${state}).`);
  }
  if (!isIntelligence(ctx.sub)) throw new Error("Subscription is not on the intelligence plan.");

  ctx.profile = await loadProfile(ctx.sub);
  ctx.company = await resolveCompany(ctx.sub, ctx.profile);

  if (!ctx.company) {
    const website = (ctx.profile?.website_url as string | null) ?? null;
    if (!website) {
      throw new Error(
        "No company is attached to this subscription yet. Complete onboarding with your website URL so the first Golden Report can be run.",
      );
    }
    // Company will be created by the archive stage once the first scan lands.
  }
  if (ctx.company && ctx.sub.company_id !== ctx.company.id) {
    await sb.from("subscriptions").update({ company_id: ctx.company.id }).eq("id", ctx.sub.id);
    ctx.sub.company_id = ctx.company.id as string;
  }
  await patchWorkflow(ctx.wf.id, { company_id: ctx.sub.company_id });
}

/** 2. Monthly public-surface rescan. Started once, then polled on resume. */
async function stageRescan(ctx: Ctx) {
  const website =
    (ctx.profile?.website_url as string | null) ||
    (ctx.company?.website_url as string | null) ||
    (ctx.company?.primary_domain ? `https://${ctx.company.primary_domain}` : null);
  if (!website) throw new Error("No website URL on file to rescan. Add it in the workspace settings.");

  let scanId = ctx.wf.scan_id;
  if (!scanId) {
    const started = await callFunction("forensic-scan-all", {
      url: website,
      company: (ctx.company?.display_name as string | null) || (ctx.profile?.business_name as string | null) || "",
    });
    scanId = String(started.scan_id ?? "");
    if (!scanId) throw new Error("Rescan did not return a scan id.");
    await patchWorkflow(ctx.wf.id, { scan_id: scanId });
    ctx.wf.scan_id = scanId;
  }

  // Bounded inline poll. Scans complete in well under a minute; anything
  // slower becomes a retryable resume instead of a long-running request.
  const deadline = Date.now() + 150_000;
  while (Date.now() < deadline) {
    const { data } = await sb.from("forensic_scans")
      .select("id, status, error_message, report, company_name, target_url")
      .eq("id", scanId).maybeSingle();
    const row = data as Record<string, unknown> | null;
    if (row?.status === "completed") { ctx.scan = row; return; }
    if (row?.status === "failed") throw new Error(`Rescan failed: ${String(row.error_message ?? "unknown")}`);
    await new Promise((r) => setTimeout(r, 5000));
  }
  throw new RetryableError("Rescan still running; will resume.", 60);
}

/** 3. Archive + validate the new report. */
async function stageArchive(ctx: Ctx) {
  const scanId = ctx.wf.scan_id;
  if (!scanId) throw new Error("No scan to archive.");
  // provision:false — composition is driven by this orchestrator only, so a
  // company system is never created twice for the same cycle.
  const res = await callFunction("golden-report-library", {
    action: "archive_scan", scan_id: scanId, provision: false,
  });
  const archiveId = String(res.archive_id ?? "");
  if (!archiveId) throw new Error(`Report could not be archived: ${String(res.skipped ?? "unknown reason")}`);

  const { data } = await sb.from("golden_report_archive").select("*").eq("id", archiveId).maybeSingle();
  ctx.archive = data as Record<string, unknown> | null;
  if (!ctx.archive) throw new Error("Archived report row not found.");
  if (!ctx.archive.is_valid) {
    throw new Error("The new report failed compiler validation. Report must be repaired before this cycle can complete.");
  }

  ctx.sub.company_id = ctx.archive.company_id as string;
  await sb.from("subscriptions")
    .update({ company_id: ctx.sub.company_id, archive_id: archiveId }).eq("id", ctx.sub.id);
  await patchWorkflow(ctx.wf.id, { archive_id: archiveId, company_id: ctx.sub.company_id });
  ctx.wf.archive_id = archiveId;
}

/** 4. Compare against last month's baseline. Never recalculates the ledger. */
async function stageCompare(ctx: Ctx) {
  if (!ctx.archive) throw new Error("No archive to compare.");
  const prev = await previousArchive(ctx.archive.company_id as string, ctx.archive.id as string);
  const num = (v: unknown) => (typeof v === "number" ? v : null);

  ctx.comparison = {
    baseline_archive_id: prev?.id ?? null,
    baseline_completed_at: prev?.completed_at ?? null,
    current_archive_id: ctx.archive.id,
    current_completed_at: ctx.archive.completed_at,
    // Canonical ledger values, copied verbatim from each archive.
    annual_low: { previous: num(prev?.annual_low), current: num(ctx.archive.annual_low) },
    annual_high: { previous: num(prev?.annual_high), current: num(ctx.archive.annual_high) },
    score: { previous: num(prev?.score), current: num(ctx.archive.score) },
    leak_count: { previous: num(prev?.leak_count), current: num(ctx.archive.leak_count) },
    finding_count: { previous: num(prev?.finding_count), current: num(ctx.archive.finding_count) },
    is_first_cycle: !prev,
  };
}

/** 5. Compose or recompose exactly ONE intelligence company system. */
async function stageCompose(ctx: Ctx) {
  const res = await callFunction("company-system", {
    action: "compose",
    scan_id: ctx.wf.scan_id,
    tier: PLAN.entitlements.module_tier,
  });
  const systemId = String((res.system_id as string) ?? (res.system as Record<string, unknown>)?.id ?? "");
  if (!systemId) throw new Error(`Company System composition returned no system: ${JSON.stringify(res).slice(0, 200)}`);

  const { data } = await sb.from("company_systems").select("*").eq("id", systemId).maybeSingle();
  ctx.system = data as Record<string, unknown> | null;

  await sb.from("subscriptions").update({ system_id: systemId }).eq("id", ctx.sub.id);
  await patchWorkflow(ctx.wf.id, { system_id: systemId });
  ctx.sub.system_id = systemId;
  ctx.wf.system_id = systemId;
}

/** 6. The compose call already refreshed goals/tasks/checks. Record the state. */
async function stageRefresh(ctx: Ctx) {
  if (!ctx.system) throw new Error("No company system to refresh.");
  const sid = ctx.system.id as string;
  const [goals, tasks, checks, metrics] = await Promise.all([
    sb.from("company_system_goals").select("id", { count: "exact", head: true }).eq("system_id", sid),
    sb.from("company_system_tasks").select("id", { count: "exact", head: true }).eq("system_id", sid),
    sb.from("company_system_checks").select("id", { count: "exact", head: true }).eq("system_id", sid),
    sb.from("company_system_metrics").select("id", { count: "exact", head: true }).eq("system_id", sid),
  ]);
  ctx.wf.result = {
    ...(ctx.wf.result ?? {}),
    refreshed: {
      goals: goals.count ?? 0,
      tasks: tasks.count ?? 0,
      checks: checks.count ?? 0,
      metrics: metrics.count ?? 0,
      at: nowIso(),
    },
  };
  await patchWorkflow(ctx.wf.id, { result: ctx.wf.result });
}

/**
 * 7. Guaranteed deliverables. The scan already attached a deterministic base;
 * this stage enforces the plan minimums against the REAL persisted shape
 * (imagery.concepts[], posts[], schedule.days[]) and never returns an empty
 * success. ctx.deliverables always ends up holding the normalized object.
 */
function deliverableCounts(d: unknown) {
  const o = (d || {}) as Partial<ReportDeliverables>;
  return {
    imagery: Array.isArray(o.imagery?.concepts) ? o.imagery!.concepts.length : 0,
    posts: Array.isArray(o.posts) ? o.posts.length : 0,
    schedule: Array.isArray(o.schedule?.days) ? o.schedule!.days.length : 0,
  };
}

/** Plan minimums are stricter than the global guarantee (6 imagery here). */
function meetsPlanMinimums(d: unknown): boolean {
  const c = deliverableCounts(d);
  return (
    deliverablesComplete(d) &&
    c.imagery >= PLAN.entitlements.min_imagery &&
    c.posts >= PLAN.entitlements.min_posts &&
    c.schedule >= PLAN.entitlements.schedule_days
  );
}

async function stageDeliverables(ctx: Ctx) {
  const scanId = ctx.wf.scan_id!;
  const { data } = await sb.from("forensic_scans").select("id, report, company_name, target_url").eq("id", scanId).maybeSingle();
  const scan = data as Record<string, unknown> | null;
  if (!scan) throw new Error("Scan row disappeared before deliverables could be read.");

  const report = (scan.report ?? {}) as Record<string, unknown>;
  let deliverables = (report.deliverables ?? null) as ReportDeliverables | null;

  if (!meetsPlanMinimums(deliverables)) {
    // Deterministic base first, so the client always has usable output.
    const fallback = buildFallbackDeliverables({
      company: String(scan.company_name ?? ctx.company?.display_name ?? ""),
      url: String(scan.target_url ?? ""),
      report,
      brand: (deliverables?.brand ?? null) as Record<string, unknown> | null,
    });
    // Keep whatever the stored copy already did better, section by section.
    const stored = deliverables;
    const storedCounts = deliverableCounts(stored);
    const merged: ReportDeliverables = {
      ...fallback,
      brand: stored?.brand ?? fallback.brand ?? null,
      imagery: storedCounts.imagery >= fallback.imagery.concepts.length && stored?.imagery
        ? stored.imagery
        : fallback.imagery,
      posts: storedCounts.posts >= fallback.posts.length && stored?.posts ? stored.posts : fallback.posts,
      schedule: storedCounts.schedule >= fallback.schedule.days.length && stored?.schedule
        ? stored.schedule
        : fallback.schedule,
      generation_state: "ready_with_fallback",
      enriched_at: stored?.enriched_at ?? null,
    };
    deliverables = merged;
    await sb.from("forensic_scans")
      .update({ report: { ...report, deliverables }, updated_at: nowIso() })
      .eq("id", scanId);
  }

  if (!meetsPlanMinimums(deliverables)) {
    const c = deliverableCounts(deliverables);
    throw new RetryableError(
      `Deliverables are incomplete (${c.imagery}/${PLAN.entitlements.min_imagery} imagery concepts, ` +
      `${c.posts}/${PLAN.entitlements.min_posts} posts, ${c.schedule}/${PLAN.entitlements.schedule_days} schedule days). ` +
      `The cycle stays resumable.`,
      120,
    );
  }

  // AI refinement runs in the background and only replaces valid sections.
  await callFunction("report-deliverables", { action: "enrich", scan_id: scanId }).catch((e) => {
    console.warn("deliverable enrichment deferred:", (e as Error).message);
  });

  ctx.deliverables = deliverables;
}


/** 8. Memory, scoped to this company + report + system. No cross-tenant leak. */
async function stageMemory(ctx: Ctx) {
  if (!ctx.archive || !ctx.system) throw new Error("Memory stage requires an archive and a system.");
  const companyId = ctx.archive.company_id as string;
  const systemId = ctx.system.id as string;
  const scanId = ctx.wf.scan_id!;

  const rows = [
    {
      scope: "report",
      memory_key: `cycle:${ctx.wf.billing_period_start ?? ctx.wf.id}`,
      value: {
        archive_id: ctx.archive.id,
        report_version: ctx.archive.report_version,
        annual_low: ctx.archive.annual_low,
        annual_high: ctx.archive.annual_high,
        score: ctx.archive.score,
        grade: ctx.archive.grade,
        comparison: ctx.comparison,
      },
    },
    {
      scope: "company",
      memory_key: "subscription:intelligence",
      value: {
        subscription_id: ctx.sub.id,
        plan_id: "intelligence",
        seats_limit: ctx.sub.seats_limit ?? PLAN.entitlements.max_users,
        entitlements: PLAN.entitlements,
        last_cycle_at: nowIso(),
      },
    },
  ];

  for (const r of rows) {
    await sb.from("company_system_memory").upsert({
      company_id: companyId,
      scan_id: scanId,
      system_id: systemId,
      scope: r.scope,
      memory_key: r.memory_key,
      value: r.value,
      provenance: {
        source: "subscription-orchestrator",
        workflow_id: ctx.wf.id,
        correlation_id: ctx.wf.correlation_id,
        archive_id: ctx.archive.id,
      },
      confidence: 0.95,
      status: "approved",
      sensitivity: "internal",
      author: "system",
      last_verified_at: nowIso(),
      updated_at: nowIso(),
    }, { onConflict: "company_id,scope,memory_key,system_id,scan_id" });
  }
}

/** 9. One delivery record per subscription + billing period. */
async function stageDelivery(ctx: Ctx) {
  if (!ctx.archive) throw new Error("No archive for this delivery.");

  const output = {
    plan: "Golden Report Intelligence",
    executive_summary: ctx.archive.executive_summary ?? null,
    report: {
      archive_id: ctx.archive.id,
      scan_id: ctx.wf.scan_id,
      report_version: ctx.archive.report_version,
      annual_low: ctx.archive.annual_low,
      annual_high: ctx.archive.annual_high,
      currency: "USD",
      score: ctx.archive.score,
      grade: ctx.archive.grade,
      top_leaks: ctx.archive.top_leaks ?? [],
      top_priorities: ctx.archive.top_priorities ?? [],
    },
    comparison: ctx.comparison,
    // Persist the same shape the workspace UI reads: concepts, posts, days.
    deliverables: ctx.deliverables ?? null,
    imagery: ctx.deliverables?.imagery?.concepts ?? [],
    posts: ctx.deliverables?.posts ?? [],
    schedule: ctx.deliverables?.schedule?.days ?? [],
    schedule_overview: ctx.deliverables?.schedule?.overview ?? null,
    deliverable_counts: {
      imagery: ctx.deliverables?.imagery?.concepts?.length ?? 0,
      posts: ctx.deliverables?.posts?.length ?? 0,
      schedule: ctx.deliverables?.schedule?.days?.length ?? 0,
    },
    changes: (ctx.wf.result as Record<string, unknown>)?.refreshed ?? {},
    actions: ctx.archive.top_priorities ?? [],
    next_month_preview:
      "Next cycle rescans your public surface, re-ranks the leak register against this month's baseline, and refreshes your imagery, posts and 30 day schedule.",
    system_id: ctx.system?.id ?? null,
    workspace_url: `${PUBLIC_SITE_URL}/company-system/${ctx.system?.id ?? ""}`,
    boundary:
      "Financial exposure in this tier is modeled from public evidence and stated assumptions. It is not an internally calibrated, operator validated figure.",
  };

  const insert = {
    subscription_id: ctx.sub.id,
    user_id: ctx.sub.user_id,
    delivery_type: "golden_report_intelligence",
    plan_id: "intelligence",
    output_data: output,
    delivery_date: nowIso(),
    stripe_invoice_id: ctx.wf.stripe_invoice_id,
    billing_period_start: ctx.wf.billing_period_start,
    workflow_id: ctx.wf.id,
  };

  const { data, error } = await sb.from("subscription_deliveries").insert(insert).select("id").maybeSingle();
  if (error) {
    if ((error as { code?: string }).code === "23505") {
      // Already delivered for this invoice/period — replay is a no-op.
      const { data: existing } = await sb.from("subscription_deliveries")
        .select("id").eq("subscription_id", ctx.sub.id).eq("workflow_id", ctx.wf.id).maybeSingle();
      ctx.delivery_id = (existing as { id: string } | null)?.id ?? null;
      return;
    }
    throw error;
  }
  ctx.delivery_id = (data as { id: string }).id;
}

/** 10. Notify. Email failure must never fail or duplicate the delivery. */
async function stageNotify(ctx: Ctx) {
  const email = (ctx.sub.customer_email as string | null) || (ctx.profile?.email as string | null) || null;
  if (!email) return;
  try {
    await callFunction("send-transactional-email", {
      templateName: "monthly-delivery",
      recipientEmail: email,
      idempotencyKey: `intel-${ctx.wf.id}`,
      templateData: {
        title: "Your Golden Report refreshed",
        deliveryUrl: `${PUBLIC_SITE_URL}/my-subscription`,
        companyName: (ctx.company?.display_name as string | null) ?? "your company",
      },
    });
  } catch (e) {
    console.warn("notify failed (non fatal):", (e as Error).message);
  }
}

const STAGE_FN: Record<Stage, (ctx: Ctx) => Promise<void>> = {
  validate: stageValidate,
  rescan: stageRescan,
  archive: stageArchive,
  compare: stageCompare,
  compose: stageCompose,
  refresh: stageRefresh,
  deliverables: stageDeliverables,
  memory: stageMemory,
  delivery: stageDelivery,
  notify: stageNotify,
};

/* ─────────────────────────── workflow runner ───────────────────────────── */

async function runWorkflow(workflowId: string) {
  const { data: wfRow } = await sb.from("subscription_workflows").select("*").eq("id", workflowId).maybeSingle();
  if (!wfRow) throw new Error("Workflow not found.");
  const wf = wfRow as Workflow;

  if (wf.status === "completed") return { ok: true, status: "completed", workflow_id: wf.id, replay: true };
  if (wf.status === "dead_letter") return { ok: false, status: "dead_letter", workflow_id: wf.id, error: wf.last_error };
  if (wf.status === "running") {
    // Another invocation owns it. Replay is safe but pointless right now.
    return { ok: true, status: "running", workflow_id: wf.id, skipped: "already_running" };
  }

  const sub = await loadSubscription(wf.subscription_id);
  if (!sub) throw new Error("Subscription not found for this workflow.");

  const attempts = (wf.attempts ?? 0) + 1;
  await patchWorkflow(wf.id, { status: "running", attempts, started_at: wf.started_at ?? nowIso(), last_error: null });
  wf.attempts = attempts;

  const done = new Set<string>(Array.isArray(wf.stages_completed) ? wf.stages_completed as string[] : []);
  const ctx: Ctx = {
    wf, sub,
    profile: null, company: null, archive: null, scan: null,
    comparison: null, system: null, deliverables: null, delivery_id: null,
  };

  await emit({
    event_type: "subscription.cycle.started",
    correlation_id: wf.correlation_id,
    company_id: wf.company_id,
    system_id: wf.system_id,
    payload: { workflow_id: wf.id, attempt: attempts, plan_id: "intelligence" },
  });

  for (const stage of STAGES) {
    // Stages are re-entrant: rehydrate context even for already-completed ones.
    try {
      if (done.has(stage)) {
        await rehydrate(stage, ctx);
        continue;
      }
      await patchWorkflow(wf.id, { stage });
      await STAGE_FN[stage](ctx);
      done.add(stage);
      await patchWorkflow(wf.id, { stages_completed: [...done] });
    } catch (e) {
      const retryable = e instanceof RetryableError;
      const message = (e as Error).message?.slice(0, 500) ?? "unknown stage error";
      const dead = !retryable && attempts >= (wf.max_attempts ?? 5);
      const delay = retryable ? (e as RetryableError).retryInSeconds : Math.min(3600, 60 * 2 ** (attempts - 1));

      await patchWorkflow(wf.id, {
        status: dead ? "dead_letter" : "failed",
        stage,
        last_error: message,
        stages_completed: [...done],
        next_retry_at: dead ? null : new Date(Date.now() + delay * 1000).toISOString(),
      });
      await emit({
        event_type: dead ? "subscription.cycle.dead_letter" : "subscription.cycle.failed",
        correlation_id: wf.correlation_id,
        company_id: wf.company_id,
        system_id: wf.system_id,
        status: "failed",
        payload: { workflow_id: wf.id, stage, attempt: attempts, error: message },
      });
      return { ok: false, workflow_id: wf.id, status: dead ? "dead_letter" : "failed", stage, error: message };
    }
  }

  await patchWorkflow(wf.id, {
    status: "completed", stage: null, completed_at: nowIso(),
    next_retry_at: null, stages_completed: [...done],
    result: { ...(wf.result ?? {}), delivery_id: ctx.delivery_id, archive_id: ctx.archive?.id ?? null },
  });
  await emit({
    event_type: "subscription.cycle.completed",
    correlation_id: wf.correlation_id,
    company_id: wf.company_id,
    system_id: wf.system_id,
    payload: { workflow_id: wf.id, delivery_id: ctx.delivery_id, archive_id: ctx.archive?.id ?? null },
  });

  return { ok: true, workflow_id: wf.id, status: "completed", delivery_id: ctx.delivery_id };
}

/** Rebuild context for a stage that already ran, so resume stays correct. */
async function rehydrate(stage: Stage, ctx: Ctx) {
  if (stage === "validate") {
    ctx.profile = await loadProfile(ctx.sub);
    ctx.company = await resolveCompany(ctx.sub, ctx.profile);
  }
  if (stage === "archive" && ctx.wf.archive_id) {
    const { data } = await sb.from("golden_report_archive").select("*").eq("id", ctx.wf.archive_id).maybeSingle();
    ctx.archive = data as Record<string, unknown> | null;
  }
  if (stage === "compare" && ctx.archive) await stageCompare(ctx);
  if (stage === "compose" && ctx.wf.system_id) {
    const { data } = await sb.from("company_systems").select("*").eq("id", ctx.wf.system_id).maybeSingle();
    ctx.system = data as Record<string, unknown> | null;
  }
  if (stage === "deliverables" && ctx.wf.scan_id) {
    const { data } = await sb.from("forensic_scans").select("report").eq("id", ctx.wf.scan_id).maybeSingle();
    const stored = ((data as Record<string, unknown> | null)?.report as Record<string, unknown> | undefined)
      ?.deliverables as ReportDeliverables | undefined;
    // A resumed run must not ship a short package just because the stage was
    // marked done on an earlier attempt.
    if (!meetsPlanMinimums(stored)) { await stageDeliverables(ctx); return; }
    ctx.deliverables = stored ?? null;
  }
}

/* ─────────────────────────────── handler ───────────────────────────────── */

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  try {
    const bearer = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "").trim() || "";
    const internal = req.headers.get("x-internal-key") === SVC || bearer === SVC;
    const isAdmin = internal ? true : await verifyAdminToken(getAdminTokenFromRequest(req), SVC).catch(() => false);
    if (!internal && !isAdmin) return json({ error: "Unauthorized" }, 401);

    const body = await req.json().catch(() => ({}));
    const action = String(body.action ?? "");

    /* ── activate ────────────────────────────────────────────────────── */
    if (action === "activate") {
      const sub = await loadSubscription(String(body.subscription_id ?? ""));
      if (!sub) return json({ error: "Subscription not found" }, 404);
      if (!isIntelligence(sub)) return json({ ok: true, skipped: "not_intelligence" });

      const state = accessStateFor(sub);
      if (!canWrite(state)) return json({ ok: true, skipped: `not_entitled:${state}` });

      // Owner always holds seat #1. The seat index is partial, so check then
      // insert rather than upsert on a partial conflict target.
      if (sub.user_id) {
        const { data: seat } = await sb.from("subscription_members")
          .select("id").eq("subscription_id", sub.id).eq("user_id", sub.user_id).maybeSingle();
        if (!seat) {
          const { error: seatErr } = await sb.from("subscription_members").insert({
            subscription_id: sub.id, user_id: sub.user_id, role: "owner", status: "active",
          });
          if (seatErr && (seatErr as { code?: string }).code !== "23505") {
            console.error("owner seat insert:", seatErr.message);
          }
        }
      }
      await sb.from("subscriptions")
        .update({ seats_limit: PLAN.entitlements.max_users, plan_id: "intelligence" })
        .eq("id", sub.id);

      const { workflow, created } = await enqueueWorkflow({
        sub,
        workflow_type: "intelligence_activation",
        billing_period_start: (sub.current_period_start as string | null) ?? null,
      });
      await emit({
        event_type: "subscription.activated",
        correlation_id: workflow.correlation_id,
        company_id: sub.company_id,
        payload: { subscription_id: sub.id, workflow_id: workflow.id, created },
      });

      const result = await runWorkflow(workflow.id);
      return json({ ok: true, activated: true, created, ...result });
    }

    /* ── enqueue_monthly ─────────────────────────────────────────────── */
    if (action === "enqueue_monthly") {
      const sub = await loadSubscription(String(body.subscription_id ?? ""));
      if (!sub) return json({ error: "Subscription not found" }, 404);
      if (!isIntelligence(sub)) return json({ ok: true, skipped: "not_intelligence" });

      const { workflow, created } = await enqueueWorkflow({
        sub,
        stripe_invoice_id: body.stripe_invoice_id ?? null,
        billing_period_start: body.billing_period_start ?? null,
        billing_period_end: body.billing_period_end ?? null,
      });
      if (!created && workflow.status === "completed") {
        return json({ ok: true, duplicate: true, workflow_id: workflow.id, status: "completed" });
      }
      const result = await runWorkflow(workflow.id);
      return json({ ok: true, created, ...result });
    }

    /* ── run / retry ─────────────────────────────────────────────────── */
    if (action === "run" || action === "retry") {
      const workflowId = String(body.workflow_id ?? "");
      if (!workflowId) return json({ error: "workflow_id required" }, 400);
      if (action === "retry") {
        await patchWorkflow(workflowId, { status: "queued", last_error: null, next_retry_at: null, attempts: 0 });
      }
      const result = await runWorkflow(workflowId);
      return json(result);
    }

    /* ── sweep: resume anything due ──────────────────────────────────── */
    if (action === "sweep") {
      const { data } = await sb.from("subscription_workflows")
        .select("id")
        .in("status", ["queued", "failed"])
        .or(`next_retry_at.is.null,next_retry_at.lte.${nowIso()}`)
        .order("created_at", { ascending: true })
        .limit(Math.max(1, Math.min(20, Number(body.limit) || 5)));
      const ids = ((data ?? []) as Array<{ id: string }>).map((r) => r.id);
      const results: unknown[] = [];
      for (const id of ids) results.push(await runWorkflow(id).catch((e) => ({ id, error: (e as Error).message })));
      return json({ ok: true, processed: ids.length, results });
    }

    /* ── status ──────────────────────────────────────────────────────── */
    if (action === "status") {
      const sub = await loadSubscription(String(body.subscription_id ?? ""));
      if (!sub) return json({ error: "Subscription not found" }, 404);
      const { data: workflows } = await sb.from("subscription_workflows")
        .select("*").eq("subscription_id", sub.id).order("created_at", { ascending: false }).limit(12);
      const { data: seats } = await sb.from("subscription_members")
        .select("id", { count: "exact", head: true }).eq("subscription_id", sub.id).eq("status", "active");
      return json({
        ok: true,
        access_state: accessStateFor(sub),
        plan: planById(sub.plan_id)?.name ?? null,
        seats_used: (seats as unknown as { count?: number } | null)?.count ?? null,
        seats_limit: sub.seats_limit ?? PLAN.entitlements.max_users,
        workflows: workflows ?? [],
      });
    }

    return json({ error: `Unknown action: ${action}` }, 400);
  } catch (e) {
    console.error("orchestrator error:", (e as Error).message);
    return json({ error: (e as Error).message }, 500);
  }
});
