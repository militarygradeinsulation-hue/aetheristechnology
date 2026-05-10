---
name: Pricing & Business Model
description: Public offers, legacy product status, tiered commission
type: feature
---

## Public offers (the only two surfaced on the site)
1. **21-Day Revenue Diagnostic — $18,500 fixed fee.** One-time. Sales-led only (no Buy Now button). Book a 15-minute call to qualify.
2. **Implementation Retainer — $15K/month, 3-month minimum.** Diagnostic clients only.

## Legacy / internal Stripe products (still live, hidden from nav)
All routes still resolve so existing rep-portal links and direct purchases keep working, but they are removed from `Navbar`, `Footer`, `Home`, `ServicesPage`, and the Hero CTAs.

- Forensic Diagnostic ($2,500), 14-Day Diagnostic ($2,900), Fractional CTO/CMO ($5,900/mo)
- Tool packs: Social Content Pack, Content Calendar, Sales Script Pack, Follow-Up Plan, Full Website Report, Friction Vocabulary Audit, Strategic Question Engine, Brand Contradiction Finder, Digital Snapshot, Strategy Blueprint, Website Evaluation, Strategic Discovery Audit, Playbook Unlock
- Subscription tiers via `smart-subscriptions`

These products may resurface publicly only after the 90-day fix proves the wedge.

## Tiered commission (rep program — intact but not promoted publicly)
Source of truth: `TIER_RATES` in `src/lib/repProducts.ts` and `ratesForAmount()` in `payments-webhook`.
- Tier 1 ($29–$59, ≤ 5900¢): Company 50 / Rep 30 / Partner 20
- Tier 2 ($79–$349, ≤ 34900¢): Company 60 / Rep 25 / Partner 15
- Tier 3 ($599+): Company 70 / Rep 20 / Partner 10

10 rep codes in `rep_codes`: 482917, 739254, 156843, 624781, 895326, 317469, 568192, 743058, 281637, 964523. Tracked via `metadata.rep_code` in Stripe checkout → `sales.rep_code`.

## Pilot pricing
$9,500 for the first three signed pilots — outreach scripts only, never on the site.
