## Goal

The PPTX you uploaded — *The Content Architect's Blueprint* — becomes the **single source of truth** for every word the system writes. Blogs, playbooks, LinkedIn posts, drip emails, rep coaching, and content-engine video scripts all get re-anchored to its 3-phase structure:

1. **Phase 1 — Entry Point:** Desire-Based Hook (Dream Outcome + Relatable Character − Constraints)
2. **Phase 2 — Retention Protocol:** 6 Story Locks (Term Branding, Embedded Truths, Thought Narration, Negative Frames, Loop Openers, Contrast Words)
3. **Phase 3 — Conversion Sequence:** 5-step Diagnostic (Hook → Mechanism → Translation → Consequence → Operator Close)

Plus the operator persona rules (lead with diagnosis not agreement, numbers = authority, name the unseen pattern, zero fluff) and the template bank phrases.

Playbooks specifically get a **humanization pass** — less "field manual," more "operator talking to another operator over coffee." Still numbered, still specific, but with breathing room, occasional first-person, and the 6 Story Locks woven in (Thought Narration, Term Branding, Loop Openers).

## What changes

### 1. New shared module: `supabase/functions/_shared/contentBlueprint.ts`

A single TypeScript export that all generator functions import. Contains:

- `FORENSIC_BLUEPRINT_PROMPT` — the canonical ~1,200-word prompt fragment encoding all 3 phases, the 6 Story Locks with examples, the Diagnostic Sequence, the Operator Persona checklist, the template bank, and the execution rules from slides 9 & 15.
- `HUMANIZED_PLAYBOOK_VOICE` — a smaller fragment layered on top for playbook-style content (less mechanical mono labels, more lived-experience phrasing, occasional "Here's what I see when I walk into a $4M shop…" openings).
- `HOOK_FORMULAS` — the 5 tactical templates from slide 4 (About Me / If I / To You / Can You / He-She) as reusable variables.
- `STORY_LOCK_REMINDERS` — short bulletpoint reminders the model can be told to apply at minimum 3 of per piece.

This file is imported by every content-generating edge function so the blueprint stays in one place. Edits propagate everywhere.

### 2. Re-anchor existing generator prompts

For each function below, replace the existing system prompt's "voice/tone" section with the blueprint import + a small function-specific layer (length, format, schema) on top:

- `supabase/functions/generate-blog/index.ts` — long-form blogs
- `supabase/functions/generate-aeo-blog-batch/index.ts` — AEO blog batch
- `supabase/functions/generate-playbook/index.ts` — operator playbooks (also gets the humanization layer)
- `supabase/functions/generate-custom-playbook/index.ts` — client-custom playbooks (humanization layer)
- `supabase/functions/generate-social-content/index.ts` — LinkedIn posts (5 forensic formats already in place — just add the blueprint reminders so hooks and re-hooks stop drifting)
- `supabase/functions/content-engine-generate/index.ts` — LinkedIn short-form video scripts (Phase 1 hook + Loop Openers every 20-30 sec are critical here)
- `supabase/functions/generate-drip-batch/index.ts` — follow-up emails (apply Phase 1 hook to subject lines + Diagnostic Sequence to body)
- `supabase/functions/admin-rep-playbook/index.ts` — daily rep coaching tips (humanized voice + Operator Persona checklist)

No behavior, schemas, or output shapes change — only the system prompt content.

### 3. Four new playbooks added to the catalog

The existing `generate-playbook` function pulls topics from a static list inside `src/lib/adminPlaybook.ts` and/or `src/lib/portalPlaybook.ts`. I'll add 4 new playbook topics modeled directly on the slides, each written in the humanized voice:

1. **The Hook Architect's Field Manual** — Phase 1 deep-dive. How to engineer the Subconscious Lock-On for sales calls, intro emails, LinkedIn openers, proposal first lines.
2. **The Attention Hourglass: 6 Story Locks for Operators** — Phase 2 applied to internal comms, client meetings, written proposals, sales decks. Rehook every 60-90 seconds or lose the room.
3. **The Diagnostic Sequence Playbook** — Phase 3 as a sales-floor weapon. The 5-step Hook → Mechanism → Translation → Consequence → Operator Close, scripted for cold calls, discovery calls, objection handling.
4. **The Operator's Voice: How to Sound Like Someone Worth Listening To** — the persona rules from slides 9 & 11. The Old Way / New Way teardowns, lead-with-diagnosis script library, 30 forensic phrases to replace consulting clichés.

Each playbook gets:
- A row in the playbook topic list (`src/lib/adminPlaybook.ts` or wherever topics are seeded)
- Title, slug, description, target audience, prompt brief (~6-line creative brief that the AI consumes)

### 4. Memory updates

Update `mem://marketing/content-architecture.md` to reference the Forensic Blueprint as the master structure (3 phases) that the 5 LinkedIn formats now sit underneath. Add a new memory `mem://marketing/forensic-blueprint.md` that summarizes the blueprint so future loops don't re-derive it from the PPTX.

## What does NOT change

- No DB schema changes.
- No UI changes.
- No new edge functions.
- Existing post formats (Case File, Leak of the Week, Diagnostic, Operator's Journal, Contrarian) stay — the blueprint sits underneath them as the structural rules each format must obey.
- No emojis added (slide 10 had them; we don't carry those over — they violate brand).

## Files touched (summary)

```
NEW   supabase/functions/_shared/contentBlueprint.ts
EDIT  supabase/functions/generate-blog/index.ts
EDIT  supabase/functions/generate-aeo-blog-batch/index.ts
EDIT  supabase/functions/generate-playbook/index.ts
EDIT  supabase/functions/generate-custom-playbook/index.ts
EDIT  supabase/functions/generate-social-content/index.ts
EDIT  supabase/functions/content-engine-generate/index.ts
EDIT  supabase/functions/generate-drip-batch/index.ts
EDIT  supabase/functions/admin-rep-playbook/index.ts
EDIT  src/lib/adminPlaybook.ts        (add 4 new playbook topics)
NEW   mem://marketing/forensic-blueprint.md
EDIT  mem://marketing/content-architecture.md
EDIT  mem://index.md                   (link the new memory)
```

## Open question

Do you want the 4 new playbooks **generated and saved into the library now** (auto-published as drafts you can review), or just **added to the topic catalog** so they generate on demand the next time you click "Create"? I'll default to topic-catalog-only unless you say otherwise — safer, no surprise content lands in production until you trigger it.