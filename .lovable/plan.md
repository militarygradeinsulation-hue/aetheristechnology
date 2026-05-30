## 1. Workbench clicks not registering (dropdowns, Add Tool, width, layouts)

**Cause:** The Workbench panel is `z-[80]`, but Radix `DropdownMenu` and `Select` portals render to `document.body` at default `z-50`. They open *behind* the panel, so clicks/changes don't land. Same reason "load layout" select can't be opened, and the panel-width Select looks dead.

**Fix:**
- Add `z-[100]` (above `z-[80]` aside) to every `DropdownMenuContent` and `SelectContent` inside `FloatingWorkbench.tsx` (Add tool menu, panel width select, layouts select).
- Verify with a quick click-through after the change.

## 2. Add LinkedIn Comment Generator tool

The current Reply Composer is tuned for full replies. Add a sibling tool focused on short, punchy comment responses.

- New component `src/components/portal/LinkedInCommentGenerator.tsx` — paste post text or screenshot → generates 3 comment variants (short / medium / sharp-question), each 1–3 sentences.
- New edge function `supabase/functions/linkedin-comment-generate/index.ts` using `google/gemini-3-flash-preview` with:
  - Anti-repetition scan against saved library (same `collectAllPastBodies` pattern already used by the reply composer).
  - Persona support (reuse the persona blocks already in `linkedin-post-respond`).
  - Hard cap: each comment ≤ 320 chars, no "Architecture Failure / Operational Waste" cliché list.
- Register the tool in `src/components/workbench/toolRegistry.tsx` under the **Outreach** group so it shows in Add Tool dropdown.
- Auto-save outputs to the shared library so future runs scan against them too.

## 3. Auto clock-out after inactivity

**Behavior:** If a rep is clocked in and idle (no clicks, key presses, route changes, or API calls) for **30 minutes**, automatically clock out with note `"Auto clock-out (inactive 30m)"`.

**Where:**
- `src/components/portal/RepClockWidget.tsx` — add an activity listener (`mousemove`, `keydown`, `click`, `visibilitychange`) that resets a timer. When timer fires AND `entry.clock_out_at` is null, call `portalTimeclock.clockOut("Auto clock-out (inactive 30m)")` and toast the rep.
- Persist `lastActivityAt` in `localStorage` so closing the tab also counts as inactivity (on next portal load, if clocked-in and `now - lastActivityAt > 30m`, auto clock out).
- Small UI hint near the clock widget: "Auto clock-out after 30m idle."

## 4. Hunt mode → no way to act on leads

Hunt currently surfaces companies but doesn't expose contact channels.

- In `LeadsBoard.tsx` (Hunt panel), when a lead row is opened, fetch enriched contact info via the existing RocketReach-backed edge function (already have `ROCKETREACH_API_KEY` secret) and show: email, phone, LinkedIn URL, and direct buttons:
  - **Email** → opens rep mailbox composer prefilled with subject + playbook attachment.
  - **DM** → opens LinkedIn URL in new tab.
  - **Call** → `tel:` link + logs an attempt to `lead_actions`.
- If RocketReach returns nothing, show a clear "No contact data found — try LinkedIn manually" state instead of silently failing.

## 5. Playbook attachment tab is empty

When the outreach panel says "attach the playbook" and the Playbook tab opens empty, it's because `PortalPlaybook` requires the `portal-playbook` edge function to return `plays`, but no plays exist yet for new reps.

- Seed the rep portal with the existing Aetheris playbook content (already present in `src/lib/portalPlaybook.ts` types / admin tables) — ensure `portal-playbook` falls back to the global Aetheris playbook when the rep has no custom plays.
- In the outreach flow, expose a **"Attach Playbook PDF"** button that pulls from the public `playbooks` storage bucket (`Aetheris-Credentials.pdf` + the operator playbook PDF) so it always works even if the dynamic plays list is empty.
- Show inline message in the Playbook tab when empty: "Loading from the company playbook…" with a retry button.

## Technical notes
- All edge functions deployed via `supabase--deploy_edge_functions` after writing.
- No DB migrations needed (use existing `lead_actions`, `time_entries`, `playbooks` bucket, `library_items`).
- Reuse `google/gemini-3-flash-preview` for speed on the comment generator.
- Z-index fix is the single highest-impact change — unblocks all workbench usage immediately.
