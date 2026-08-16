// Blueprint contract: structured-output schema, validation, Markdown renderer
// and the copy-ready Vibe Coder Master Prompt builder.

export interface Blueprint {
  system_objective: string;
  company_context: string;
  capability_map: Array<{
    root_cause_id: string;
    finding_titles?: string[];
    capability: string;
    classification: "AUTOMATABLE" | "ASSISTED" | "HUMAN_REQUIRED";
    goal: string;
    baseline: string;
    kpi: string;
    target: string;
    owner_role: string;
    priority: number;
    dependencies?: string[];
    estimated_effort: string;
    acceptance_criteria: string[];
    review_cadence: string;
  }>;
  architecture: { summary: string; stack: string[]; services?: string[] };
  routes: Array<{ path: string; purpose: string; roles: string[] }>;
  roles: Array<{ name: string; permissions: string[] }>;
  data_model: Array<{ entity: string; fields: string[]; relationships?: string[] }>;
  integrations: Array<{ name: string; purpose: string; env_vars: string[] }>;
  automations: Array<{ trigger: string; action: string; failure_handling: string }>;
  dashboards: Array<{ view: string; audience: string; metrics: string[] }>;
  checks: Array<{ name: string; evidence_basis: string; threshold: string; alert: string }>;
  forecast: {
    basis: string;
    assumptions: string[];
    scenarios: Array<{ name: "conservative" | "base" | "upside"; recovery_percent: number; rationale: string }>;
  };
  roadmap: Array<{ window: "30" | "60" | "90"; outcomes: string[] }>;
  security: { permissions: string[]; audit_logging: string[]; privacy: string[]; backup: string; rollback: string };
  acceptance_tests: string[];
  definition_of_done: string[];
  file_manifest: Array<{ path: string; purpose: string }>;
  build_sequence: string[];
  design_direction: string;
}

export const BLUEPRINT_SCHEMA = {
  name: "emit_system_blueprint",
  description: "Emit the complete, company-specific system blueprint derived from the Golden Report.",
  parameters: {
    type: "object",
    additionalProperties: false,
    properties: {
      system_objective: { type: "string" },
      company_context: { type: "string" },
      capability_map: {
        type: "array",
        items: {
          type: "object",
          properties: {
            root_cause_id: { type: "string" },
            finding_titles: { type: "array", items: { type: "string" } },
            capability: { type: "string" },
            classification: { type: "string", enum: ["AUTOMATABLE", "ASSISTED", "HUMAN_REQUIRED"] },
            goal: { type: "string" },
            baseline: { type: "string" },
            kpi: { type: "string" },
            target: { type: "string" },
            owner_role: { type: "string" },
            priority: { type: "number" },
            dependencies: { type: "array", items: { type: "string" } },
            estimated_effort: { type: "string" },
            acceptance_criteria: { type: "array", items: { type: "string" } },
            review_cadence: { type: "string" },
          },
          required: ["root_cause_id", "capability", "classification", "goal", "baseline", "kpi", "target", "owner_role", "priority", "estimated_effort", "acceptance_criteria", "review_cadence"],
        },
      },
      architecture: {
        type: "object",
        properties: {
          summary: { type: "string" },
          stack: { type: "array", items: { type: "string" } },
          services: { type: "array", items: { type: "string" } },
        },
        required: ["summary", "stack"],
      },
      routes: {
        type: "array",
        items: {
          type: "object",
          properties: { path: { type: "string" }, purpose: { type: "string" }, roles: { type: "array", items: { type: "string" } } },
          required: ["path", "purpose", "roles"],
        },
      },
      roles: {
        type: "array",
        items: {
          type: "object",
          properties: { name: { type: "string" }, permissions: { type: "array", items: { type: "string" } } },
          required: ["name", "permissions"],
        },
      },
      data_model: {
        type: "array",
        items: {
          type: "object",
          properties: {
            entity: { type: "string" },
            fields: { type: "array", items: { type: "string" } },
            relationships: { type: "array", items: { type: "string" } },
          },
          required: ["entity", "fields"],
        },
      },
      integrations: {
        type: "array",
        items: {
          type: "object",
          properties: {
            name: { type: "string" },
            purpose: { type: "string" },
            env_vars: { type: "array", items: { type: "string" } },
          },
          required: ["name", "purpose", "env_vars"],
        },
      },
      automations: {
        type: "array",
        items: {
          type: "object",
          properties: { trigger: { type: "string" }, action: { type: "string" }, failure_handling: { type: "string" } },
          required: ["trigger", "action", "failure_handling"],
        },
      },
      dashboards: {
        type: "array",
        items: {
          type: "object",
          properties: { view: { type: "string" }, audience: { type: "string" }, metrics: { type: "array", items: { type: "string" } } },
          required: ["view", "audience", "metrics"],
        },
      },
      checks: {
        type: "array",
        items: {
          type: "object",
          properties: { name: { type: "string" }, evidence_basis: { type: "string" }, threshold: { type: "string" }, alert: { type: "string" } },
          required: ["name", "evidence_basis", "threshold", "alert"],
        },
      },
      forecast: {
        type: "object",
        properties: {
          basis: { type: "string" },
          assumptions: { type: "array", items: { type: "string" } },
          scenarios: {
            type: "array",
            items: {
              type: "object",
              properties: {
                name: { type: "string", enum: ["conservative", "base", "upside"] },
                recovery_percent: { type: "number" },
                rationale: { type: "string" },
              },
              required: ["name", "recovery_percent", "rationale"],
            },
          },
        },
        required: ["basis", "assumptions", "scenarios"],
      },
      roadmap: {
        type: "array",
        items: {
          type: "object",
          properties: { window: { type: "string", enum: ["30", "60", "90"] }, outcomes: { type: "array", items: { type: "string" } } },
          required: ["window", "outcomes"],
        },
      },
      security: {
        type: "object",
        properties: {
          permissions: { type: "array", items: { type: "string" } },
          audit_logging: { type: "array", items: { type: "string" } },
          privacy: { type: "array", items: { type: "string" } },
          backup: { type: "string" },
          rollback: { type: "string" },
        },
        required: ["permissions", "audit_logging", "privacy", "backup", "rollback"],
      },
      acceptance_tests: { type: "array", items: { type: "string" } },
      definition_of_done: { type: "array", items: { type: "string" } },
      file_manifest: {
        type: "array",
        items: {
          type: "object",
          properties: { path: { type: "string" }, purpose: { type: "string" } },
          required: ["path", "purpose"],
        },
      },
      build_sequence: { type: "array", items: { type: "string" } },
      design_direction: { type: "string" },
    },
    required: [
      "system_objective", "company_context", "capability_map", "architecture", "routes", "roles",
      "data_model", "integrations", "automations", "dashboards", "checks", "forecast", "roadmap",
      "security", "acceptance_tests", "definition_of_done", "file_manifest", "build_sequence", "design_direction",
    ],
  },
} as const;

