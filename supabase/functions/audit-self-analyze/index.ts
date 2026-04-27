// Reads the latest audit run + recent metrics, asks AI to score the run and propose
// tuning + code improvements. Auto-applies low-risk tuning when enabled.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Hard bounds for any auto-applied knob. AI cannot push values outside these.
const KNOB_BOUNDS: Record<string, { min: number; max: number; type: "number" | "integer" }> = {
  stalled_multiplier: { min: 1.1, max: 3.0, type: "number" },
  dead_lead_days: { min: 30, max: 180, type: "integer" },
  slow_followup_hours: { min: 1, max: 48, type: "integer" },
  stuck_proposal_days: { min: 7, max: 120, type: "integer" },
  reactivation_min_amount: { min: 100, max: 50000, type: "integer" },
  reactivation_window_min_days: { min: 30, max: 365, type: "integer" },
  reactivation_window_max_days: { min: 180, max: 1095, type: "integer" },
  owner_overload_multiplier: { min: 1.5, max: 6.0, type: "number" },
  high_value_deal_min: { min: 500, max: 100000, type: "integer" },
  high_intent_min_engagements: { min: 1, max: 10, type: "integer" },
  diagnostics_parallelism: { min: 1, max: 10, type: "integer" },
};

const ALLOWED_MODELS = [
  "google/gemini-2.5-flash",
  "google/gemini-2.5-flash-lite",
  "google/gemini-2.5-pro",
  "openai/gpt-5",
  "openai/gpt-5-mini",
  "openai/gpt-5-nano",
];

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { audit_run_id } = await req.json().catch(() => ({}));
    if (!audit_run_id) return json({ error: "audit_run_id required" }, 400);

    // Load config
    const { data: cfg } = await supabase.from("audit_tuning_config").select("*").eq("id", 1).maybeSingle();
    if (!cfg?.self_analysis_enabled) {
      return json({ skipped: true, reason: "self_analysis_disabled" });
    }

    // Latest run + metrics + last 5 historical metrics
    const [{ data: run }, { data: latestMetric }, { data: recentMetrics }, { data: patterns }] = await Promise.all([
      supabase.from("audit_runs").select("*").eq("id", audit_run_id).maybeSingle(),
      supabase.from("audit_run_metrics").select("*").eq("audit_run_id", audit_run_id).maybeSingle(),
      supabase.from("audit_run_metrics").select("*").order("created_at", { ascending: false }).limit(5),
      supabase.from("pattern_results").select("pattern_key,record_count,exposure_cents").eq("audit_run_id", audit_run_id),
    ]);

    if (!run) return json({ error: "run not found" }, 404);

    const promptInput = {
      latest_run: {
        id: run.id,
        status: run.status,
        findings_count: run.findings_count,
        total_exposure_cents: run.total_exposure_cents,
        error_message: run.error_message,
      },
      latest_metrics: latestMetric,
      recent_metrics: recentMetrics,
      pattern_results: patterns,
      current_config: cfg,
      knob_bounds: KNOB_BOUNDS,
      allowed_models: ALLOWED_MODELS,
    };

    const ai = await callAI(cfg.self_analysis_model, promptInput);
    if (!ai) return json({ error: "AI analysis failed" }, 500);

    // Persist tuning proposals
    const tuningProposals = (ai.tuning_proposals || []).filter((p: any) => p?.field && p?.proposed_value !== undefined);
    const codeProposals = (ai.code_proposals || []).filter((p: any) => p?.title && p?.target_file);

    let autoApplied = 0;
    for (const p of tuningProposals) {
      const safe = sanitizeKnob(p.field, p.proposed_value, cfg);
      if (!safe.ok) continue;

      const shouldAutoApply =
        cfg.auto_apply_enabled &&
        Number(p.confidence || 0) >= 0.8 &&
        safe.withinBounds;

      const { data: inserted } = await supabase.from("audit_tuning_proposals").insert({
        audit_run_id,
        field: p.field,
        current_value: { value: (cfg as any)[p.field] ?? null },
        proposed_value: { value: safe.value },
        reason: String(p.reason || "").slice(0, 1000),
        expected_impact: String(p.expected_impact || "").slice(0, 500),
        confidence: Number(p.confidence || 0),
        status: shouldAutoApply ? "auto_applied" : "pending",
        applied_at: shouldAutoApply ? new Date().toISOString() : null,
      }).select().single();

      if (shouldAutoApply && inserted) {
        await supabase.from("audit_tuning_config").update({ [p.field]: safe.value, updated_at: new Date().toISOString() }).eq("id", 1);
        autoApplied++;
      }
    }

    for (const c of codeProposals) {
      await supabase.from("audit_code_proposals").insert({
        audit_run_id,
        title: String(c.title).slice(0, 200),
        diagnosis: String(c.diagnosis || "").slice(0, 2000),
        target_file: String(c.target_file).slice(0, 300),
        proposed_change: String(c.proposed_change || c.diff || "").slice(0, 8000),
      });
    }

    return json({
      ok: true,
      health_score: ai.health_score,
      bottleneck: ai.bottleneck,
      narrative: ai.narrative,
      tuning_proposals: tuningProposals.length,
      code_proposals: codeProposals.length,
      auto_applied: autoApplied,
    });
  } catch (err: any) {
    console.error("[audit-self-analyze] error", err);
    return json({ error: err.message || "Failed" }, 500);
  }
});

