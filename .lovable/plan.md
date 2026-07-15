# Aetheris Leadership Calendar — 3 Principals, Clear Lanes

Extend the existing Company Calendar into a **leadership-aware** system with three lanes locked to your org chart. Keep it simple: one calendar, color-coded by principal, filter by lane. Add an AI "Playbook Generator" that reads the role definitions and produces a week's worth of tasks for each principal automatically.

## The Three Lanes (locked)

```text
FOUNDER (Joseph, "The Architect")   → brand · product · methodology · findings
COO (Dean)                          → delivery · people · accountability · quality
CHIEF OF SALES (Braden)             → pipeline · training · tool vetting
```

## What gets built

### 1. Backend — extend `company_calendar`

New migration adds two columns (non-breaking):
- `owner_role text` — `'founder' | 'coo' | 'chief_sales' | 'team'` (default `'team'`)
- `owner_name text` — display label ("Joseph", "Dean", "Braden", "Team")
- `status text` — `'todo' | 'doing' | 'done'` (default `'todo'`)
- `due_time time` — optional time-of-day for the task

Index on `owner_role, date`. Grants + RLS unchanged (service-role managed like today).

New table `leadership_roles` seeded with the 3 principals (name, role, owns, does_not_own, decision_authority) so the AI planner and UI both read from one source of truth. You can edit these later without a code deploy.

### 2. Edge function — `company-calendar` extended

- `list` accepts `owner_role` filter
- `create`/`update` persist `owner_role`, `owner_name`, `status`, `due_time`
- New action `ai_playbook`: takes a goal + week start date, calls Lovable AI (gemini-2.5-flash), returns a JSON array of tasks pre-assigned to each principal based on their lane definition from `leadership_roles`. Refuses to cross lanes (e.g. won't hand Sales tasks to the Founder).
- New action `mark_status`: quick toggle todo→doing→done.

### 3. Frontend — `AdminCompanyCalendarPanel`

Simple, not busy:
- **Header strip**: 3 principal pills (Joseph amber · Dean blue · Braden emerald · Team muted). Click to filter. "All" resets.
- **Leadership Structure** collapsible card at top showing each principal's `owns / does not own / decision authority` (pulled from `leadership_roles`, editable inline by admin).
- **Calendar grid**: existing month view, entries color-bordered by `owner_role`.
- **Editor dialog**: adds "Assign to" (Joseph/Dean/Braden/Team), "Status", "Time".
- **"Generate week's playbook" button** (top-right): dialog asks for the week's north-star goal ("Close 3 Diagnostics", "Onboard Dean", etc.), then AI drafts 3–6 tasks per principal for the next 7 days. Preview → accept-all or edit before saving.

### 4. Rep-side (`CompanyCalendarRepView`)

Add a small "Leadership" legend row so reps see who owns what that day. No behavior change beyond the color chips.

## Technical details

- Migration file: `supabase/migrations/<ts>_leadership_calendar.sql`
- New lib: `src/lib/leadershipRoles.ts` (typed CRUD for `leadership_roles`)
- `src/lib/companyCalendar.ts` gets `OwnerRole` type + `OWNER_META` (name, color, swatch)
- AI prompt for `ai_playbook` embeds the leadership doctrine from the uploaded infographic verbatim (lanes, decision authority, standing principle: "each person owns their lane fully").
- No new external secrets — uses existing `LOVABLE_API_KEY`.

## Out of scope for this pass
- Notifications / email digests
- Recurring tasks
- Cross-linking tasks to CRM leads

Say "go" and I'll ship it. If you want to trim (e.g. skip the editable roles table and hardcode the 3 principals for now) tell me and I'll cut that piece.