# Self-Improving HubSpot Audit

Make the audit watch itself, score every run, diagnose what's slow or low-quality, and propose (and optionally auto-apply) improvements without you in the loop.

## What you'll get

1. **Every audit run gets a health score** — duration, AI latency, AI errors, pattern coverage, finding quality, exposure plausibility.
2. **A self-analysis pass runs after every audit** — an AI "auditor of the auditor" reads the run's metrics + sample output and writes a diagnosis: what was slow, what was weak, what to change.
3. **Optimization proposals are generated automatically** — concrete changes like "raise stalled-deal threshold from 1.5x → 1.75x", "batch Stage A diagnostics into one AI call", "skip pattern X when count = 0", "switch model from gpt-5 → gemini-flash for Stage A".
4. **A new `/app/audit-health` admin page** shows: trend charts (duration, exposure, finding count over runs), the latest self-diagnosis, and a queue of proposed improvements with **Approve / Reject** buttons.
5. **Approved tuning changes apply themselves** — stored as a config row the audit reads at runtime (thresholds, model choices, enabled patterns, parallelism). No redeploy needed for tuning.
6. **Code-level improvements (new patterns, refactors)** are written by AI into a "proposed patch" record with a diff for you to review in the admin UI; you click Approve and it opens the file change in your next Lovable build (we don't auto-merge code without your click — that's the safety boundary).

## How the loop works

```text
run-audit  ─►  pattern detection  ─►  AI stages  ─►  report
     │                                                   │
     ▼                                                   ▼
   timing + error metrics  ───────────────────►  audit_run_metrics
                                                         │
                                                         ▼
                                            audit-self-analyze (new fn)
                                                         │
                                            ┌────────────┴────────────┐
                                            ▼                         ▼
                                  audit_tuning_proposals     audit_code_proposals
                                  (config knobs)              (code diffs)
                                            │                         │
                                            ▼                         ▼
                                  auto-applied if            shown in admin UI
                                  confidence > 0.8 AND       for manual approve
                                  "auto-apply tuning" ON
```

## Pieces being built

### Database (1 migration)
- `audit_run_metrics` — one row per run: total_ms, per-stage ms, ai_call_count, ai_error_count, ai_total_tokens, patterns_with_zero_findings, health_score (0-100), bottleneck_stage.
- `audit_tuning_config` — single row of live knobs the audit reads: thresholds (stalled multiplier, dead-lead days, slow-followup hours, etc.), per-stage model choice, parallelism, enabled pattern keys, auto_apply_enabled bool.
- `audit_tuning_proposals` — proposed knob changes: field, current_value, proposed_value, reason, expected_impact, confidence, status (pending/approved/rejected/auto_applied), applied_at.
- `audit_code_proposals` — proposed code changes: title, diagnosis, target_file, diff, status. Read-only review; never auto-merged.

### Edge functions
- **`run-audit` (modified)** — read `audit_tuning_config` at start; record per-stage timings + AI metrics into `audit_run_metrics`; trigger `audit-self-analyze` at end via `EdgeRuntime.waitUntil`.
- **`audit-self-analyze` (new)** — pulls the last 1–10 runs + metrics, asks Gemini 2.5 Pro to (a) score the latest run, (b) identify the bottleneck, (c) propose tuning knob changes with confidence, (d) propose code-level improvements (new patterns, refactors). Writes proposals; if `auto_apply_enabled` and confidence ≥ 0.8 and the proposal only touches knobs (not code), applies immediately and stamps `auto_applied`.
- **`audit-apply-proposal` (new)** — admin-only; flips a tuning proposal to approved and updates `audit_tuning_config` atomically.

### Frontend
- **`/app/audit-health` (new admin page)** — three sections:
  1. **Trends**: line charts of duration, finding count, total exposure, health score across last 20 runs.
  2. **Latest self-diagnosis**: the AI's plain-English writeup of what's working/broken, with the bottleneck stage flagged.
  3. **Proposals queue**: tuning proposals with Approve/Reject; code proposals with diff viewer + "Send to Lovable" copy-button (paste into next chat to actually apply the file edit).
- **`RunAuditCard`** gets a small "Health: 87/100 · last run 12s" badge linking to `/app/audit-health`.
- Sidebar gets an "Audit Health" link (admin only).

### Self-analysis prompt (what the AI is told)
- Role: "You are a senior RevOps engineer auditing the HubSpot audit pipeline itself."
- Inputs: last run metrics, last 5 runs' metrics, current tuning config, sample findings.
- Required output (JSON via tool calling): `{ health_score, bottleneck, narrative, tuning_proposals[], code_proposals[] }`.
- Guardrails: never propose disabling a pattern with non-zero recent findings; never propose lowering exposure thresholds below documented business defaults; tuning confidence must be ≥ 0.8 for auto-apply.

## Safety boundaries

- **Tuning knobs auto-apply only when**: `auto_apply_enabled = true` AND `confidence ≥ 0.8` AND the change is within hard min/max bounds defined per knob.
- **Code changes never auto-apply.** They land as proposals you review in `/app/audit-health`. Clicking "Send to Lovable" gives you a one-line prompt to paste in chat to have me execute the patch.
- All proposals (auto-applied or not) are logged with full before/after so you can roll back any tuning change with one click.
- A "Pause self-improvement" master switch sits at the top of `/app/audit-health`.

## Out of scope (can add later)
- Auto-deploying code patches without your click (intentionally excluded).
- A/B testing two tuning configs in parallel.
- Slack/email digest of weekly self-improvement activity.

Approve and I'll build it.