export interface ValidationResult {
  ok: boolean;
  errors: string[];
  warnings: string[];
  coverage: { expected: number; covered: number; missing: string[]; duplicated: string[] };
}

const SECRET_PATTERNS = [
  /sk-[A-Za-z0-9]{16,}/,
  /AKIA[0-9A-Z]{12,}/,
  /eyJ[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{10,}/,
  /-----BEGIN [A-Z ]*PRIVATE KEY-----/,
];
const FORBIDDEN_CURRENCY = /€|£|¥|₹|\b(EUR|GBP|JPY|CAD|AUD)\b/;
const PLACEHOLDER = /\b(TODO|FIXME|TBD|coming soon|lorem ipsum|placeholder here)\b/i;

const REQUIRED_ARRAYS: Array<keyof Blueprint> = [
  "capability_map", "routes", "roles", "data_model", "integrations", "automations",
  "dashboards", "checks", "roadmap", "acceptance_tests", "definition_of_done",
  "file_manifest", "build_sequence",
];

export function validateBlueprint(
  bp: Blueprint,
  ctx: { rootCauseIds: string[]; canonical: { low: number; high: number } | null },
): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  for (const key of REQUIRED_ARRAYS) {
    const v = bp[key] as unknown;
    if (!Array.isArray(v) || v.length === 0) errors.push(`Missing or empty section: ${String(key)}`);
  }
  if (!bp.system_objective) errors.push("Missing system_objective");
  if (!bp.architecture?.summary) errors.push("Missing architecture summary");
  if (!bp.forecast?.scenarios?.length) errors.push("Missing forecast scenarios");
  if (!bp.security?.backup || !bp.security?.rollback) errors.push("Missing backup/rollback requirements");

  // Coverage: every root cause exactly once.
  const seen = new Map<string, number>();
  for (const c of bp.capability_map || []) {
    seen.set(c.root_cause_id, (seen.get(c.root_cause_id) || 0) + 1);
  }
  const missing = ctx.rootCauseIds.filter((id) => !seen.has(id));
  const duplicated = [...seen.entries()].filter(([, n]) => n > 1).map(([id]) => id);
  if (missing.length) errors.push(`Root causes not covered: ${missing.join(", ")}`);
  if (duplicated.length) errors.push(`Root causes covered more than once: ${duplicated.join(", ")}`);
  const extra = [...seen.keys()].filter((id) => !ctx.rootCauseIds.includes(id));
  if (extra.length) warnings.push(`Capabilities reference unknown root causes: ${extra.join(", ")}`);

  const blob = JSON.stringify(bp);

  if (SECRET_PATTERNS.some((re) => re.test(blob))) errors.push("Output appears to contain a secret or credential");
  if (FORBIDDEN_CURRENCY.test(blob)) errors.push("Non-USD currency detected — USD only");
  if (PLACEHOLDER.test(blob)) errors.push("Output contains TODO/placeholder text");

  // Financial parity: only the canonical range may appear as an annual total.
  const dollars = [...blob.matchAll(/\$\s?([\d,]{4,})/g)].map((m) => Number(m[1].replace(/,/g, ""))).filter(Number.isFinite);
  if (!ctx.canonical) {
    if (dollars.length) errors.push("Report has no canonical priced range, but the blueprint states dollar amounts");
  } else {
    const { low, high } = ctx.canonical;
    for (const d of dollars) {
      if (d > high * 1.001) {
        errors.push(`Dollar figure $${d.toLocaleString()} exceeds the canonical annual high of $${high.toLocaleString()}`);
        break;
      }
      if (d < low * 0.05) warnings.push(`Small dollar figure $${d.toLocaleString()} is not tied to the canonical ledger`);
    }
  }

  for (const s of bp.forecast?.scenarios || []) {
    if (!(s.recovery_percent >= 0 && s.recovery_percent <= 100)) {
      errors.push(`Forecast scenario "${s.name}" has an impossible recovery percent`);
    }
  }
  const names = new Set((bp.forecast?.scenarios || []).map((s) => s.name));
  for (const n of ["conservative", "base", "upside"]) {
    if (!names.has(n as never)) errors.push(`Forecast missing the ${n} scenario`);
  }

  for (const i of bp.integrations || []) {
    for (const v of i.env_vars || []) {
      if (!/^[A-Z0-9_]+$/.test(v)) errors.push(`Integration "${i.name}" env var "${v}" is not a placeholder name`);
    }
  }
  if ((bp.capability_map || []).every((c) => c.classification === "AUTOMATABLE") && (bp.capability_map || []).length > 3) {
    warnings.push("Every capability is marked AUTOMATABLE — verify human-dependent work is not being over-promised");
  }

  return {
    ok: errors.length === 0,
    errors,
    warnings,
    coverage: { expected: ctx.rootCauseIds.length, covered: seen.size, missing, duplicated },
  };
}

