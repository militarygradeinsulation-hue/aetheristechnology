## Goal

Give Braden (partner code 963169) a single, partner-only "Partner Onboarding Hub" inside his existing portal that gets him fluent on:

1. **The new plan** — operator is the product, 3 bundles + 2 flagships, dual commission model
2. **Hiring** — how reps apply, how the test gates them, what he's reviewing, his partner override on referred reps
3. **Training** — the rep curriculum he needs to know cold so he can coach
4. **Structure** — Joseph / Operator / Partner / Reps / Clients, who owns what, money flow

Everything is presentation + content (no new business logic, no schema changes). One new tab on the partner side.

## What gets built

### 1. New partner-only tab: "Partner Hub"

- Add a new `id: 'partnerhub'` tab in `src/pages/PortalPage.tsx`'s `tabs` array, `partnerOnly: true`, icon = `Compass` (or `Briefcase`).
- Slot it at the top of the partner view (just under Overview) so it's the first thing Braden sees.
- Auto-route Braden's first visit there: if `isPartner && !localStorage.getItem('partnerhub-seen-v1')` on mount → `setTab('partnerhub')` then set the flag.

### 2. New component: `src/components/portal/PartnerOnboardingHub.tsx`

A single scrollable page broken into 6 collapsible sections (using existing card + chevron pattern from `OperatorPage.tsx`). State: `openSection: string | null`.

**Section A — The New Plan (operator is the product)**
- One paragraph reframing: we don't sell tools, we pair clients with an operator.
- The 5-offer ladder as a clean table:
  - Signal Pack $2,500 · ~6 hrs · entry leak memo
  - Revenue Pack $5,000 · ~14 hrs · sales engine rebuild
  - Operator Suite $10,000 · ~30 hrs · embedded 3 weeks (credits 1:1 to Retainer)
  - 21-Day Revenue Diagnostic $18,500 · FLAGSHIP, fit-call required
  - Implementation Retainer $15,000/mo · FLAGSHIP, 3-mo min, Diagnostic clients only
- Callout box: "What changed vs the old catalog" — single-tool sales are killed, public lineup is bundles + flagships only.

**Section B — Your Commission as Partner**
- Dual model in plain English:
  - Bundles: partner gets **10%** (Signal $250, Revenue $500, Operator Suite $1,000)
  - 21-Day Diagnostic: **$3,000 fixed** per close
  - Implementation Retainer: **$3,000/mo every month** the client stays subscribed
- Worked example: "1 Diagnostic + 6-month Retainer = $3,000 + (6 × $3,000) = $21,000 to you, recurring through month 6."
- Reuse `<FlagshipCommissionPanel audience="partner" />` underneath for the live calculator.
- Referral override line: "+$500/sale, 12-month override on every rep you bring in who closes."

**Section C — The Hiring Funnel**
- Visual 4-step flow (numbered cards):
  1. Rep reads site → takes 25-question test (80% to pass, 5 attempts/day)
  2. Passes test → resume + 150-word pitch unlocks
  3. AI scores fit (6 sections, 6–60 score) → Joseph + Braden review in **Careers Admin**
  4. Approved → code issued → portal access + onboarding curriculum auto-assigned
- Inline buttons: "Open Careers Admin" → `setTab('careers')`, "Open the public Careers page" → `/careers`, "Take the test as a rep would" → `/careers/test`.
- "What you're looking for" checklist pulled from the careers page (B2B closer, hustle, resilience, etc.).

**Section D — Training You Need to Know Cold**
- Bulleted index linking to existing training surfaces inside the portal:
  - Aetheris Academy (onboarding curriculum) → `setTab('onboarding')`
  - 6-Week Bootcamp → `setTab('sprint')` (or wherever it lives)
  - Sales Coach Chat → `setTab('coach')`
  - Team Training (MCQ + AI graded) → `setTab('training')`
  - Rep-Operator Playbook PDF → link to `/Rep-Operator-Playbook.md`
- For each: one sentence on what it teaches and why Braden should personally complete it so he can coach.

**Section E — The Structure (who does what)**
- Org diagram rendered as a simple grid (no library):
  ```
  Joseph (Operator-in-Chief)
      ├─ Braden (Partner — hiring, coaching, overrides)
      │      └─ Reps (closers, code-gated)
      └─ Clients (bundles + flagships)
  ```
- Money flow table for each offer showing Company / Rep / Partner split (mirrors the constants in `payments-webhook/flagshipFixedSplit()` and the bundle 70/20/10 — pull the exact splits from memory `business/pricing`).
- Decision rights: who can approve a hire, who signs SOWs, who handles delivery, who handles client comms post-close.

**Section F — Your First 14 Days as Partner (checklist)**
- 10-item task list with checkboxes (persisted in `localStorage` under `partnerhub-checklist-v1`):
  - Read this hub end-to-end
  - Complete the Rep-Operator Playbook
  - Take the 25-question careers test yourself (you should score 100%)
  - Review the current Careers Admin queue
  - Complete Aetheris Academy modules 1–3
  - Shadow Joseph on 1 Diagnostic fit call
  - Run the commission calculator with 3 deal scenarios
  - Recruit 1 candidate to the test funnel
  - Co-pitch 1 Signal Pack
  - Schedule weekly partner sync with Joseph

### 3. Wire-up

- Import the component in `PortalPage.tsx`, add `case 'partnerhub': return <PartnerOnboardingHub onJump={setTab} />;` in `renderTabBody`.
- `onJump` lets the hub deep-link into other tabs (`careers`, `onboarding`, `coach`, `training`, `commissions`).

## Technical Details

- All copy lives inline in the new component; pricing constants imported from `src/lib/repProducts.ts` and the bundle/flagship splits hardcoded to match `supabase/functions/payments-webhook/index.ts` `flagshipFixedSplit()` so there's a single mental model.
- No new tables, no new edge functions, no schema migration. Checklist state is `localStorage` only (per-browser is fine for one partner).
- Reuses existing tokens (`amber`, `forensic-tile`, `font-display`, `font-mono`) — no design-system changes.
- Gating: tab is `partnerOnly: true`, so reps will never see it. Joseph (admin) sees it too when previewing the partner role.

## Files touched

- **New:** `src/components/portal/PartnerOnboardingHub.tsx`
- **Edited:** `src/pages/PortalPage.tsx` (add tab + case + first-visit auto-route)

## Out of scope

- No changes to the careers funnel, training engine, commission webhook, or pricing.
- No new partner-only data tables. If we later want Joseph to see Braden's checklist progress, that's a follow-up (would need a small `partner_onboarding_progress` table).
