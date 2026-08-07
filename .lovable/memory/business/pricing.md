---
name: Pricing & Business Model
description: Public offers, bundles, flagship fixed splits, tiered commission, rep-portal alignment
type: feature
---

## Public offers — 2026 Aetheris Universe tier ladder (SOURCE OF TRUTH: `src/lib/aetherisTiers.ts`)

The 24 tools are NOT standalone SKUs. They are instruments included inside tiers.
No public per-tool price, no per-tool Stripe checkout, no tool-shop retail plans.
Progression: DIAGNOSE (Signal) -> ARM (Revenue) -> OPERATE (Suite) -> INVESTIGATE (Diagnostic) -> SUSTAIN (Active Case).

1. **Free Self-Scan — $0.** One live scan, directional Revenue Score, one named leak.
2. **Signal Pack — $7,500 one-time.** Website Leak Scanner full pass + Brand Contradictions + Friction Audit + findings memo + operator walkthrough.
3. **Revenue Pack — $10,000 one-time.** Signal + Strategic Questions, Sales Scripts, Follow-Up Sequences, Content Calendar.
4. **Operator Suite — $15,000 one-time.** Revenue + Detective Mode, Forensic Scan (All), Head-to-Head, Social Content, Image Studio, Content Engine, All-In-One, Easy Mode, full Tech Suite.
5. **21-Day Diagnostic — $23,500. FLAGSHIP.** Suite + Golden Report, Nexus IQ, Reciprocation, AI Checklist, Playbook Generator, every remaining instrument, 21 days of operator time. Fit call required.
6. **Active Case Retainer — $20,000/month.** Diagnostic clients only. Monthly rescans, living Leak Register, priority builds.

Public tool cards show tier badges ("Included in Operator Suite", "Diagnostic only"), never prices. CTAs go to the tier ladder or /book.

## Commission math — TWO models (source of truth)

### Model A — Tiered % (bundles + legacy catalog)
Defined in `src/lib/repProducts.ts` TIER_RATES + `ratesForAmount()` in `payments-webhook`.
- T1 ($29–$59, ≤5900¢): Company 50 / Rep 30 / Partner 20
- T2 ($79–$349, ≤34900¢): Company 60 / Rep 25 / Partner 15
- T3 ($599+, incl. all 3 bundles): Company 70 / Rep 20 / Partner 10

Bundle splits (all T3):
- Signal $2,500 → Co $1,750 / Rep $500 / Partner $250
- Revenue $5,000 → Co $3,500 / Rep $1,000 / Partner $500
- Operator Suite $10,000 → Co $7,000 / Rep $2,000 / Partner $1,000

### Model B — Flagship fixed-dollar
Defined in `FLAGSHIP_SPLITS` (src/lib/repProducts.ts) and `FLAGSHIP_FIXED_SPLITS` / `flagshipFixedSplit()` (payments-webhook). Mapped by Stripe price lookup_key:
- `diagnostic_21day_once` → Co $10,500 / Rep $5,000 / Partner $3,000 (legacy $18,500 math; NEEDS RE-CONFIRMATION against the $23,500 public price)
- `implementation_retainer` → Co $8,000 / Rep $4,000 / Partner $3,000 (legacy $15,000 math; NEEDS RE-CONFIRMATION against the $20,000/mo public price)

Webhook precedence: `flagshipFixedSplit(priceId)` wins; otherwise falls back to `ratesForAmount()`.

### Bonuses (stack on top of base commission)
- Volume: +$1k/$2.5k/$5k at 2/3/5 monthly flagship sales
- Retention: +$1k/$2.5k/$5k at 3/6/12-month retainer extension
- Referral: $500 onboard + $7k first-close + $500/sale 12-mo override

## Rep portal alignment (CareersPage, FlagshipCommissionPanel, onboardingCurriculum, Rep-Operator-Playbook.md)
All four surfaces show the SAME five offers and the SAME numbers above. The 21 legacy à la carte tools live on in `REP_PRODUCTS` with `legacy: true` for internal/direct rep sales only — never promoted publicly. Fractional CTO/CMO retired from active rep panels.

## Legacy / internal Stripe products
Routes still resolve so existing rep-portal links and direct purchases keep working but are hidden from public nav. Tracked in `REP_PRODUCTS` with `legacy: true`.

## Required reading
Public training doc: `public/Rep-Operator-Playbook.md` (full pitch + math + rules).
