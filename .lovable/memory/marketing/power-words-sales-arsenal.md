---
name: Power-Words Sales Arsenal (site-wide enforcement)
description: Site-wide + AI-output enforcement of the 7 power-word families (Trust, Urgency, Curiosity, Exclusivity, Emotion, Personal Connection, Growth/Benefit). Adds mandatory "because"-clause on every CTA, "you/your" as subject of every hero sub-line, guarantee/risk-free within one scroll of every price, proven/verified alongside every claim number, and reserved/operator-only on every gated asset. Enforced in supabase/functions/_shared/influenceBlueprint.ts (both full and compact) and mirrored in visible UI on Hero, PackageTiers, Contact, Footer.
type: preference
---

# Power-Words Arsenal — every page, every generator, every CTA

Layered onto the existing 5-family Power Lexicon. Adds two new mandatory families and 5 cross-page mandatories that fire on EVERY page.

## Two added families

6. **PERSONAL CONNECTION** — you, your, imagine, BECAUSE + reason clause, save, keep, together, we, protect, own. `you` > `we` on hooks; `we` > `you` on closes (Unity).
7. **GROWTH / BENEFIT / TEMPTATION** — recover, reclaim, unseal, compound, operator-grade, multiply, engineer, own. Aetheris translates guru vocabulary: unlock → unseal · master → operator-grade · boost → recover.

## 5 cross-page mandatories (every page, no exceptions)

1. **BECAUSE clause** on every CTA pair (Langer 94/60% rule). No bare "Book now" — always "Book … because …".
2. **YOU / YOUR** as subject of every hero sub-line and email opener.
3. **GUARANTEE / RISK-FREE / NO-OBLIGATION** within one scroll of every price.
4. **PROVEN / VERIFIED / AUDITED** alongside every claim number.
5. **RESERVED / OPERATOR-ONLY / INSIDER** on every gated asset (portal, playbook, extension, checklist).

## Where enforced

- `supabase/functions/_shared/influenceBlueprint.ts` — POWER LEXICON now includes families 6+7 and the 5 cross-page mandatories in both `INFLUENCE_BLUEPRINT_PROMPT` and `INFLUENCE_BLUEPRINT_COMPACT`. Auto-inherited by every content generator, blog, playbook, LinkedIn post/comment, sales-chat, aetheris-nexus-chat, extension callOperator.
- Visible UI: `src/components/Hero.tsx`, `src/components/PackageTiers.tsx`, `src/components/Contact.tsx`, `src/components/Footer.tsx` — CTAs rewritten to use action verbs (Reserve, Claim, Embed), risk-free/proven ribbons added, "because" clauses embedded above pricing.

## Hard bans (unchanged, still active)

amazing · mind-blowing · life-changing · game-changer · revolutionary · cutting-edge · next-level · unlock your potential · act now · hurry · don't miss out · you won't believe · shocking · limited time only!! · FREE!!! · 10x · secret sauce · magic · superpower.
