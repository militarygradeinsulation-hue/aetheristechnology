# Wire Up the New-Rep Onboarding Curriculum

The narrated 12-module onboarding system is already built (component, player, edge functions, curriculum script, DB table) but two pieces are missing: an **admin button to generate the modules**, and the **rep-side library hook into the portal**. No modules exist in the DB yet, which is why nobody sees anything.

## What gets built

### 1. Admin: Onboarding Studio panel
A new card inside the **Admin Dashboard** (alongside existing training/playbook tools) that:
- Lists all 12 curriculum modules from `onboardingCurriculum.ts` with their current status (`pending` / `generating` / `ready` / `failed`) pulled from the `onboarding_modules` table.
- "Generate" button per module → calls existing `onboarding-generate` edge function (already deployed).
- "Generate ALL missing" button → loops through and generates any module not yet `ready`.
- "Regenerate" on completed ones (overwrites slides + audio).
- Inline preview using the existing `OnboardingPlayer` component so admin can watch before reps do.
- Shows total duration, slide count, last-generated timestamp, and any error message.

### 2. Rep portal: Onboarding tab
- Add a new tab `'onboarding'` to `PortalPage.tsx` labeled **"New Rep Onboarding"** with a `GraduationCap` icon (distinct from Team Training).
- Tab body renders the existing `<OnboardingLibrary />` component (already coded — lists ready modules, opens player, tracks watched seconds via `onboarding-progress`).
- Add it to the default visible-tabs set so new reps see it immediately.
- Show a subtle progress badge on the tab (e.g. "3/12") pulled from `listProgress()`.

### 3. Optional: Overview widget
Small "Onboarding progress" card on the rep portal Overview tab showing % complete with a "Resume training" button. Shown only when there are unfinished modules.

## Technical details

- **No schema changes.** `onboarding_modules` table and `onboarding_progress` table already exist.
- **No new edge functions.** `onboarding-generate` and `onboarding-progress` already deployed.
- Admin panel calls `generateModule()` from `src/lib/onboardingApi.ts` (already exists).
- Generation uses Lovable AI (`google/gemini-2.5-pro`) for slides + ElevenLabs for narration audio (already wired in the edge function).
- Files touched:
  - `src/pages/PortalPage.tsx` — add tab + body case
  - `src/pages/AdminDashboard.tsx` — mount new admin panel
  - `src/components/admin/OnboardingStudio.tsx` *(new)* — admin generator UI
  - `src/components/portal/OnboardingLibrary.tsx` — minor: optional progress badge export

## Out of scope (ask if you want these)

- Downloadable MP4 + PDF package to email new hires (the `onboardingPackage.ts` lib exists but isn't surfaced — separate task).
- Editing slide text after generation (currently regenerate-only).
- Per-rep assignment / required-by date.
