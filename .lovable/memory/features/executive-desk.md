---
name: Executive Desk
description: Private shared calendar/tasks/notes for Joseph, Braden and Dean only (exec_items + exec-desk function)
type: feature
---

- Table: `exec_items` (kind: event/task/note; title, details, starts_at/ends_at, status, priority, assignee all|joseph|braden|dean, author, pinned). RLS denies all direct access; only the edge function (service role) reads/writes.
- Edge function: `exec-desk` (list/create/update/delete). Auth = admin token OR portal token whose code is in `EXEC_CODES`: Joseph 163675, Braden 963169, Dean 482917. Everyone else gets 401 "Executive access only".
- UI: `src/components/portal/ExecutiveDesk.tsx` — Calendar (month grid), Tasks (checkbox + assignee), Notes (inline editable).
- Mounted as `Executive Desk` tab in the rep/partner portal (only for the three codes) and in the admin dashboard Ops group.
- Client helpers: `src/lib/execDesk.ts`.
