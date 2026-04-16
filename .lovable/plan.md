

The user wants:
1. Persistent personal library for all admin tool generations (don't lose work when backing out)
2. Copy + Download options on every saved item
3. New "Playbook Creator" tool in the admin Tools tab that saves generated playbooks to a personal library

Let me check existing infrastructure quickly.
<lov-tool-use id="toolu_vrtx_0111ewAM19hJjjFQcfEzyHvH" name="code--search_files" integration-id="code" data="{\"query\": \"tool_generations\", \"include_patterns\": \"*.tsx,*.ts\"}">
</lov-tool-use>

<lov-tool-use id="toolu_vrtx_01ACL5cvYkP9z5F8QvnLNSjp" name="code--view" integration-id="code" data="{\"file_path\": \"supabase/functions/generate-custom-playbook/index.ts\", \"lines\": \"1-60\"}">
</lov-tool-use>

<lov-tool-use id="toolu_vrtx_01SaU9uMSgPeAg5mzNdbPk2H" name="code--search_files" integration-id="code" data="{\"query\": \"tool_generations\", \"include_patterns\": \"*.tsx,*.ts\"}">
</lov-tool-use>

<lov-tool-use id="toolu_vrtx_01EPCRPzH9tqpNHiHLbSuMwP" name="code--view" integration-id="code" data="{\"file_path\": \"supabase/functions/generate-custom-playbook/index.ts\", \"lines\": \"1-80\"}">
</lov-tool-use>

<lov-tool-use id="toolu_vrtx_01U3C7ifaDtrd6xfZBVRRJaU" name="code--view" integration-id="code" data="{\"file_path\": \"src/integrations/supabase/types.ts\", \"lines\": \"1-50\"}">
</lov-tool-use>
I have enough context. The auth issue: admin uses sessionStorage passcode (not Supabase auth), so saved tool runs can't be tied to `auth.uid()`. I'll use a dedicated `admin_tool_library` table with service-role-only RLS, and the client will use a passcode-validated edge function (or simply `is_admin`-style check via header). Simplest: use a public table with a special "admin" marker, but more secure is an edge function gateway. Given the existing pattern (sessionStorage flag, no real auth), I'll use service-role edge functions for admin save/list/delete + a shared admin secret check. Or simpler: use the sessionStorage flag and a service-role edge function with a passcode in the body.

Let me check the existing admin pattern.
<lov-tool-use id="toolu_vrtx_018xDwPtLeZ6g11isyJCxp9X" name="code--view" integration-id="code" data="{\"file_path\": \"supabase/functions/admin-insights/index.ts\", \"lines\": \"1-40\"}">
</lov-tool-use>

<lov-tool-use id="toolu_vrtx_016nUHzCBz9JjKqhuNMLoGCY" name="code--view" integration-id="code" data="{\"file_path\": \"src/pages/AdminLogin.tsx\"}">
</lov-tool-use>
I have full context. Now I'll present the plan.

<lov-plan>

## Goal
Anything you generate inside the `/admin` Tools tab gets saved to a personal "My Library" so it survives page navigation. Each saved item has Copy and Download buttons. Add a new "Playbook Creator" tool that saves custom playbooks you can re-download anytime.

## How It Works

**1. New `admin_library` table** stores every tool run keyed by a server-side admin secret (not `auth.uid`, since admin uses the 9822 passcode, not Supabase auth):
- `id`, `tool_type`, `title`, `input_data` (jsonb), `output_data` (jsonb), `file_url` (nullable, for playbook PDFs), `created_at`
- RLS: service-role only. All access goes through a new edge function `admin-library` that requires the admin passcode (`9822`) in the request body.

**2. New edge function `admin-library`** with actions: `list`, `save`, `delete`, `get`. Validates passcode against env var on every call.

**3. Auto-save on every admin tool run.** Update each of the 7 tool components — when `adminMode={true}` and a generation completes, call `admin-library` with action `save`. Title is auto-derived (e.g., "LinkedIn — example.com — Apr 16").

**4. New "📚 Library" sub-tab inside the Tools section.** Lists all saved items grouped by tool type, newest first. Each card shows:
- Title + timestamp + tool icon
- "View" button — re-opens the saved output inline (read-only, with full Copy buttons)
- "Copy All" button — copies the full output to clipboard
- "Download" button — exports as `.txt` (or `.md` for playbooks, `.pdf` if file_url exists)
- "Delete" button — removes from library

**5. New "Playbook Creator" tool** (8th tool) inside Tools:
- Form: Title, Subtitle, Pillar (Sales / Marketing / AI / Strategy), Tags
- Calls existing `generate-custom-playbook` edge function (which already produces a 4-5k word PDF and stores it in the `playbooks` Supabase storage bucket)
- On success, saves a row to `admin_library` with `tool_type='playbook'`, `file_url=<pdf url>`, `title=<title>`
- Library card shows "Download PDF" linking directly to the stored file

## Files Changed
- **New:** `supabase/migrations/<timestamp>_admin_library.sql` — create `admin_library` table + RLS
- **New:** `supabase/functions/admin-library/index.ts` — gated CRUD edge function
- **New:** `src/components/AdminLibrary.tsx` — library viewer UI with copy/download/delete
- **New:** `src/components/PlaybookCreator.tsx` — playbook creator form + admin-library save
- **Edit:** `src/pages/AdminDashboard.tsx` — add "Library" sub-tab and "Playbook Creator" tool tile; share an `onAdminSave` callback to all 7 tools
- **Edit (7 tools):** `SocialContentGenerator`, `SalesScriptGenerator`, `ContentCalendarGenerator`, `FollowUpPlanGenerator`, `StrategicQuestionEngine`, `BrandContradictionFinder`, `FrictionVocabularyAudit` — when `adminMode`, auto-save result via `admin-library` edge function

## Notes
- Existing public tool pages stay untouched (no save behavior).
- The `generate-custom-playbook` edge function already exists and handles PDF generation + storage.
- "Back to Tools" no longer loses your work — everything is in the Library.