/* ─────────────────────────── renderers ─────────────────────────── */

const usd = (n: number) => `$${Math.round(n).toLocaleString("en-US")}`;

type Ctx = Record<string, any>;

function money(ctx: Ctx): string {
  const f = ctx.canonical_financials || {};
  if (typeof f.annual_low !== "number") return "No canonical priced range in this report.";
  return `${usd(f.annual_low)} – ${usd(f.annual_high)} annual revenue leakage (canonical, ${f.priced_leak_count} priced leaks)`;
}

export function blueprintToMarkdown(bp: Blueprint, ctx: Ctx, validation: ValidationResult): string {
  const c = ctx.company || {};
  const L: string[] = [];
  L.push(`# System Blueprint — ${c.name}`);
  L.push(`> ${c.website || c.domain || ""}${c.industry ? ` · ${c.industry}` : ""}${c.location ? ` · ${c.location}` : ""}`);
  L.push(`\n**Canonical exposure:** ${money(ctx)}`);
  L.push(`\n## System Objective\n${bp.system_objective}`);
  L.push(`\n## Company Context\n${bp.company_context}`);

  L.push(`\n## Capability Map (root cause → remediation)`);
  for (const cap of bp.capability_map || []) {
    L.push(`\n### ${cap.capability}  \`${cap.classification}\``);
    L.push(`- Root cause: \`${cap.root_cause_id}\`${cap.finding_titles?.length ? ` — ${cap.finding_titles.join("; ")}` : ""}`);
    L.push(`- Goal: ${cap.goal}`);
    L.push(`- Baseline: ${cap.baseline}`);
    L.push(`- KPI: ${cap.kpi} → Target: ${cap.target}`);
    L.push(`- Owner: ${cap.owner_role} · Priority ${cap.priority} · Effort ${cap.estimated_effort} · Review ${cap.review_cadence}`);
    if (cap.dependencies?.length) L.push(`- Dependencies: ${cap.dependencies.join(", ")}`);
    L.push(`- Acceptance: ${(cap.acceptance_criteria || []).map((a) => `\n  - ${a}`).join("")}`);
  }

  L.push(`\n## Architecture\n${bp.architecture?.summary}`);
  L.push(`\n**Stack:** ${(bp.architecture?.stack || []).join(", ")}`);
  if (bp.architecture?.services?.length) L.push(`**Services:** ${bp.architecture.services.join(", ")}`);

  L.push(`\n## Routes`);
  for (const r of bp.routes || []) L.push(`- \`${r.path}\` — ${r.purpose} _(${r.roles.join(", ")})_`);

  L.push(`\n## Roles & Permissions`);
  for (const r of bp.roles || []) L.push(`- **${r.name}**: ${r.permissions.join(", ")}`);

  L.push(`\n## Data Model`);
  for (const e of bp.data_model || []) {
    L.push(`- **${e.entity}**: ${e.fields.join(", ")}${e.relationships?.length ? ` — ${e.relationships.join("; ")}` : ""}`);
  }

  L.push(`\n## Integrations & Environment`);
  for (const i of bp.integrations || []) L.push(`- **${i.name}** — ${i.purpose} · env: ${i.env_vars.map((v) => `\`${v}\``).join(", ")}`);

  L.push(`\n## Automations`);
  for (const a of bp.automations || []) L.push(`- **When** ${a.trigger} → ${a.action}. On failure: ${a.failure_handling}`);

  L.push(`\n## Dashboards`);
  for (const d of bp.dashboards || []) L.push(`- **${d.view}** (${d.audience}): ${d.metrics.join(", ")}`);

  L.push(`\n## Checks & Alerts`);
  for (const k of bp.checks || []) L.push(`- **${k.name}** — basis: ${k.evidence_basis} · threshold: ${k.threshold} · alert: ${k.alert}`);

  L.push(`\n## Forecast\n${bp.forecast?.basis}`);
  L.push(`\n**Assumptions:**${(bp.forecast?.assumptions || []).map((a) => `\n- ${a}`).join("")}`);
  const f = ctx.canonical_financials || {};
  for (const s of bp.forecast?.scenarios || []) {
    const range = typeof f.annual_low === "number"
      ? ` → ${usd(f.annual_low * s.recovery_percent / 100)} – ${usd(f.annual_high * s.recovery_percent / 100)} recovered annually`
      : "";
    L.push(`- **${s.name}** (${s.recovery_percent}% of canonical exposure)${range}: ${s.rationale}`);
  }

  L.push(`\n## 30/60/90 Roadmap`);
  for (const r of (bp.roadmap || []).slice().sort((a, b) => Number(a.window) - Number(b.window))) {
    L.push(`\n**Day ${r.window}**${r.outcomes.map((o) => `\n- ${o}`).join("")}`);
  }

  L.push(`\n## Security & Governance`);
  L.push(`- Permissions: ${bp.security?.permissions?.join(", ")}`);
  L.push(`- Audit logging: ${bp.security?.audit_logging?.join(", ")}`);
  L.push(`- Privacy: ${bp.security?.privacy?.join(", ")}`);
  L.push(`- Backup: ${bp.security?.backup}`);
  L.push(`- Rollback: ${bp.security?.rollback}`);

  L.push(`\n## Acceptance Tests`);
  for (const t of bp.acceptance_tests || []) L.push(`- ${t}`);
  L.push(`\n## Definition of Done`);
  for (const t of bp.definition_of_done || []) L.push(`- ${t}`);

  L.push(`\n## File Manifest`);
  for (const m of bp.file_manifest || []) L.push(`- \`${m.path}\` — ${m.purpose}`);

  L.push(`\n## Build Sequence`);
  (bp.build_sequence || []).forEach((s, i) => L.push(`${i + 1}. ${s}`));

  L.push(`\n## Design Direction\n${bp.design_direction}`);

  L.push(`\n---\n_Validation: ${validation.ok ? "PASSED" : "FAILED"} · root causes covered ${validation.coverage.covered}/${validation.coverage.expected}_`);
  if (validation.errors.length) L.push(`\n**Errors:**${validation.errors.map((e) => `\n- ${e}`).join("")}`);
  if (validation.warnings.length) L.push(`\n**Warnings:**${validation.warnings.map((e) => `\n- ${e}`).join("")}`);

  return L.join("\n");
}

