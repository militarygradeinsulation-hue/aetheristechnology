import { describe, it, expect } from "vitest";
import {
  validateBlueprint,
  buildMasterPrompt,
  blueprintToMarkdown,
  type Blueprint,
} from "../../supabase/functions/golden-system-blueprint/blueprint.ts";

const base = (): Blueprint => ({
  system_objective: "Stop the lead leak.",
  company_context: "Commercial roofing contractor in Indianapolis.",
  capability_map: [
    {
      root_cause_id: "rc_1",
      capability: "Lead response engine",
      classification: "AUTOMATABLE",
      goal: "Respond to every inbound lead in under 5 minutes",
      baseline: "26 hours median",
      kpi: "Median first-response time",
      target: "< 5 minutes",
      owner_role: "Sales lead",
      priority: 1,
      estimated_effort: "2 weeks",
      acceptance_criteria: ["Every lead has a logged first-touch timestamp"],
      review_cadence: "Weekly",
    },
    {
      root_cause_id: "rc_2",
      capability: "Brand message alignment workflow",
      classification: "HUMAN_REQUIRED",
      goal: "One promise across every page",
      baseline: "4 conflicting promises",
      kpi: "Contradictions open",
      target: "0",
      owner_role: "Owner",
      priority: 2,
      estimated_effort: "1 week",
      acceptance_criteria: ["Owner signs off on the single promise"],
      review_cadence: "Monthly",
    },
  ],
  architecture: { summary: "React + Postgres operations console.", stack: ["React", "Postgres"] },
  routes: [{ path: "/dashboard", purpose: "Executive view", roles: ["owner"] }],
  roles: [{ name: "owner", permissions: ["read", "write"] }],
  data_model: [{ entity: "lead", fields: ["id", "source", "first_touch_at"] }],
  integrations: [{ name: "Email", purpose: "Alerts", env_vars: ["RESEND_API_KEY"] }],
  automations: [{ trigger: "lead created", action: "notify rep", failure_handling: "retry 3x then alert" }],
  dashboards: [{ view: "Executive", audience: "Owner", metrics: ["Median response time"] }],
  checks: [{ name: "Lead response SLA", evidence_basis: "26h median in report", threshold: "> 5 min", alert: "Slack + email" }],
  forecast: {
    basis: "Canonical audited leak range",
    assumptions: ["Rep capacity unchanged"],
    scenarios: [
      { name: "conservative", recovery_percent: 15, rationale: "Only response time fixed" },
      { name: "base", recovery_percent: 35, rationale: "Response + follow-up" },
      { name: "upside", recovery_percent: 60, rationale: "Full remediation adopted" },
    ],
  },
  roadmap: [{ window: "30", outcomes: ["Lead capture live"] }],
  security: {
    permissions: ["RLS per role"], audit_logging: ["All writes"], privacy: ["No PII in logs"],
    backup: "Daily snapshots", rollback: "Versioned migrations",
  },
  acceptance_tests: ["Lead created triggers alert under 60s"],
  definition_of_done: ["All routes shipped and tested"],
  file_manifest: [{ path: "src/pages/Dashboard.tsx", purpose: "Executive view" }],
  build_sequence: ["Schema", "Auth", "Dashboard"],
  design_direction: "Dark, restrained, executive.",
});

const ctx = { rootCauseIds: ["rc_1", "rc_2"], canonical: { low: 100000, high: 400000 } };

describe("blueprint validation", () => {
  it("passes a complete, covered blueprint", () => {
    const r = validateBlueprint(base(), ctx);
    expect(r.errors).toEqual([]);
    expect(r.ok).toBe(true);
    expect(r.coverage).toMatchObject({ expected: 2, covered: 2 });
  });

  it("fails when a root cause is not covered", () => {
    const bp = base();
    bp.capability_map = [bp.capability_map[0]];
    const r = validateBlueprint(bp, ctx);
    expect(r.ok).toBe(false);
    expect(r.errors.join(" ")).toContain("rc_2");
  });

  it("fails when a root cause is covered twice", () => {
    const bp = base();
    bp.capability_map.push({ ...bp.capability_map[0] });
    const r = validateBlueprint(bp, ctx);
    expect(r.ok).toBe(false);
    expect(r.coverage.duplicated).toContain("rc_1");
  });

  it("rejects dollar figures above the canonical annual high", () => {
    const bp = base();
    bp.system_objective = "Recover $900,000 annually.";
    const r = validateBlueprint(bp, ctx);
    expect(r.ok).toBe(false);
    expect(r.errors.join(" ")).toContain("canonical annual high");
  });

  it("rejects any dollar claim when the report has no canonical range", () => {
    const bp = base();
    bp.company_context = "Leaking $250,000 a year.";
    const r = validateBlueprint(bp, { rootCauseIds: ctx.rootCauseIds, canonical: null });
    expect(r.ok).toBe(false);
  });

  it("rejects non-USD currency", () => {
    const bp = base();
    bp.company_context = "Leaking €120.000 per year.";
    expect(validateBlueprint(bp, ctx).ok).toBe(false);
  });

  it("rejects TODO placeholders and leaked secrets", () => {
    const todo = base();
    todo.build_sequence = ["TODO: figure out schema"];
    expect(validateBlueprint(todo, ctx).ok).toBe(false);

    const secret = base();
    secret.integrations = [{ name: "OpenAI", purpose: "AI", env_vars: ["OPENAI_API_KEY"] }];
    secret.company_context = "key sk-abcdefghijklmnopqrstuvwx";
    expect(validateBlueprint(secret, ctx).ok).toBe(false);
  });

  it("rejects a missing forecast scenario and impossible recovery", () => {
    const bp = base();
    bp.forecast.scenarios = [{ name: "base", recovery_percent: 180, rationale: "x" }];
    const r = validateBlueprint(bp, ctx);
    expect(r.ok).toBe(false);
    expect(r.errors.join(" ")).toContain("conservative");
  });

  it("rejects non-placeholder env var names", () => {
    const bp = base();
    bp.integrations = [{ name: "Email", purpose: "Alerts", env_vars: ["re_live_abc123"] }];
    expect(validateBlueprint(bp, ctx).ok).toBe(false);
  });
});

describe("blueprint renderers", () => {
  const renderCtx = {
    company: { name: "Acme Roofing", domain: "acme.com" },
    canonical_financials: { annual_low: 100000, annual_high: 400000, priced_leak_count: 6 },
  };

  it("master prompt carries context, manifest, canonical money and constraints", () => {
    const p = buildMasterPrompt(base(), renderCtx);
    expect(p).toContain("Acme Roofing");
    expect(p).toContain("$100,000 – $400,000");
    expect(p).toContain("src/pages/Dashboard.tsx");
    expect(p).toContain("No TODO comments");
    expect(p).toContain("HUMAN_REQUIRED");
  });

  it("markdown reports coverage and never invents a total", () => {
    const md = blueprintToMarkdown(base(), renderCtx, validateBlueprint(base(), ctx));
    expect(md).toContain("# System Blueprint — Acme Roofing");
    expect(md).toContain("root causes covered 2/2");
    expect(md).not.toMatch(/€|£|¥/);
  });
});
