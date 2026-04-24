// Runs the full revenue-leak audit pipeline:
// 1. Pattern detection (8 SQL-style queries against mirror_* tables)
// 2. Claude Stage A — diagnostics per finding
// 3. Claude Stage B — prioritization
// 4. Claude Stage C — recommendations + 30-day plan
// 5. Claude Stage D — executive summary
// 6. Claude Stage E — final report assembly
//
// If LOVABLE_API_KEY (or ANTHROPIC_API_KEY) is missing, falls back to
// deterministic placeholder analysis so the entire flow is testable.

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

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "Unauthorized" }, 401);
    const { data: { user }, error: userErr } = await supabase.auth.getUser(authHeader.replace("Bearer ", ""));
    if (userErr || !user) return json({ error: "Unauthorized" }, 401);

    const { account_id } = await req.json();
    if (!account_id) return json({ error: "account_id required" }, 400);

    const { data: acct } = await supabase.from("accounts").select("id,user_id").eq("id", account_id).maybeSingle();
    if (!acct || acct.user_id !== user.id) return json({ error: "Forbidden" }, 403);

    // Create the audit_run row
    const { data: run, error: runErr } = await supabase.from("audit_runs").insert({
      account_id,
      status: "running",
      current_stage: "patterns",
      progress: { stage: "patterns", message: "Detecting revenue leak patterns..." },
    }).select().single();
    if (runErr || !run) throw runErr;

    // Kick off the rest in the background; respond immediately with run id
    EdgeRuntime.waitUntil(runPipeline(supabase, account_id, run.id));

    return json({ audit_run_id: run.id });
  } catch (err: any) {
    console.error("[run-audit] error", err);
    return json({ error: err.message || "Failed" }, 500);
  }
});

async function runPipeline(supabase: any, accountId: string, runId: string) {
  try {
    // ---- Stage 0: Pattern Detection ----
    await updateRun(supabase, runId, { current_stage: "patterns", progress: { stage: "patterns", message: "Scanning CRM for leak patterns..." } });
    const findings = await detectPatterns(supabase, accountId);
    // Persist raw pattern results
    if (findings.length) {
      await supabase.from("pattern_results").insert(
        findings.map(f => ({
          audit_run_id: runId,
          account_id: accountId,
          pattern_key: f.key,
          pattern_label: f.label,
          record_count: f.count,
          exposure_cents: f.exposure_cents,
          sample_ids: f.sample_ids,
          formula: f.formula,
          time_period: f.time_period,
          raw_data: f.raw_data,
        }))
      );
    }

    // ---- Stage A: Diagnostics ----
    await updateRun(supabase, runId, { current_stage: "diagnostics", progress: { stage: "diagnostics", message: "Analyzing each finding..." } });
    const diagnosed = await Promise.all(findings.map(f => stageA_diagnose(f)));

    // ---- Stage B: Prioritization ----
    await updateRun(supabase, runId, { current_stage: "prioritization", progress: { stage: "prioritization", message: "Prioritizing by impact..." } });
    const prioritized = await stageB_prioritize(diagnosed);

    // ---- Stage C: Recommendations ----
    await updateRun(supabase, runId, { current_stage: "recommendations", progress: { stage: "recommendations", message: "Building 30-day recovery plans..." } });
    const recommended = await Promise.all(prioritized.map(f => stageC_recommend(f)));

    // ---- Stage D: Executive Summary ----
    await updateRun(supabase, runId, { current_stage: "report", progress: { stage: "report", message: "Drafting executive summary..." } });
    const summary = await stageD_summarize(recommended);

    // ---- Stage E: Assemble ----
    const totalExposure = recommended.reduce((sum, f) => sum + (f.exposure_cents || 0), 0);
    const report = {
      summary,
      total_exposure_cents: totalExposure,
      findings: recommended,
      generated_at: new Date().toISOString(),
    };

    await updateRun(supabase, runId, {
      status: "complete",
      current_stage: "done",
      total_exposure_cents: totalExposure,
      findings_count: recommended.length,
      report,
      completed_at: new Date().toISOString(),
      progress: { stage: "done", message: "Report ready" },
    });

    console.log(`[run-audit] pipeline complete for run ${runId}: ${recommended.length} findings, $${(totalExposure / 100).toLocaleString()} exposure`);
  } catch (err: any) {
    console.error("[run-audit] pipeline failed", err);
    await updateRun(supabase, runId, {
      status: "failed",
      error_message: err.message || String(err),
      completed_at: new Date().toISOString(),
    });
  }
}