export function buildMasterPrompt(bp: Blueprint, ctx: Ctx): string {
  const c = ctx.company || {};
  const P: string[] = [];
  P.push(`Build a production-ready internal operating system for ${c.name}${c.domain ? ` (${c.domain})` : ""}.`);
  P.push(`\nCONTEXT\n${bp.company_context}\n\nOBJECTIVE\n${bp.system_objective}`);
  P.push(`\nThis specification comes from a forensic revenue-leak audit. Canonical exposure: ${money(ctx)}. Do not restate, recompute or inflate that figure anywhere in the build.`);

  P.push(`\nSTACK\n${(bp.architecture?.stack || []).join(", ")}\n${bp.architecture?.summary}`);

  P.push(`\nWHAT THE SYSTEM MUST FIX (each item is a real, evidenced leak)`);
  for (const cap of bp.capability_map || []) {
    P.push(`- [${cap.classification}] ${cap.capability} — goal: ${cap.goal}; KPI: ${cap.kpi} (baseline ${cap.baseline} → target ${cap.target}); owner: ${cap.owner_role}; review ${cap.review_cadence}.`);
  }
  P.push(`Items marked HUMAN_REQUIRED must be surfaced as tracked tasks with owners and due dates — do NOT automate them. ASSISTED items must present a recommendation with an explicit human approval step.`);

  P.push(`\nROUTES\n${(bp.routes || []).map((r) => `- ${r.path} — ${r.purpose} (${r.roles.join(", ")})`).join("\n")}`);
  P.push(`\nROLES\n${(bp.roles || []).map((r) => `- ${r.name}: ${r.permissions.join(", ")}`).join("\n")}`);
  P.push(`\nDATA MODEL\n${(bp.data_model || []).map((e) => `- ${e.entity}(${e.fields.join(", ")})${e.relationships?.length ? ` :: ${e.relationships.join("; ")}` : ""}`).join("\n")}`);
  P.push(`\nINTEGRATIONS (env var names only — never hardcode secrets)\n${(bp.integrations || []).map((i) => `- ${i.name}: ${i.purpose} [${i.env_vars.join(", ")}]`).join("\n")}`);
  P.push(`\nAUTOMATIONS\n${(bp.automations || []).map((a) => `- On ${a.trigger}: ${a.action}. Failure: ${a.failure_handling}`).join("\n")}`);
  P.push(`\nDASHBOARDS\n${(bp.dashboards || []).map((d) => `- ${d.view} (${d.audience}): ${d.metrics.join(", ")}`).join("\n")}`);
  P.push(`\nCHECKS & ALERTS\n${(bp.checks || []).map((k) => `- ${k.name}: ${k.threshold} → ${k.alert}`).join("\n")}`);
  P.push(`\nFORECASTING\n${bp.forecast?.basis}\nAssumptions: ${(bp.forecast?.assumptions || []).join("; ")}\nScenarios: ${(bp.forecast?.scenarios || []).map((s) => `${s.name} ${s.recovery_percent}%`).join(", ")}. Forecasts are scenarios applied to the canonical audited range and must be labelled as estimates, never guarantees.`);
  P.push(`\nSECURITY\nPermissions: ${bp.security?.permissions?.join(", ")}. Audit logging: ${bp.security?.audit_logging?.join(", ")}. Privacy: ${bp.security?.privacy?.join(", ")}. Backup: ${bp.security?.backup}. Rollback: ${bp.security?.rollback}. Enable row level security on every table and scope reads to the authenticated user's role.`);
  P.push(`\nDESIGN DIRECTION\n${bp.design_direction}`);
  P.push(`\nFILE MANIFEST (build all of these)\n${(bp.file_manifest || []).map((m) => `- ${m.path} — ${m.purpose}`).join("\n")}`);
  P.push(`\nBUILD SEQUENCE\n${(bp.build_sequence || []).map((s, i) => `${i + 1}. ${s}`).join("\n")}`);
  P.push(`\nTEST PLAN\n${(bp.acceptance_tests || []).map((t) => `- ${t}`).join("\n")}`);
  P.push(`\nDEFINITION OF DONE\n${(bp.definition_of_done || []).map((t) => `- ${t}`).join("\n")}`);
  P.push(`\nCONSTRAINTS
- Ship working code. No TODO comments, no stub functions, no "coming soon" screens.
- All money renders in US Dollars with a $ prefix.
- Never invent data: empty states must say so plainly.
- Every secret is an environment variable placeholder; never commit a credential.
- Do not deploy, purchase, or change external accounts automatically.
- Seed nothing fake into production tables; provide a clearly separated demo seed if needed.`);
  return P.join("\n");
}
