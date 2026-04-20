

## Content Calendar View with AI Assistant for Admin Library

### What this does

Replaces the flat list view of saved social content in the admin Library tab with an interactive calendar UI showing posts mapped to dates. Adds an AI chat sidebar where you can talk to an assistant to personalize content — add prospect names, swap industries, tweak hooks — and have edits saved back.

### Technical details

**1. New component: `src/components/admin/ContentCalendar.tsx`**

- Monthly calendar grid (custom-built, not the DayPicker widget) showing the current month with navigation arrows
- Each day cell shows dots/badges for saved content items created on that date
- Clicking a day opens a side panel showing all library items for that date with their rendered previews
- Filter by tool type (social content, content calendar, sales scripts, etc.)
- Items are pulled from the existing `listAdminLibrary()` function, grouped by `created_at` date
- Color-coded dots per tool type (amber = social content, crimson = brand contradictions, blue = strategic questions, etc.)

**2. New component: `src/components/admin/ContentAI.tsx`**

- Chat panel (right sidebar or drawer) with an AI assistant
- User can select a library item and ask things like "Add John Smith's name to this case file" or "Change the industry to HVAC" or "Make the hook more aggressive"
- Streams responses from a new edge function
- When the AI returns modified content, a "Save Changes" button updates the library item's `output_data` via the existing admin-library edge function (new `update` action)

**3. New edge function: `supabase/functions/content-assistant/index.ts`**

- Accepts: `messages` array (conversation history) + `context` (the selected library item's output_data and tool_type)
- System prompt instructs the AI to act as a forensic content editor — it can modify any field in the content structure, add names, swap details, rewrite hooks
- Uses Lovable AI gateway (`google/gemini-2.5-flash`) with streaming
- Returns modified content as structured JSON via tool calling so it can be saved back
- Admin-token protected

**4. Update edge function: `supabase/functions/admin-library/index.ts`**

- Add new `action: "update"` that accepts `id` and `output_data` (partial or full) and updates the row
- Admin-token protected (same as existing actions)

**5. Update `src/pages/AdminDashboard.tsx`**

- Replace the `library` tab content: show `ContentCalendar` component instead of the flat `AdminLibrary` list
- Add a toggle or sub-tab to switch between calendar view and list view (keep the existing `AdminLibrary` component as a fallback)

### Files touched

| File | Action |
|------|--------|
| `src/components/admin/ContentCalendar.tsx` | New — monthly grid calendar with library items |
| `src/components/admin/ContentAI.tsx` | New — AI chat sidebar for editing content |
| `supabase/functions/content-assistant/index.ts` | New — streaming AI edge function for content editing |
| `supabase/functions/admin-library/index.ts` | Add `update` action |
| `src/pages/AdminDashboard.tsx` | Swap library tab to calendar + AI layout |
| `src/lib/adminLibrary.ts` | Add `updateAdminLibraryItem()` function |

### What does NOT change

- Content generation tools — identical
- Save-to-library flow — same mechanism
- LinkedIn posting queue — unrelated
- Paywall / Stripe — unrelated
- Public-facing pages — untouched