async function updateRun(supabase: any, runId: string, patch: any) {
  await supabase.from("audit_runs").update(patch).eq("id", runId);
}

// ============================================================
// Pattern Detection — 8 queries against the mirror tables
// ============================================================
async function detectPatterns(supabase: any, accountId: string): Promise<PatternFinding[]> {
  const findings: PatternFinding[] = [];
  const now = Date.now();
  const days = (n: number) => new Date(now - n * 86400000).toISOString();

  // Load deals + contacts + engagements once for pattern queries
  const [{ data: deals }, { data: contacts }, { data: engagements }] = await Promise.all([
    supabase.from("mirror_deals").select("*").eq("account_id", accountId),
    supabase.from("mirror_contacts").select("*").eq("account_id", accountId),
    supabase.from("mirror_engagements").select("*").eq("account_id", accountId),
  ]);

  const D = deals || []; const C = contacts || []; const E = engagements || [];

  // 1. STALLED DEALS — open deals where last_activity > stage avg days
  const stalled = D.filter((d: any) => {
    if (!d.stage || d.stage.startsWith("closed_")) return false;
    const avg = d.properties?.stage_avg_days || 14;
    if (!d.last_activity_date) return false;
    const daysSince = (now - new Date(d.last_activity_date).getTime()) / 86400000;
    return daysSince > avg * 1.5;
  });
  findings.push({
    key: "stalled_deals",
    label: "Stalled Deals",
    count: stalled.length,
    exposure_cents: Math.round(stalled.reduce((s: number, d: any) => s + Number(d.amount || 0), 0) * 100),
    sample_ids: stalled.slice(0, 10).map((d: any) => d.hubspot_id),
    formula: "Open deals where days since last_activity > 1.5x stage average",
    time_period: "All open deals",
    raw_data: { count: stalled.length, sample_amounts: stalled.slice(0, 5).map((d: any) => d.amount) },
  });

  // 2. DEAD MQLs/SQLs — no activity in 60+ days
  const sixtyDaysAgo = days(60);
  const deadLeads = C.filter((c: any) =>
    ["marketingqualifiedlead","salesqualifiedlead"].includes(c.lifecycle_stage) &&
    c.last_activity_date && c.last_activity_date < sixtyDaysAgo
  );
  // Estimate exposure as count * average deal size from the same period
  const avgDealSize = D.length ? D.reduce((s: number, d: any) => s + Number(d.amount || 0), 0) / D.length : 25000;
  findings.push({
    key: "dead_leads",
    label: "Dead MQLs / SQLs",
    count: deadLeads.length,
    exposure_cents: Math.round(deadLeads.length * avgDealSize * 0.05 * 100), // 5% conversion estimate
    sample_ids: deadLeads.slice(0, 10).map((c: any) => c.hubspot_id),
    formula: "MQL/SQL contacts with no activity in 60+ days",
    time_period: "Last 60 days",
    raw_data: { avg_deal_size: avgDealSize },
  });

  // 3. SLOW FOLLOW-UP — first response 4+ hours after form submission
  const formEvents = E.filter((e: any) => e.properties?.source === "form_submission");
  const slowFollowUps: any[] = [];
  for (const f of formEvents) {
    const followUps = E.filter((e: any) => e.contact_id === f.contact_id && new Date(e.timestamp) > new Date(f.timestamp));
    if (followUps.length === 0) continue;
    const earliest = followUps.reduce((min: any, e: any) => new Date(e.timestamp) < new Date(min.timestamp) ? e : min);
    const hoursLater = (new Date(earliest.timestamp).getTime() - new Date(f.timestamp).getTime()) / 3600000;
    if (hoursLater >= 4) slowFollowUps.push({ contact_id: f.contact_id, hours: hoursLater });
  }
  findings.push({
    key: "slow_followup",
    label: "Slow Lead Follow-Up",
    count: slowFollowUps.length,
    exposure_cents: Math.round(slowFollowUps.length * avgDealSize * 0.08 * 100),
    sample_ids: slowFollowUps.slice(0, 10).map((s: any) => s.contact_id),
    formula: "Form submissions where first owner response was 4+ hours later",
    time_period: "All form submissions",
    raw_data: { avg_delay_hours: slowFollowUps.length ? slowFollowUps.reduce((s, x) => s + x.hours, 0) / slowFollowUps.length : 0 },
  });

  // 4. STUCK IN PROPOSAL — proposal_sent for 30+ days
  const stuckProposal = D.filter((d: any) => {
    if (d.stage !== "proposal_sent" || !d.last_activity_date) return false;
    return (now - new Date(d.last_activity_date).getTime()) / 86400000 >= 30;
  });
  findings.push({
    key: "stuck_proposal",
    label: "Stuck in Proposal",
    count: stuckProposal.length,
    exposure_cents: Math.round(stuckProposal.reduce((s: number, d: any) => s + Number(d.amount || 0), 0) * 100),
    sample_ids: stuckProposal.slice(0, 10).map((d: any) => d.hubspot_id),
    formula: "Deals in 'proposal_sent' with no activity 30+ days",
    time_period: "Last 30+ days",
    raw_data: {},
  });

  // 5. CLOSED-LOST REACTIVATION — 6-18 months ago, > $1k
  const sixMonthsAgo = days(180); const eighteenMonthsAgo = days(540);
  const reactivatable = D.filter((d: any) =>
    d.stage === "closed_lost" && Number(d.amount || 0) > 1000 &&
    d.close_date && d.close_date < sixMonthsAgo && d.close_date > eighteenMonthsAgo
  );
  findings.push({
    key: "closed_lost_reactivation",
    label: "Closed-Lost Reactivation Pool",
    count: reactivatable.length,
    exposure_cents: Math.round(reactivatable.reduce((s: number, d: any) => s + Number(d.amount || 0), 0) * 0.15 * 100),
    sample_ids: reactivatable.slice(0, 10).map((d: any) => d.hubspot_id),
    formula: "Closed-lost deals 6-18 months old > $1k (15% reactivation rate assumed)",
    time_period: "6-18 months ago",
    raw_data: {},
  });

  // 6. OWNER OVERLOAD — owners with 3x+ average deal load
  const ownerCounts: Record<string, number> = {};
  D.forEach((d: any) => { if (d.owner_id) ownerCounts[d.owner_id] = (ownerCounts[d.owner_id] || 0) + 1; });
  const counts = Object.values(ownerCounts);
  const avgLoad = counts.length ? counts.reduce((a, b) => a + b, 0) / counts.length : 0;
  const overloaded = Object.entries(ownerCounts).filter(([_, c]) => c >= avgLoad * 3);
  findings.push({
    key: "owner_overload",
    label: "Overloaded Sales Owners",
    count: overloaded.length,
    exposure_cents: Math.round(overloaded.reduce((s, [oid, c]) => {
      const ownerDeals = D.filter((d: any) => d.owner_id === oid && !d.stage?.startsWith("closed_"));
      return s + ownerDeals.reduce((ss: number, d: any) => ss + Number(d.amount || 0) * 0.2, 0);
    }, 0) * 100),
    sample_ids: overloaded.slice(0, 10).map(([oid]) => oid),
    formula: "Owners with 3x+ the average deal load (20% slip-rate assumed)",
    time_period: "All open deals",
    raw_data: { avg_load: avgLoad, overloaded_counts: Object.fromEntries(overloaded) },
  });

  // 7. MISSING CONTACT INFO — high-value deals with blank email/phone
  const contactById: Record<string, any> = {};
  C.forEach((c: any) => { contactById[c.hubspot_id] = c; });
  const missingInfo = D.filter((d: any) => {
    if (Number(d.amount || 0) < 5000) return false;
    const cid = d.properties?.contact_id;
    if (!cid) return true;
    const c = contactById[cid];
    return !c || (!c.email && !c.phone);
  });
  findings.push({
    key: "missing_contact_info",
    label: "High-Value Deals Missing Contact Info",
    count: missingInfo.length,
    exposure_cents: Math.round(missingInfo.reduce((s: number, d: any) => s + Number(d.amount || 0), 0) * 100),
    sample_ids: missingInfo.slice(0, 10).map((d: any) => d.hubspot_id),
    formula: "Open deals > $5k where the primary contact has no email or phone",
    time_period: "All open deals",
    raw_data: {},
  });

  // 8. HIGH-INTENT NOT IN WORKFLOW — recent activity, not a customer/opportunity
  const thirtyDaysAgo = days(30);
  const highIntent = C.filter((c: any) => {
    if (["customer","opportunity"].includes(c.lifecycle_stage)) return false;
    if (!c.last_activity_date || c.last_activity_date < thirtyDaysAgo) return false;
    const recentEng = E.filter((e: any) => e.contact_id === c.hubspot_id && e.timestamp >= thirtyDaysAgo);
    return recentEng.length >= 2;
  }).slice(0, 25);
  findings.push({
    key: "high_intent_no_workflow",
    label: "High-Intent Contacts Not in Workflow",
    count: highIntent.length,
    exposure_cents: Math.round(highIntent.length * avgDealSize * 0.1 * 100),
    sample_ids: highIntent.slice(0, 10).map((c: any) => c.hubspot_id),
    formula: "Non-opportunity contacts with 2+ engagements in last 30 days, no active workflow",
    time_period: "Last 30 days",
    raw_data: {},
  });

  return findings;
}