function sanitizeKnob(field: string, value: unknown, cfg: any): { ok: boolean; value: any; withinBounds: boolean } {
  // Knob fields with hard bounds
  if (KNOB_BOUNDS[field]) {
    const b = KNOB_BOUNDS[field];
    let n = Number(value);
    if (!isFinite(n)) return { ok: false, value, withinBounds: false };
    if (b.type === "integer") n = Math.round(n);
    const within = n >= b.min && n <= b.max;
    if (!within) return { ok: false, value: n, withinBounds: false };
    return { ok: true, value: n, withinBounds: true };
  }
  // Model fields
  if (["diagnostics_model", "recommendations_model", "summary_model", "self_analysis_model"].includes(field)) {
    if (typeof value !== "string" || !ALLOWED_MODELS.includes(value)) return { ok: false, value, withinBounds: false };
    return { ok: true, value, withinBounds: true };
  }
  // enabled_patterns – never auto-disable a pattern that produced findings recently; always queue for manual
  if (field === "enabled_patterns") {
    if (!Array.isArray(value)) return { ok: false, value, withinBounds: false };
    return { ok: true, value, withinBounds: false }; // queued, not auto-applied
  }
  return { ok: false, value, withinBounds: false };
}

const SYSTEM_PROMPT = `You are a senior RevOps engineer auditing a HubSpot revenue-leak audit pipeline ITSELF.
Your job: score the latest run, identify the bottleneck, and propose improvements.

You will receive: latest_run, latest_metrics (timings, ai_call_count, ai_error_count, health_score so far),
recent_metrics (last 5 runs), pattern_results (count + exposure per pattern), current_config, knob_bounds, allowed_models.

Rules:
- health_score 0-100: deduct for slow runs (>30s = warning, >60s = bad), AI errors, low finding count, high zero-finding pattern ratio.
- bottleneck = the slowest stage from latest_metrics.stage_timings.
- Propose tuning changes only when justified by metrics. Stay STRICTLY within knob_bounds.
- Confidence >= 0.8 ONLY when the change is small (within 25% of current value), backed by a clear metric pattern, and within bounds.
- NEVER propose disabling a pattern that returned >0 findings in any recent run.
- Code proposals are for new patterns, refactors, batching opportunities. Be specific (file path + concrete change).
- Output via the provided tool only. No prose outside the tool call.`;

async function callAI(model: string, input: any): Promise<any | null> {
  const key = Deno.env.get("LOVABLE_API_KEY");
  if (!key) return null;

  const tool = {
    type: "function",
    function: {
      name: "submit_self_analysis",
      description: "Submit the audit pipeline self-analysis.",
      parameters: {
        type: "object",
        properties: {
          health_score: { type: "integer", minimum: 0, maximum: 100 },
          bottleneck: { type: "string" },
          narrative: { type: "string", description: "2-4 sentence plain-English diagnosis." },
          tuning_proposals: {
            type: "array",
            items: {
              type: "object",
              properties: {
                field: { type: "string" },
                proposed_value: {},
                reason: { type: "string" },
                expected_impact: { type: "string" },
                confidence: { type: "number", minimum: 0, maximum: 1 },
              },
              required: ["field", "proposed_value", "reason", "confidence"],
            },
          },
          code_proposals: {
            type: "array",
            items: {
              type: "object",
              properties: {
                title: { type: "string" },
                diagnosis: { type: "string" },
                target_file: { type: "string" },
                proposed_change: { type: "string" },
              },
              required: ["title", "target_file", "proposed_change"],
            },
          },
        },
        required: ["health_score", "bottleneck", "narrative", "tuning_proposals", "code_proposals"],
      },
    },
  };

  try {
    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model,
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: JSON.stringify(input) },
        ],
        tools: [tool],
        tool_choice: { type: "function", function: { name: "submit_self_analysis" } },
      }),
    });
    if (!res.ok) {
      console.error("[audit-self-analyze] AI error", res.status, await res.text());
      return null;
    }
    const data = await res.json();
    const args = data.choices?.[0]?.message?.tool_calls?.[0]?.function?.arguments;
    if (!args) return null;
    return JSON.parse(args);
  } catch (e) {
    console.error("[audit-self-analyze] AI exception", e);
    return null;
  }
}

function json(body: any, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
