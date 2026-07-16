---
name: Aetheris Coder — Protected Feature
description: The /aetheris-coder vibe-coding tool and its edge function are locked. Never modify, restyle, or regress them during unrelated changes.
type: constraint
---

# Aetheris Coder is a protected feature

Live at: https://businessforensics.tech/aetheris-coder (also /aetheris-coder on every domain).

**Rule:** Treat this feature as frozen. Do NOT edit, restyle, refactor, or "clean up" any of its files unless the user explicitly names Aetheris Coder in the request.

## Files under lock
- `src/pages/AetherisCoderPage.tsx` — the page UI, chat, sandbox iframe, Reset button.
- `supabase/functions/aetheris-coder-chat/index.ts` — the edge function that talks to Lovable AI Gateway.
- The route entry for `/aetheris-coder` in `src/App.tsx` / router.
- The link on `src/pages/TechSolutionsPage.tsx` that points to it.
- The `LOVABLE_API_KEY` secret (managed — never delete, never rotate unless the gateway itself rejects the key).

## Why
Joseph relies on this tool being continuously live. Website-wide restyles, rollbacks to earlier states, or "sweep" edits have previously reverted the coder page's styling and re-broken the edge function deployment. That must not happen again.

## How to apply
- Bulk find/replace across the site (colors, fonts, layout, copy): SKIP these files.
- "Roll back the website" / "revert to earlier version" requests: warn the user that a project-wide rollback also rolls back these files, and ask whether to preserve them by re-applying the current Aetheris Coder code after the rollback.
- If the edge function stops responding after any deploy: redeploy `aetheris-coder-chat` immediately (it was previously broken by a stale deploy state).
- When the user asks to change Aetheris Coder itself, changes are fine — the lock only applies to incidental/collateral edits.