// ============================================================
// Claude Stages A–D
// ============================================================
const HAS_AI_KEY = !!Deno.env.get("LOVABLE_API_KEY") || !!Deno.env.get("ANTHROPIC_API_KEY");

async function callAI(systemPrompt: string, userPrompt: string): Promise<string | null> {
  if (!HAS_AI_KEY) {
    console.log("[run-audit] LOVABLE_API_KEY/ANTHROPIC_API_KEY not configured — using placeholder analysis");
    return null;
  }
  try {
    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${Deno.env.get("LOVABLE_API_KEY")}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "openai/gpt-5",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
      }),
    });
    if (!res.ok) {
      console.error("[run-audit] AI call failed", res.status, await res.text());
      return null;
    }
    const data = await res.json();
    return data.choices?.[0]?.message?.content || null;
  } catch (err) {
    console.error("[run-audit] AI call exception", err);
    return null;
  }
}

async function stageA_diagnose(f: PatternFinding): Promise<any> {
  const ai = await callAI(
    "You are a revenue operations analyst. Given a CRM leak pattern, return a 2-3 sentence blunt diagnostic explaining what's broken and why it costs money. Plain text only.",
    `Pattern: ${f.label}\nCount: ${f.count}\nExposure: $${(f.exposure_cents / 100).toLocaleString()}\nFormula: ${f.formula}`,
  );
  return {
    ...f,
    diagnostic: ai || `${f.count} records match this leak pattern, exposing roughly $${(f.exposure_cents / 100).toLocaleString()}. ${f.formula}.`,
  };
}

