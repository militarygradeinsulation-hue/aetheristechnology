---
name: Rep Calendar
description: Per-rep monthly calendar with events/reminders/notes/follow-ups linked to leads, rep + admin notes
type: feature
---

- Table: `rep_calendar_events` (kind: event/reminder/note/follow_up/call/meeting/task; lead_id → rep_leads; rep_notes vs admin_notes; completed flag).
- Edge function: `portal-calendar` (list/create/update/delete). Auth: portal token (rep) OR admin token. Reps can only edit their own; admins can edit any rep and add `admin_notes`.
- UI: `RepCalendarView` (shared) shows month grid, click-to-edit, +New, kind colors, active-leads quick "schedule follow-up" chips. Admin notes shown to reps in a highlighted callout.
- Mounted in: rep portal as `Calendar` tab; admin dashboard as `📅 Rep Calendars` with rep picker.
