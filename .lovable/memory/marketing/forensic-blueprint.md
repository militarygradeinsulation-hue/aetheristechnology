---
name: The Forensic Content Blueprint
description: Master 3-phase content structure (Desire-Based Hook + 6 Story Locks + Diagnostic Sequence) that every AI content generator obeys. Single source of truth lives at supabase/functions/_shared/contentBlueprint.ts
type: feature
---

## Origin

Built from "The Content Architect's Blueprint" PPTX. Codified into `supabase/functions/_shared/contentBlueprint.ts` as the canonical prompt fragment imported by every content-generation edge function.

## The Three Phases

**PHASE 1 — Entry Point (Desire-Based Hook)**
Formula: `[Dream Outcome] + [Relatable Character] − [Constraints] = Subconscious Lock-On`
5 hook templates: ABOUT ME / IF I / TO YOU / CAN YOU? / HE-SHE DID

**PHASE 2 — Retention Protocol (6 Story Locks, apply ≥3 per piece)**
1. Term Branding (name the framework)
2. Embedded Truths ("when" not "if")
3. Thought Narration ("you're probably thinking…")
4. Negative Frames (loss aversion / inverted advice)
5. Loop Openers (curiosity gaps)
6. Contrast Words (but / actually / turns out / instead)
Re-hook every 20–30s (short) or 60–90s (long).

**PHASE 3 — Conversion Sequence (5-step Diagnostic)**
Hook → Mechanism → Translation (dollars/%/time) → Consequence → Operator Close

## Operator Persona Rules

Lead with diagnosis, never agreement. Numbers = authority. Name the unseen pattern. Zero fluff. Concrete business nouns over vague motivation.

## Where it's wired

All 8 content generators import from `_shared/contentBlueprint.ts`:
- `generate-blog` — long-form blogs (full blueprint)
- `generate-aeo-blog-batch` — AEO blog batch (full blueprint)
- `generate-playbook` — operator playbooks (full + HUMANIZED_PLAYBOOK_VOICE)
- `generate-custom-playbook` — client-custom playbooks (full + humanization)
- `generate-social-content` — LinkedIn 5-format pack (full blueprint)
- `content-engine-generate` — LinkedIn short-form video scripts (compact)
- `generate-drip-batch` — follow-up emails (compact)
- `admin-rep-playbook` — daily rep coaching (compact + humanization)

## Exported building blocks

- `FORENSIC_BLUEPRINT_PROMPT` — full ~1,200-word fragment (long-form generators)
- `FORENSIC_BLUEPRINT_COMPACT` — condensed (short-form/email/script generators)
- `HUMANIZED_PLAYBOOK_VOICE` — playbook humanization layer (operator-to-operator tone, not field manual)
- `HOOK_FORMULAS` — the 5 tactical hook templates as variables
- `STORY_LOCK_REMINDERS` — compact bullet reminder
- `DIAGNOSTIC_SEQUENCE` — compact 5-step reminder

## New Forensic Communication Playbooks (in generate-playbook topic pool)

1. The Hook Architect's Field Manual — Phase 1 deep-dive for sales/email/cold opens
2. The Attention Hourglass: 6 Story Locks for Operators — Phase 2 applied to executive presence
3. The Diagnostic Sequence Playbook — Phase 3 scripted for sales floor
4. The Operator's Voice — persona rules + 30 forensic phrases vs consulting clichés

## Editing Rule

When the blueprint changes, edit ONLY `_shared/contentBlueprint.ts`. All 8 generators inherit automatically. Never duplicate the blueprint into individual functions.
