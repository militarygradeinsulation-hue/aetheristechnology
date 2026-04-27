// Runs the full revenue-leak audit pipeline with live tuning + self-improvement hooks.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

declare const EdgeRuntime: { waitUntil: (promise: Promise<unknown>) => void };

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface PatternFinding {
  key: string;
  label: string;
  count: number;
  exposure_cents: number;
  sample_ids: string[];
  formula: string;
  time_period: string;
  raw_data: any;
}

interface RunMetrics {
  stage_timings: Record<string, number>;
  ai_call_count: number;
  ai_error_count: number;
  ai_total_ms: number;
}

const DEFAULT_CFG = {
  stalled_multiplier: 1.5,
  dead_lead_days: 60,
  slow_followup_hours: 4,
  stuck_proposal_days: 30,
  reactivation_min_amount: 1000,
  reactivation_window_min_days: 180,
  reactivation_window_max_days: 540,
  owner_overload_multiplier: 3.0,
  high_value_deal_min: 5000,
  high_intent_min_engagements: 2,
  diagnostics_model: "google/gemini-2.5-flash",
  recommendations_model: "google/gemini-2.5-pro",
  summary_model: "google/gemini-2.5-pro",
  diagnostics_parallelism: 4,
  enabled_patterns: [
    "stalled_deals","dead_leads","slow_followup","stuck_proposal",
    "closed_lost_reactivation","owner_overload","missing_contact_info","high_intent_no_workflow",
  ],
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "Unauthorized" }, 401);
    const { data: { user }, error: userErr } = await supabase.auth.getUser(authHeader.replace("Bearer ", ""));
    if (userErr || !user) return json({ error: "Unauthorized" }, 401);

    const { account_id } = await req.json();
    if (!account_id) return json({ error: "account_id required" }, 400);

    const { data: acct } = await supabase.from("accounts").select("id,user_id").eq("id", account_id).maybeSingle();
    if (!acct || acct.user_id !== user.id) return json({ error: "Forbidden" }, 403);

    const { data: run, error: runErr } = await supabase.from("audit_runs").insert({
      account_id, status: "running", current_stage: "patterns",
      progress: { stage: "patterns", message: "Detecting revenue leak patterns..." },
    }).select().single();
    if (runErr || !run) throw runErr;

    EdgeRuntime.waitUntil(runPipeline(supabase, account_id, run.id));
    return json({ audit_run_id: run.id });
  } catch (err: any) {
    console.error("[run-audit] error", err);
    return json({ error: err.message || "Failed" }, 500);
  }
});

