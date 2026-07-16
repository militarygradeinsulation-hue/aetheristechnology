---
name: Direct Operator Comment Formula
description: Joseph's proven 5-part skeleton + venue rules for LinkedIn comments and posts. Reverse-engineered from 13 of his own comments (550–29,975 impressions). Enforced in linkedin-comment-generate and generate-posts-from-source edge functions.
type: feature
---

## Two-layer system

LAYER 1 — VENUE (50x lever): comment on surging posts within 30–60 min, prioritize named-entity / trending host posts from large operator-tier accounts. Skip abstract self-help with no proper-noun anchor.

LAYER 2 — 5-PART SKELETON:
1. REFRAME OPENER — contradict or recategorize. Rotate: "Disagree." / "That's not [surface]. That's [real thing]." / "[X] is the one that actually kills companies." / "Every [category] follows the same arc:" / "The part nobody audits is ___." (last one max once/week).
2. FORENSIC AUTHORITY ANCHOR — "In every audit I run…" / "When I audit founder finances…" / "I see this pattern in every exit I review."
3. HARD NUMBER or honest pattern claim ("I routinely see 7 of 10…"). Never invent precision.
4. MECHANISM AS BINARY — "X isn't A. It's B." e.g. "Comfort isn't the opposite of growth. It's the deposit on stagnation."
5. APHORISTIC CLOSER — short, screenshot-bait. e.g. "Not revenue. Freedom math." / "Structure separates operators from gamblers."

## Voice rules
- Short declaratives + ONE long mechanism sentence for rhythm.
- Finance/forensics/engineering vocab: leverage curve, unit economics, operating system, audit trail, governance, architecture, translation layer.
- Present tense, pattern-claiming. No hedging, no "I think."

## Hard bans
- No emojis, no hashtags, no em dashes, no "Great post"/"100%"/"Love this".
- No reader questions except in the SHARP_QUESTION comment variant.
- Brand is "Aetheris" — never "Aetheris.technology".
- Zero self-promo in comments on others' posts.

## Enforcement
- `supabase/functions/linkedin-comment-generate/index.ts` — SYSTEM prompt embeds the full skeleton; SHORT/MEDIUM/SHARP_QUESTION variants must hit beats 1+4+5 / all 5 / anchor+binary+question.
- `supabase/functions/generate-posts-from-source/index.ts` — 4-Part Post Architecture rebuilt on the same formula.
- BANNED_OUTPUT_PATTERNS in comment-generate keeps brand-leak + filler bans only; "forensic" / "audit" / "diagnostic" vocab is REQUIRED, not banned.
