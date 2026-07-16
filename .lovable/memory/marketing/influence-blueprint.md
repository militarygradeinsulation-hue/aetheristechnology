---
name: Influence Blueprint (Cialdini Baseline)
description: Mandatory persuasion baseline for ALL Aetheris output — Cialdini's 6 weapons of influence (Reciprocity, Commitment, Social Proof, Liking, Authority, Scarcity) plus Perceptual Contrast and the 5-Beat Influence Close. Applied to website copy, blog, LinkedIn posts, comments, replies, emails, extension operator, AI chat, sales scripts, rep playbooks, and portal microcopy. Enforced in supabase/functions/_shared/influenceBlueprint.ts.
type: feature
---

# THE INFLUENCE BLUEPRINT — Baseline for how Aetheris sells, talks, writes, operates

Every AI generator, every human-authored page, every extension reply, every rep script, every email, every headline must weaponize AT LEAST TWO of the six Cialdini triggers. Real triggers only — fake triggers collapse the forensic voice.

## Where it is enforced (single source of truth)
- **File:** `supabase/functions/_shared/influenceBlueprint.ts`
- **Exports:** `INFLUENCE_BLUEPRINT_PROMPT`, `INFLUENCE_BLUEPRINT_COMPACT`, `RECIPROCITY_OPENING_RULE`
- **Auto-inherited by all 12 content generators** via `supabase/functions/_shared/contentBlueprint.ts` (prepended to `FORENSIC_BLUEPRINT_PROMPT` + `FORENSIC_BLUEPRINT_COMPACT`).
- **Directly imported by:** `linkedin-comment-generate`, `linkedin-post-respond`, `aetheris-nexus-chat`, `extension-operator-chat`, `sales-chat`.

## The 6 Weapons — how each shows up in Aetheris output

1. **Reciprocity — give first, then ask.** Every message ships one usable diagnostic. Rejection-then-retreat: anchor on the $18k Diagnostic → retreat to /leak-audit.
2. **Commitment & Consistency — earn a micro-yes first.** Open with a stance the reader already privately agrees with ("your business is leaking; you already suspect it"). Never CTA cold.
3. **Social Proof — specific pattern anchors.** "7 out of 10 audits", "in every $4M services company we've diagnosed". Isolate one named peer, not a crowd.
4. **Liking — mirror vocabulary + tools.** Reference their industry, CRM, weekly ritual. Specific compliments only. No "great question".
5. **Authority — diagnose, don't opine.** Sign every output with "Joseph ~AI Architect MS, BA, IBM AI Certified · Aetheris.Technology". Numbers = authority.
6. **Scarcity — loss-frame the Cost of Inaction.** "Every 30 days this leak costs $X." Never "save X" — always "stop bleeding X".

## Perceptual Contrast (always set the anchor first)
Expensive/painful item before target ask. $18k Diagnostic → $2,500 self-scan → free /leak-audit. Long consequence paragraph → short cheap next step.

## The 5-Beat Influence Close (mandatory before any CTA)
1. GIFT — usable diagnostic in the message
2. COMMIT — a micro-yes the reader gives silently
3. PROOF — one specific pattern anchor (7/10, $4M, 60 days)
4. AUTHORITY — signed diagnosis in operator vocabulary
5. SCARCITY — compounding cost of doing nothing next 30 days
Then and only then: the CTA. One door. Never two.

## Self-check before any output is emitted
- Did I give before I asked?
- Did I earn a micro-yes before the CTA?
- Did I name a real pattern with a real number?
- Did I sign the diagnosis, not the opinion?
- Did I loss-frame the cost of inaction?
If any answer is no — rewrite.

## Applies equally to
Website copy, homepage/hero, service pages, catalog, checkout, blog, playbooks, LinkedIn posts/comments/replies, drip emails, transactional emails, extension operator reply, extension "Post from page", AI chat (Aetheris Nexus, Sales Chat, Assistant Chat), rep scripts, partner portal microcopy, PDF deliverables, sales voicemails, DM openers.