async function runPipeline(supabase: any, accountId: string, runId: string) {
  const t0 = Date.now();
  const metrics: RunMetrics = { stage_timings: {}, ai_call_count: 0, ai_error_count: 0, ai_total_ms: 0 };

  // Load live tuning config (fall back to defaults)
  const { data: cfgRow } = await supabase.from("audit_tuning_config").select("*").eq("id", 1).maybeSingle();
  const cfg = { ...DEFAULT_CFG, ...(cfgRow || {}) };

  try {
    // ---- Stage 0: Patterns ----
    const tPatterns = Date.now();
    await updateRun(supabase, runId, { current_stage: "patterns", progress: { stage: "patterns", message: "Scanning CRM..." } });
    let findings = await detectPatterns(supabase, accountId, cfg);
    findings = findings.filter(f => (cfg.enabled_patterns as string[]).includes(f.key));
    metrics.stage_timings.patterns = Date.now() - tPatterns;

    if (findings.length) {
      await supabase.from("pattern_results").insert(findings.map(f => ({
        audit_run_id: runId, account_id: accountId,
        pattern_key: f.key, pattern_label: f.label,
        record_count: f.count, exposure_cents: f.exposure_cents,
        sample_ids: f.sample_ids, formula: f.formula,
        time_period: f.time_period, raw_data: f.raw_data,
      })));
    }

    // ---- Stage A: Diagnostics (parallel batches) ----
    const tDiag = Date.now();
    await updateRun(supabase, runId, { current_stage: "diagnostics", progress: { stage: "diagnostics", message: "Analyzing each finding..." } });
    const diagnosed = await mapWithLimit(findings, cfg.diagnostics_parallelism, (f) => stageA_diagnose(f, cfg.diagnostics_model, metrics));
    metrics.stage_timings.diagnostics = Date.now() - tDiag;

    // ---- Stage B: Prioritize ----
    const tPrio = Date.now();
    await updateRun(supabase, runId, { current_stage: "prioritization", progress: { stage: "prioritization", message: "Prioritizing..." } });
    const prioritized = [...diagnosed].sort((a, b) => b.exposure_cents - a.exposure_cents);
    metrics.stage_timings.prioritization = Date.now() - tPrio;

    // ---- Stage C: Recommendations ----
    const tRec = Date.now();
    await updateRun(supabase, runId, { current_stage: "recommendations", progress: { stage: "recommendations", message: "Building recovery plans..." } });
    const recommended = await mapWithLimit(prioritized, cfg.diagnostics_parallelism, (f) => stageC_recommend(f, cfg.recommendations_model, metrics));
    metrics.stage_timings.recommendations = Date.now() - tRec;

    // ---- Stage D + E ----
    const tRpt = Date.now();
    await updateRun(supabase, runId, { current_stage: "report", progress: { stage: "report", message: "Drafting summary..." } });
    const summary = await stageD_summarize(recommended, cfg.summary_model, metrics);
    const totalExposure = recommended.reduce((s, f) => s + (f.exposure_cents || 0), 0);
    const report = { summary, total_exposure_cents: totalExposure, findings: recommended, generated_at: new Date().toISOString() };
    metrics.stage_timings.report = Date.now() - tRpt;

    await updateRun(supabase, runId, {
      status: "complete", current_stage: "done",
      total_exposure_cents: totalExposure, findings_count: recommended.length,
      report, completed_at: new Date().toISOString(),
      progress: { stage: "done", message: "Report ready" },
    });

    // ---- Persist metrics + score ----
    await persistMetrics(supabase, accountId, runId, metrics, findings, Date.now() - t0);

    // ---- Trigger self-analysis (fire-and-forget) ----
    EdgeRuntime.waitUntil(triggerSelfAnalyze(runId));
  } catch (err: any) {
    console.error("[run-audit] pipeline failed", err);
    await updateRun(supabase, runId, {
      status: "failed", error_message: err.message || String(err),
      completed_at: new Date().toISOString(),
    });
    await persistMetrics(supabase, accountId, runId, metrics, [], Date.now() - t0).catch(() => {});
  }
}

async function persistMetrics(supabase: any, accountId: string, runId: string, m: RunMetrics, findings: PatternFinding[], totalMs: number) {
  const zeroFindingPatterns = findings.filter(f => f.count === 0).length;
  const totalPatterns = findings.length;
  const stages = Object.entries(m.stage_timings);
  const bottleneck = stages.length ? stages.reduce((max, cur) => cur[1] > max[1] ? cur : max)[0] : null;

  // Health score: start at 100, deduct based on signals
  let score = 100;
  if (totalMs > 60_000) score -= 30; else if (totalMs > 30_000) score -= 15;
  if (m.ai_error_count > 0) score -= Math.min(30, m.ai_error_count * 10);
  if (totalPatterns > 0 && zeroFindingPatterns / totalPatterns > 0.5) score -= 10;
  if (totalPatterns === 0) score -= 20;
  score = Math.max(0, Math.min(100, score));

  await supabase.from("audit_run_metrics").insert({
    audit_run_id: runId,
    account_id: accountId,
    total_ms: totalMs,
    stage_timings: m.stage_timings,
    ai_call_count: m.ai_call_count,
    ai_error_count: m.ai_error_count,
    ai_total_ms: m.ai_total_ms,
    patterns_with_zero_findings: zeroFindingPatterns,
    total_patterns: totalPatterns,
    health_score: score,
    bottleneck_stage: bottleneck,
  });
}

