---
name: No Dash Writing Rule
description: Absolute ban on dashes (em, en, hyphen, "- " bullets) in all Aetheris-written copy; enforced by stripDashes sanitizers
type: constraint
---

**NEVER use dashes in any writing Joseph publishes.** No em dashes, no en dashes, no hyphens between words, no "- " bullet markers. Use periods, commas, separate sentences, or "•" bullets. Compound words become two words or one word ("follow up", "high value", "onboarding").

**Why:** Dashes are an AI tell and break the forensic operator voice.

**How to apply:**
- Every AI prompt that produces copy must include `NO_DASH_PROMPT_RULE`.
- Every AI copy payload must be passed through `stripDashesDeep()` before it is returned or saved.
- Shared implementations: `supabase/functions/_shared/no-dashes.ts` (edge) and `src/lib/noDashes.ts` (client).
- URLs, slugs, file paths, emails, ids and date/time strings keep their dashes. Hashtags collapse (`#Revenue-Leak` -> `#RevenueLeak`).
- Enforced in: content-engine-generate (all callAI output), generate-content-calendar, generate-posts-from-source, generate-day-content, generate-social-content. Add the same guard to any new copy generator.
