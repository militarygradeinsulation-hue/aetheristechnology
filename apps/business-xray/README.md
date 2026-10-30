# Aetheris Business X-Ray

> Find where your business may be losing money — and what to investigate first.

A privacy-first, client-side business diagnostic by **Aetheris Technology**. Customers answer 13–18 questions (about 4 minutes), and receive a People / Process / Systems friction map, a conservative low/base/high range of *possible* annual opportunity, three evidence-linked priorities, data to collect for verification, and a 30-day plan — printable as a 3-page PDF and downloadable as JSON.

**v1 has no backend, database, auth, payments, analytics or AI calls.** Everything runs in the browser and state lives in memory only (closing the tab clears it). $0 recurring software cost beyond static hosting.

---

## What it is / is not

| It is | It is not |
| --- | --- |
| A structured way to decide what to measure first | A financial audit, accounting review or valuation |
| Estimates from self-reported answers + explicit assumptions | Verified losses or guaranteed savings |
| An operational diagnostic | A psychometric or personality assessment |

Every figure carries one of three evidence labels:

- **SELF-REPORTED** — what the customer entered.
- **ESTIMATED** — computed by the engine from self-reported inputs and listed assumptions.
- **VERIFIED** — checked against records by a person. **The free X-Ray never produces verified items** (`verifiedCount: 0`).

When inputs are missing, the engine returns **"insufficient information"** rather than a guess.

---

## Project layout

```text
src/
  lib/xray/              Pure TypeScript domain logic — no React, no browser APIs
    types.ts             Shared types (Answers, Assessment, Finding, …)
    questions.ts         Question bank, steps, conditional branches (showIf), pruneHidden
    validation.ts        Per-question / per-step validation
    assumptions.ts       Every non-customer number, documented, with bounds
    engine.ts            computeAssessment() — deterministic calculation & ranking
    format.ts            Display rounding and labels
    export.ts            Customer JSON export (schema aetheris.business-xray/v1)
    enquiry.ts           Direct-send payload, validation and optional summary
    sample.ts            Fictional demo business (always labelled Demo)
    store.ts             In-memory session store (no persistence)
    *.test.ts            Vitest tests for the engine, boundaries, zero-data case
  components/xray/       Questionnaire, report pages, charts, assumptions editor
  components/site/       Header/footer
  config/site.ts         Brand copy, enquiry email address, indicative tiers
  routes/
    index.tsx            Public landing page (/)
    xray.tsx             Questionnaire + report (/xray, /xray?demo=true)
    verify.tsx           Direct-send enquiry with name/email/phone/LinkedIn/URL (/verify)
```

Business logic never imports from components. Components never compute figures themselves — they call `computeAssessment()`.

---

## Calculation method

All in `src/lib/xray/engine.ts`. Same inputs ⇒ identical output (no `Date`, no randomness).

1. **Prune** answers to questions hidden by conditional branches.
2. **Labour components** (weekly friction hours → annual hours, `× weeksPerYear`):
   - Approvals = items/week × chasing-minutes-per-item(wait) ÷ 60 — staff chase time only, *not* the cost of delay.
   - Handoffs = people × minutes-per-person(chasing level) × factor(handoffs/job) ÷ 60.
   - Repetitive entry = customer's own hours/week.
   - Rework = customer's own hours/week (only asked when mistakes are weekly/daily).
3. **Overlap cap** — total labour hours are capped at `capacityCapPct` of team hours; if exceeded, all labour components scale down proportionally.
4. **Value** = annual hours × hourly cost × recovery % (low/base/high).
5. **Enquiries** (only with a sale value) = enquiries/yr × uplift % × speed factor × sale value × gross margin %. Gross profit, never revenue.
6. **Totals** = sum of distinct components. Tool sprawl is *scored but not priced* to avoid double-counting with repetitive entry.
7. **Scores** — each dimension = mean of mapped 0–100 signals; `null` → "insufficient"; `< 2` signals → flagged `limited`.
8. **Findings** — candidates ranked by 50% severity + 50% relative value (+10 if it matches the stated concern); top 3 kept.
9. **Plan** — four weeks derived from the top findings: measure → map → trial a no-cost change → re-measure and decide.

All defaults live in `DEFAULT_ASSUMPTIONS` with a human explanation in `ASSUMPTION_GROUPS`. Customers can edit any of them in the report.

Run tests: `bunx vitest run` (or `npm test`).

---

## GitHub-first development strategy

1. Turn on GitHub sync in Lovable (Project settings → Git). Lovable creates a new private repo.
2. Do iterative work directly in GitHub (local clone, PRs, CI). Commits to the synced branch flow back to Lovable automatically.
3. Keep the synced branch always deployable: `npm test` and `npm run build` must pass before merge.
4. Use feature branches + PRs; never force-push or rewrite pushed history on the synced branch.
5. Change the engine only with accompanying tests; bump `ENGINE_VERSION` when outputs change so exported JSON is traceable.
6. Edit copy, prices and the enquiry address in `src/config/site.ts` only.
7. Suggested CI (GitHub Actions): `bun install && bunx vitest run && bun run build`.

---

## Future integration contracts (NOT implemented — no live connections exist)

The JSON export (`schema: "aetheris.business-xray/v1"`) is the integration boundary. Future systems should consume or produce data in these shapes rather than coupling to UI code.

### (a) Golden Report reports — *future*
- **Direction:** X-Ray → Golden Report.
- **Input:** `XRayExport` (see `src/lib/xray/export.ts`), specifically `assessment.findings`, `assessment.components`, `assessment.assumptions`.
- **Contract:** Golden Report may upgrade evidence items from `SELF_REPORTED`/`ESTIMATED` to `VERIFIED` only with an attached source reference (`{ source, documentId, reviewer, reviewedAt }`). It must never alter the original X-Ray values; it appends a verification layer.

### (b) Authorized Mindprint scans — *future*
- **Direction:** Mindprint → X-Ray (read-only, with explicit customer authorization).
- **Contract:** Only aggregate, non-identifying operational signals (e.g. `toolCount`, `toolsConnected`) may pre-fill answers, each tagged with its source and still shown to the customer for confirmation. No individual employee data and no psychometric claims enter the X-Ray.

### (c) Aetheris Command CRM — *future*
- **Direction:** X-Ray → CRM, only when a customer chooses to send an enquiry.
- **Contract:** A lead record `{ tier, businessName?, contactName?, contactEmail, summaryText, exportSchema, engineVersion, demo }`. The existing Aetheris site now has an on-page, explicit-consent form that calls its fixed-recipient `notify-contact-submission` server function. In the standalone app, that same function can be called only when public Supabase endpoint configuration is supplied; otherwise visitors use the hosted Aetheris on-page form. No raw scan answers are sent without the person's opt-in summary checkbox. The website backend owns the inbox and sender credentials.

---

## Before launch checklist

- [ ] Confirm `SITE.enquiryEmail` in `src/config/site.ts` is the correct inbox.
- [ ] Review indicative tier copy and prices with Aetheris Technology.
- [ ] Review default assumptions against your own client data.