async function triggerSelfAnalyze(runId: string) {
  try {
    await fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/audit-self-analyze`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
      },
      body: JSON.stringify({ audit_run_id: runId }),
    });
  } catch (e) {
    console.error("[run-audit] self-analyze trigger failed", e);
  }
}

async function mapWithLimit<T, R>(items: T[], limit: number, fn: (item: T) => Promise<R>): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let i = 0;
  const workers = Array.from({ length: Math.max(1, limit) }, async () => {
    while (true) {
      const idx = i++;
      if (idx >= items.length) return;
      results[idx] = await fn(items[idx]);
    }
  });
  await Promise.all(workers);
  return results;
}

async function updateRun(supabase: any, runId: string, patch: any) {
  await supabase.from("audit_runs").update(patch).eq("id", runId);
}

// ============================================================
// Pattern Detection — runs in SQL via SECURITY DEFINER RPCs.
// No more loading the entire CRM into edge function memory.
// ============================================================
async function detectPatterns(supabase: any, accountId: string, cfg: any): Promise<PatternFinding[]> {
  const findings: PatternFinding[] = [];

  // Average deal size (one cheap query, used by two patterns)
  const { data: avgRow } = await supabase.rpc("get_avg_deal_size", { _account_id: accountId });
  const avgDealSize = Number(avgRow ?? 25000);

  type Spec = {
    key: string;
    label: string;
    rpc: string;
    args: Record<string, unknown>;
    formula: string;
    time_period: string;
    extra?: Record<string, unknown>;
  };

  const specs: Spec[] = [
    {
      key: "stalled_deals", label: "Stalled Deals",
      rpc: "detect_stalled_deals",
      args: { _account_id: accountId, _multiplier: Number(cfg.stalled_multiplier) },
      formula: `Open deals where days since last_activity > ${cfg.stalled_multiplier}x stage average`,
      time_period: "All open deals",
    },
    {
      key: "dead_leads", label: "Dead MQLs / SQLs",
      rpc: "detect_dead_leads",
      args: { _account_id: accountId, _days: Number(cfg.dead_lead_days) },
      formula: `MQL/SQL contacts with no activity in ${cfg.dead_lead_days}+ days`,
      time_period: `Last ${cfg.dead_lead_days} days`,
    },
    {
      key: "slow_followup", label: "Slow Lead Follow-Up",
      rpc: "detect_slow_followup",
      args: { _account_id: accountId, _hours: Number(cfg.slow_followup_hours), _avg_deal_size: avgDealSize },
      formula: `Form submissions where first response was ${cfg.slow_followup_hours}+ hours later`,
      time_period: "All form submissions",
    },
    {
      key: "stuck_proposal", label: "Stuck in Proposal",
      rpc: "detect_stuck_proposal",
      args: { _account_id: accountId, _days: Number(cfg.stuck_proposal_days) },
      formula: `Deals in 'proposal_sent' with no activity ${cfg.stuck_proposal_days}+ days`,
      time_period: `Last ${cfg.stuck_proposal_days}+ days`,
    },
    {
      key: "closed_lost_reactivation", label: "Closed-Lost Reactivation Pool",
      rpc: "detect_closed_lost_reactivation",
      args: {
        _account_id: accountId,
        _min_days: Number(cfg.reactivation_window_min_days),
        _max_days: Number(cfg.reactivation_window_max_days),
        _min_amount: Number(cfg.reactivation_min_amount),
      },
      formula: `Closed-lost deals ${cfg.reactivation_window_min_days}-${cfg.reactivation_window_max_days} days old > $${cfg.reactivation_min_amount}`,
      time_period: `${cfg.reactivation_window_min_days}-${cfg.reactivation_window_max_days} days ago`,
    },
    {
      key: "owner_overload", label: "Overloaded Sales Owners",
      rpc: "detect_owner_overload",
      args: { _account_id: accountId, _multiplier: Number(cfg.owner_overload_multiplier) },
      formula: `Owners with ${cfg.owner_overload_multiplier}x+ the average deal load (20% slip-rate assumed)`,
      time_period: "All open deals",
    },
    {
      key: "missing_contact_info", label: "High-Value Deals Missing Contact Info",
      rpc: "detect_missing_contact_info",
      args: { _account_id: accountId, _min_amount: Number(cfg.high_value_deal_min) },
      formula: `Open deals > $${cfg.high_value_deal_min} where the primary contact has no email or phone`,
      time_period: "All open deals",
    },
    {
      key: "high_intent_no_workflow", label: "High-Intent Contacts Not in Workflow",
      rpc: "detect_high_intent_no_workflow",
      args: { _account_id: accountId, _min_engagements: Number(cfg.high_intent_min_engagements), _avg_deal_size: avgDealSize },
      formula: `Non-opportunity contacts with ${cfg.high_intent_min_engagements}+ engagements in last 30 days`,
      time_period: "Last 30 days",
    },
  ];

  // Run all 8 detections in parallel — each one is a single SQL aggregate query.
  const results = await Promise.all(
    specs.map(async (s) => {
      const { data, error } = await supabase.rpc(s.rpc, s.args);
      if (error) {
        console.error(`[run-audit] ${s.key} RPC failed:`, error.message);
        return { spec: s, payload: { count: 0, exposure_cents: 0, sample_ids: [] } };
      }
      return { spec: s, payload: data ?? { count: 0, exposure_cents: 0, sample_ids: [] } };
    }),
  );

  for (const { spec, payload } of results) {
    findings.push({
      key: spec.key,
      label: spec.label,
      count: Number(payload?.count ?? 0),
      exposure_cents: Number(payload?.exposure_cents ?? 0),
      sample_ids: Array.isArray(payload?.sample_ids) ? payload.sample_ids : [],
      formula: spec.formula,
      time_period: spec.time_period,
      raw_data: { ...(payload || {}), avg_deal_size: avgDealSize },
    });
  }

  return findings;
}

// ============================================================
// AI Stages — capture timing and errors into RunMetrics
// ============================================================
async function callAI(model: string, systemPrompt: string, userPrompt: string, m: RunMetrics): Promise<string | null> {
  const key = Deno.env.get("LOVABLE_API_KEY");
  if (!key) return null;
  m.ai_call_count++;
  const t = Date.now();
  try {
    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
      }),
    });
    m.ai_total_ms += Date.now() - t;
    if (!res.ok) {
      m.ai_error_count++;
      console.error("[run-audit] AI", res.status, await res.text());
      return null;
    }
    const data = await res.json();
    return data.choices?.[0]?.message?.content || null;
  } catch (err) {
    m.ai_error_count++;
    m.ai_total_ms += Date.now() - t;
    console.error("[run-audit] AI exception", err);
    return null;
  }
}

async function stageA_diagnose(f: PatternFinding, model: string, m: RunMetrics): Promise<any> {
  const ai = await callAI(model,
    "You are a revenue operations analyst. Given a CRM leak pattern, return a 2-3 sentence blunt diagnostic. Plain text only.",
    `Pattern: ${f.label}\nCount: ${f.count}\nExposure: $${(f.exposure_cents / 100).toLocaleString()}\nFormula: ${f.formula}`,
    m,
  );
  return { ...f, diagnostic: ai || `${f.count} records match this leak pattern, exposing roughly $${(f.exposure_cents / 100).toLocaleString()}.` };
}

async function stageC_recommend(f: any, model: string, m: RunMetrics): Promise<any> {
  const ai = await callAI(model,
    "You are a revenue operations consultant. Build a focused 30-day recovery plan. Return JSON only with shape: {\"plan\":[{\"day\":\"1-3\",\"action\":\"...\"}], \"primary_action\":{\"label\":\"...\",\"action_type\":\"...\"}}",
    `Pattern: ${f.label}\nDiagnostic: ${f.diagnostic}\nExposure: $${(f.exposure_cents / 100).toLocaleString()}`,
    m,
  );
  let plan: any = null;
  if (ai) {
    try { plan = JSON.parse(ai.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim()); } catch { /* */ }
  }
  if (!plan) {
    plan = {
      plan: [
        { day: "1-3", action: `Pull list of all ${f.count} affected records, assign owners.` },
        { day: "4-14", action: `Execute outreach sequence tailored to "${f.label}".` },
        { day: "15-30", action: `Measure response rate, adjust workflow rules to prevent recurrence.` },
      ],
      primary_action: { label: `Approve & Execute: ${f.label} recovery`, action_type: f.key },
    };
  }
  return { ...f, recovery_plan: plan.plan, primary_action: plan.primary_action };
}

async function stageD_summarize(findings: any[], model: string, m: RunMetrics): Promise<string> {
  const total = findings.reduce((s, f) => s + f.exposure_cents, 0);
  const top3 = findings.slice(0, 3);
  const ai = await callAI(model,
    "You are an executive analyst. Write a 3-sentence executive summary for a revenue leak audit. Direct, no fluff.",
    `Total exposure: $${(total / 100).toLocaleString()}\nTop findings: ${top3.map(f => `${f.label} ($${(f.exposure_cents / 100).toLocaleString()}, ${f.count} records)`).join("; ")}`,
    m,
  );
  return ai || `This audit identified $${(total / 100).toLocaleString()} in recoverable revenue across ${findings.length} leak patterns. The top three — ${top3.map(f => f.label).join(", ")} — account for the majority of exposure.`;
}

function json(body: any, status = 200) {
  return new Response(JSON.stringify(body), {
    status, headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
