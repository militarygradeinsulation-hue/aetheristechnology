# Golden Report Credit Guard

## Incident

- **Date:** 2026-10-05
- **Impact:** Background drip automation consumed AI credits by generating full Golden Reports nobody requested.

## Root cause

- `generate-drip-batch` ran every 2 hours and processed up to 10 prospects per run, automatically launching a full Golden Report (`forensic-scan-all`) for each.
- When a prospect had no website, the prospect's email domain was sometimes treated as the company website, so shared, ISP and education mail domains were scanned.
- `process-drip` replaced bounced prospects by invoking `generate-drip-batch`, which created more reports.

## Observed evidence

- 193 scans in 14 days; 176 (~91%) came from internal automation.
- Automated scans included shared/ISP/education domains rather than real company websites.
- Lovable AI returned 402 "not enough credits" errors.

## Production remediation

- Removed the three scheduler jobs: `generate-drip-batch`, `process-drip-2h`, `process-drip-sends`.
- Changed 3,195 imported/processing drip prospects to `paused_credit_guard`.
- Replaced `generate-drip-batch` with a hard-disabled stub (`AUTOMATIC_GOLDEN_REPORTS_DISABLED = true`) that never calls `forensic-scan-all`.
- Removed bounce-replacement generation from `process-drip`.

## Current invariant

Drip and background automation must never create a Golden Report. Golden Reports are deliberate and manual only, through the existing server-side authorized path in `forensic-scan-all` (admin, service role, or the allowlisted runner portal codes).

The `Golden Report credit guard` GitHub workflow enforces this statically. `CODEOWNERS` marks the protected paths for `@militarygradeinsulation-hue` review; making that review mandatory requires a GitHub branch protection or ruleset rule.

## Re-enable checklist

Automatic report generation may only return when **all** of these are true:

1. Explicit written approval from the project owner.
2. Scan target is a verified company website source, never derived from a contact email domain.
3. Duplicate reuse: an existing completed report for the normalized domain is reused instead of re-scanning.
4. A hard daily budget / circuit breaker that stops generation when reached.
5. Provider/model usage logging for every generated report.
6. A successful dry-run that shows targets and expected cost without generating reports.
7. Updated regression coverage and an updated guard workflow.

No API keys, tokens or secret values belong in this document.