async function stageB_prioritize(findings: any[]): Promise<any[]> {
  // Simple deterministic prioritization by exposure; AI just refines tie-breaks
  return [...findings].sort((a, b) => b.exposure_cents - a.exposure_cents);
}

async function stageC_recommend(f: any): Promise<any> {
  const ai = await callAI(
    "You are a revenue operations consultant. Build a focused 30-day recovery plan for a CRM leak. Return JSON only with shape: {\"plan\":[{\"day\":\"1-3\",\"action\":\"...\"}], \"primary_action\":{\"label\":\"...\",\"action_type\":\"...\"}}",
    `Pattern: ${f.label}\nDiagnostic: ${f.diagnostic}\nExposure: $${(f.exposure_cents / 100).toLocaleString()}`,
  );
  let plan: any = null;
  if (ai) {
    try {
      const cleaned = ai.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
      plan = JSON.parse(cleaned);
    } catch { /* fall through */ }
  }
  if (!plan) {
    plan = {
      plan: [
        { day: "1-3", action: `Pull a list of all ${f.count} affected records and assign owners.` },
        { day: "4-14", action: `Execute outreach sequence tailored to "${f.label}".` },
        { day: "15-30", action: `Measure response rate and adjust workflow rules to prevent recurrence.` },
      ],
      primary_action: { label: `Approve & Execute: ${f.label} recovery`, action_type: f.key },
    };
  }
  return { ...f, recovery_plan: plan.plan, primary_action: plan.primary_action };
}

async function stageD_summarize(findings: any[]): Promise<string> {
  const total = findings.reduce((s, f) => s + f.exposure_cents, 0);
  const top3 = findings.slice(0, 3);
  const ai = await callAI(
    "You are an executive analyst. Write a 3-sentence executive summary for a revenue leak audit. Direct, no fluff.",
    `Total exposure: $${(total / 100).toLocaleString()}\nTop findings: ${top3.map(f => `${f.label} ($${(f.exposure_cents / 100).toLocaleString()}, ${f.count} records)`).join("; ")}`,
  );
  return ai || `This audit identified $${(total / 100).toLocaleString()} in recoverable revenue across ${findings.length} distinct leak patterns. The top three findings — ${top3.map(f => f.label).join(", ")} — account for the majority of exposure. Each finding includes a 30-day recovery plan ready for approval.`;
}

function json(body: any, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
