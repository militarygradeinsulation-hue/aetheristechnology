## Add Delete for Contact Form Submissions

Currently the admin Submissions tab only allows toggling read/unread. Add a delete action so leads can be removed from the list.

### Changes

**1. `supabase/functions/admin-data/index.ts`**
Add a new `delete_submission` action alongside the existing `toggle_read`:
```ts
if (action === "delete_submission") {
  const { id } = body;
  if (!id) return 400;
  const { error } = await supabase.from("contact_submissions").delete().eq("id", id);
  if (error) throw error;
  return { success: true };
}
```
PIN-token auth is already enforced by the function, so no extra auth work needed.

**2. `src/pages/AdminDashboard.tsx`**
- Import `Trash2` from lucide-react.
- Add a `deleteSubmission(id)` handler next to `toggleRead` (line 212) that:
  - Shows a `confirm("Delete this submission? This cannot be undone.")`.
  - Calls `supabase.functions.invoke('admin-data', { body: { action: 'delete_submission', id }, headers: { 'x-admin-token': token } })`.
  - On success, removes it from local `submissions` state and shows a toast.
  - On failure, shows an error toast.
- In the submissions card (line 606), add a second ghost icon button with a red `Trash2` next to the existing eye toggle.

### Out of scope
- No schema migration (just a delete on existing `contact_submissions` rows).
- No bulk-delete or undo (can be added later if needed).
- CRM/contact mirroring is not touched — only the raw form submission row is removed.
