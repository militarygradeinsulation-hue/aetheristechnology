## Goal

Make every "new" tool you've added recently (1M IQ Innovations #1–#10, #11–#20, #31–#40, plus the two missing monthly variants) runnable for free from **Admin → Forensics Systems**, just like the existing 13 systems. No Stripe, no checkout — admin-only, gated by `is_admin`.

## Why it isn't working today

The admin panel (`AdminForensicsSystemsPanel.tsx`) lists tools by iterating `FORENSICS_SYSTEMS` from `src/lib/forensicsSystems.ts`. That array still only contains the original 13 systems. The 26 new priceIds in `COMING_SOON_PRICE_IDS` have no intake schema and no server-side AI prompt, so they can't run.

Two things are needed for each new tool:
1. **Client**: an entry in `FORENSICS_SYSTEMS` (title + tier + intake fields) so it shows up as a tile in the admin panel.
2. **Server**: an entry in `SYSTEM_SPECS` (`supabase/functions/_shared/system-prompts.ts`) with `title`, `intake`, `systemPrompt`, and `userPrompt` so `admin-run-system` can generate the deliverable.

## Changes

### 1. `src/lib/forensicsSystems.ts`
Add `FORENSICS_SYSTEMS` entries for the 26 new tools, grouped under three new tiers so the admin UI sections them cleanly:

- **Tier "1M IQ Innovations · Core"** (10 tools): Obsession Engine, Revenue Leak Detector, Messaging Psychologist, Opportunity Radar, Death Wish Detector, Sales Psychography Builder, Market Timing Oracle, Unfair Advantage Detector, LTV Maximizer, PMF Predictor.
- **Tier "1M IQ Innovations · Ops Intel"** (7 tools): Conversation Intelligence, Deal Momentum Predictor, Competitive Stealing Blueprint, Pricing Elasticity Optimizer, Product Usage Optimization, Customer Research Automation, Sales Team Cloning.
- **Tier "1M IQ Innovations · Strategic"** (8 tools): Hiring Predictor, Customer Health Score, Territory Intelligence, Account Growth Accelerator, Operational Excellence Auditor, Tech Debt Auditor, Disruption Predictor, Org Structure Optimizer.

Each entry uses the `*_once` priceId where it exists, otherwise the `*_monthly` priceId. Intake = `COMMON` (businessName/website/industry/icp) plus 2–4 tool-specific fields (e.g. competitor URL for Death Wish, top-rep name for Sales Cloning, candidate role for Hiring Predictor, etc.).

### 2. `supabase/functions/_shared/system-prompts.ts`
Add a `SYSTEM_SPECS[priceId]` block for each of the 26 priceIds — same shape as the existing 13. Each gets:
- `title` matching the tile,
- `intake` mirroring the client-side field list,
- a blunt operator-grade `systemPrompt` (tied to the tool's purpose),
- a `userPrompt(i)` that injects the intake JSON and asks for the tool-specific deliverable structure (e.g. for Revenue Leak Detector: ranked leak inventory + $ impact + recovery playbook; for PMF Predictor: probability score + pattern-match table + kill-criteria).

The shared `WHITE_LABEL_DIRECTIVE` already wraps every prompt, so all 26 outputs come out as polished white-label markdown deliverables.

### 3. No changes needed to
- `admin-run-system` edge function — already generic over `SYSTEM_SPECS[priceId]`.
- `AdminForensicsSystemsPanel.tsx` — auto-renders new tiers because it builds the tier list from `FORENSICS_SYSTEMS`.
- `COMING_SOON_PRICE_IDS` / public `/services` — public stays gated and locked exactly as today.
- Stripe / payments — none touched. These run free on Lovable AI Gateway.

## After merge

You'll see three new sections under Admin → Forensics Systems with all 26 new tools as tiles. Click → fill intake → Generate → markdown deliverable + download as `.md`. Iterate the prompts in `system-prompts.ts` as you test.