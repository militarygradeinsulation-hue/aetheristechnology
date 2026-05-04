## Goal

The 13 newest products (the forensics-system intake products we just added) should remain **visible** on the public site so prospects can see them, but **cannot be purchased**. Replace the "Buy Now / Subscribe" CTA with a red **"Coming Soon"** badge/button. They must also be excluded from the Mix & Match bundle. Admin staff keep full access via the existing **Admin → Forensics Systems** panel (which doesn't use Stripe anyway).

## The 13 products to mark Coming Soon

These are the priceIds added in the last batch (matching `src/lib/forensicsSystems.ts`):

```
crm_health_check_once         lead_flow_mapper_once
competitor_landing_analysis_once  email_series_bundle_once
crm_setup_optimization_once   landing_page_blueprint_once
prospecting_list_builder_once sales_team_onboarding_once
lead_gen_sprint_once          sales_process_redesign_once
marketing_sales_alignment_once
sales_coaching_retainer_monthly  lead_nurture_automation_monthly
```

## Changes

### 1. `src/lib/forensicsSystems.ts`
Export a `COMING_SOON_PRICE_IDS: Set<string>` derived from `FORENSICS_SYSTEMS.map(s => s.priceId)` (plus the two `_monthly` variants `sales_coaching_retainer_monthly` and `lead_nurture_automation_monthly` which aren't in that file). This becomes the single source of truth.

### 2. `src/components/ServicesPricing.tsx`
- Import `COMING_SOON_PRICE_IDS`.
- Add a helper `isComingSoon(s)` that returns true if either `s.priceId` or `s.monthlyPriceId` is in the set.
- **Card grid (every tile that renders one of these services):** show a red `Coming Soon` pill in the top-right corner of the card (replacing the `POPULAR` / `RECURRING` badge for these specific services). Card stays clickable to open the detail drawer.
- **Detail drawer action row (lines ~688–704):** when `isComingSoon(expandedService)`, replace BOTH the "Subscribe — …" and "Buy Now — …" buttons with a single disabled red button:
  ```
  [ ⏳ Coming Soon ]   bg-red-600/15 text-red-400 border-red-500/40 cursor-not-allowed
  ```
  Keep the **Talk to Us** link visible. Hide the **Add to Bundle** button for these services (so they can't enter the bundle).
- **Bundle eligibility:** filter `bundleableServices` to exclude any service flagged coming-soon. Also defensively guard the bundle-bar checkout button against any coming-soon item slipping in.

### 3. Visual style for the Coming Soon badge/button
Per the project's forensic identity rule, **crimson is reserved for "leak signal."** "Coming Soon" is a different signal, so use a distinct red token instead of the crimson leak red:
- Tailwind: `bg-red-600/15 text-red-400 border border-red-500/40 font-mono uppercase tracking-widest text-[10px]`
- Same red used for both the card pill and the disabled detail button — keeps it loud but clearly not a "leak" mark.

### 4. Admin access — no changes required
`src/components/admin/AdminForensicsSystemsPanel.tsx` already exposes all 13 systems through the `admin-run-system` edge function with no Stripe involvement. Admin can keep generating deliverables for these products freely. We'll add a small note in the panel header confirming "Public checkout disabled — admin-only access" so this stays clear.

### 5. Out of scope
- We are **not** archiving / deleting Stripe prices. They stay live so a quick re-enable is just removing the priceId from the `COMING_SOON_PRICE_IDS` set.
- No changes to `repProducts.ts` (rep portal still tracks them as catalog items for commission planning).

## Result

- Public visitors browsing `/services` see all 13 new products with a red **Coming Soon** badge, can read details, but cannot buy or bundle them.
- Admins (you) keep the full intake → AI deliverable flow inside the admin panel.
- Re-enabling sales later = delete two lines from `forensicsSystems.ts`.
