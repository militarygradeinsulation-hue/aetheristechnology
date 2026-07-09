# Reciprocity Engine Rebuild

The uploaded spec is the new source of truth. It replaces the old catalog/bundle model with a single funnel. Below is exactly what changes, in the order the spec's own Build Order calls for.

## The new public offer (only these exist for sale)

| Rung | Price | Product | Split model |
|---|---|---|---|
| Free | $0 | Leak Audit (existing) | n/a |
| Tier 1 | **$3,500 one-time** | **Single-Leak Investigation** (NEW) | Tier 3 percent split — 70/20/10 |
| Tier 2 | $18,500 one-time | Chaos Diagnostic (rename of "21-Day Revenue Diagnostic") | Flagship fixed: Co $10,500 / Rep $5,000 / Partner $3,000 |
| Tier 3 | $15,000/mo | Implementation (rename of "Active Case") | Flagship fixed: Co $8,000 / Rep $4,000 / Partner $3,000 |

Signal / Revenue / Operator Suite bundles and the ~30 legacy à-la-carte items are **removed from public sale** and kept in the portal for back-compat only (marked `legacy: true` — already the pattern).

The Tool Shop ($40 / $100 / $1,000 lifetime) is what the spec calls the "Evidence Kit" — same products, new positioning, unlocked on the Leak Audit results page.

## Build order (matches spec Part 9)

### Step 1 — Pricing + product data (foundation)
- `src/lib/repProducts.ts`: rename `21-Day Revenue Diagnostic` → `Chaos Diagnostic`, `Active Case` → `Implementation`. Add `Single-Leak Investigation` @ $3,500 (tier 3, non-legacy). Mark Signal/Revenue/Operator Suite bundles `legacy: true` so they drop out of `PUBLIC_BUNDLES`.
- `src/components/ServicesPricing.tsx`: delete the outdated "14-Day Diagnostic $2,900" entry; add the three paid rungs with correct copy from Part 3.
- Fix the `sales_coaching_active case_monthly` priceId typo (space → underscore).

### Step 2 — Rewrite `/catalog` (new pricing page)
Replace `src/pages/CatalogPage.tsx` + `src/components/PackageTiers.tsx` with the exact structure from spec Part 3:
- Page title "Every engagement starts with evidence."
- Tier 0 slim strip: Leak Audit (Free) — CTA "Open Your Case File"
- Tier 1 card: Single-Leak Investigation $3,500 — CTA "Trace One Leak"
- Tier 2 dominant gold-border card: Chaos Diagnostic $18,500 — CTA "Request the Full Investigation" — includes the written guarantee paragraph
- Tier 3 quiet card: Implementation from $15,000/mo — no CTA button (Diagnostic is the door)
- Closing strip with "Open Your Case File"
- No em-dashes anywhere.

### Step 3 — Site-wide CTA cleanup (Part 7)
Grep-and-replace the banned CTAs (`Learn More`, `Get Started`, `Contact Us`, `Book a Demo`, `Sign Up`) on public marketing pages only, replaced with the correct rung CTA for the surface they sit on. Auth/portal buttons keep their labels.

### Step 4 — Leak Audit results page: Evidence Kit unlock (Part 5)
- Add an "Evidence Kit" section to `LeakAuditResultsPage` (or equivalent) that surfaces the 7 tools (Friction Audit, Brand Contradictions, Follow-Up Plan, Sales Scripts, Question Engine, Content Calendar, Gap Scanner) only after the Leak Audit is completed.
- Reduce public nav to link to only ONE free tool (the Leak Audit).

### Step 5 — Stripe catalog
Register `single_leak_investigation_once` at $3,500 via `payments--create_product`. No other Stripe changes; existing prices already match `repProducts.ts`.

### Step 6 — Portals sanity check (display + math only, per your earlier answer)
- Rep portal, admin portal, POS Terminal: verify Single-Leak Investigation appears in rep-sellable list; verify Chaos Diagnostic / Implementation renames don't break lookups. No payout logic changes.

## Deferred (explicitly NOT in this pass)

- Preliminary Findings PDF artifact (Part 4) — will build after pricing/funnel lands.
- Results page dossier layout with case #, exhibits, redactions (Part 5 visual) — separate build.
- HubSpot/ADAS follow-up sequence + T+48 Loom queue (Part 6) — needs its own scope.
- Legal review of guarantee wording — flagged in copy as `TODO(matt)` until you confirm.
- Case-numbering system (starting from real count) — need your current true case count before wiring.

## Confirm before I build

1. **Rename OK?** "21-Day Revenue Diagnostic" → "Chaos Diagnostic" and "Active Case" → "Implementation" across UI and portals. Product IDs stay the same (`fourteen_day_diagnostic_once` etc. are already legacy names in Stripe — keep IDs, rename display).
2. **Bundles killed publicly?** Signal / Revenue / Operator Suite disappear from `/catalog` and any homepage grids.
3. **Guarantee copy** goes live with `TODO(matt)` note next to it, or hold the Diagnostic card until Matt signs off?

Reply "go" (or with any edits) and I'll ship Steps 1–3 first, then loop back for Steps 4–6.