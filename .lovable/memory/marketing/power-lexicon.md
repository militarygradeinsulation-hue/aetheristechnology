---
name: Power Lexicon
description: 5 conversion trigger families (Trust, Urgency, Curiosity, Exclusivity, Emotion) with Aetheris forensic-voice translations, surface match map, and hard bans. Fires alongside the 6 Cialdini weapons in every generator.
type: preference
---

# Power Lexicon — Aetheris Forensic Translation

Every headline, subject line, CTA, hero, popup, comment verdict, sales line, DM, email, and video hook must fire **≥2 of the 5 families** — matched to the surface. Never spray, never fake the claim underneath the word.

## The 5 families

1. **TRUST** — collapse perceived risk on product/pricing/proof surfaces.
   - Aetheris words: proven, forensic-verified, documented, guaranteed, risk-free, no-obligation, audited, receipts, tracked, measured, source-of-truth.
   - Flex: "Forensic-verified." "Receipts, not opinions." "Risk-free Leak Scan."
   - Ban when: cold top-of-funnel hooks — defensive tone kills them.

2. **URGENCY / SCARCITY** — loss-frame on exit-intent, time-boxed offers, Cost-of-Inaction lines, retainer close.
   - Aetheris words: leaking now, every 30 days, closing, last cohort, limited seats, cutoff, ends [date], before [event], while it compounds, bleeding daily, 60-day window.
   - Flex: "Every 30 days you wait, the leak compounds." "Diagnostic cohort closes Friday."
   - Ban: hurry, act now, don't miss out (guru cadence).

3. **CURIOSITY** — open info gap on hooks, blog titles, LI post lines 1–2, subject lines, thumbnails.
   - Aetheris words: the pattern nobody names, hidden, buried, unseen, the leak your team can't see, the 7th step, what the audit found, quietly, underneath, the real reason.
   - Flex: "The leak your CFO can't see from the inside."
   - Ban: you won't believe, shocking, clickbait tells.

4. **EXCLUSIVITY / GAIN** — insider status on lead magnets, playbook downloads, portal, waitlists, private offers.
   - Aetheris words: operator-only, insider, private, invitation, unlocked, bonus playbook, free diagnostic, complimentary scan, reserved, flagship, first-access.
   - Flex: "Operator-only playbook — not sold, given." "Reserved for the Diagnostic cohort."
   - Ban: FREE!!!, sweepstakes energy.

5. **EMOTION / AWE** — sensory adjectives on transformation stories, case-study reveals, before/after, testimonials, video hooks.
   - Aetheris words: brutal clarity, staggering, undeniable, decisive, seismic, surgical, ruthless, unmissable, unforgettable, unstoppable.
   - Flex: "Brutal clarity in 14 days." "The number was staggering — and fixable."
   - Ban: amazing, mind-blowing, life-changing, game-changer.

## Surface match map

| Surface | Families to fire |
|---|---|
| Product / pricing / diagnostic sales copy | TRUST + EMOTION |
| Exit-intent popups / retainer close / CoI lines | URGENCY + TRUST |
| Blog titles / LinkedIn hooks / video thumbnails | CURIOSITY + AUTHORITY |
| Lead magnets / playbook downloads / portal | EXCLUSIVITY + RECIPROCITY |
| Case studies / testimonials / before-after | EMOTION + SOCIAL PROOF |
| Comment verdicts (<15 words) | CURIOSITY or TRUST — one only |
| Cold DMs / extension replies | CURIOSITY + RECIPROCITY, never URGENCY |

## Hard bans (global — any surface, ever)

amazing · mind-blowing · life-changing · game-changer · revolutionary · cutting-edge · next-level · unlock your potential · act now · hurry · don't miss out · you won't believe · shocking · limited time only!! · FREE!!! · 10x your [anything] · secret sauce · magic · superpower.

## Where enforced

- `supabase/functions/_shared/influenceBlueprint.ts` — POWER LEXICON block in both `INFLUENCE_BLUEPRINT_PROMPT` (full) and `INFLUENCE_BLUEPRINT_COMPACT`. Injected into every content generator, LinkedIn post/comment, sales-chat, aetheris-nexus-chat, extension callOperator, drip email, and CTA copy.
