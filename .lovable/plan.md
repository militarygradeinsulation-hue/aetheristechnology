# Plan — "Too Expensive" objection + Hires & Onboarding hub

## 1. Home page — "Too Expensive" objection card

Directly under the 21-Day Diagnostic + Implementation Retainer pricing tiles on `Home.tsx`, insert a compact premium-tile callout:

- Eyebrow (case-mono): `The objection we hear every time`
- Crimson quote: `"That's just too expensive!"`
- Sub: `Said by every CFO who hasn't done the math yet. Here's the math.`
- CTA button → `/why-us#math` (existing math/objection content lives on Why Us)

This stays above the fold of the pricing section so it works as a quick-reference link any rep can drop into a chat.

## 2. New admin tab — "Hires & Onboarding"

Inserted between **Careers** and **Company Calendar** in `AdminDashboard.tsx`. New component `AdminHiresOnboardingPanel.tsx` with three sub-sections:

### a) Hired roster
- Lists every active `rep_codes` row grouped by team
- Inline team selector (Team 1 / Team 2 / + new team)
- "Remove" button → cascades: deletes `rep_codes` row, `rep_mailboxes`, `rep_settings`, `rep_notes`, `rep_library`, and any portal session record. Existing `ON DELETE CASCADE` already removes most; we add an edge function call `revoke-rep-access` to clear `portal_sessions` and `auth.users` row if one exists, so login dies the second they're removed.

### b) Teams & engagement schedules
- Default seeded teams:
  - **Team 1 — Veterans** (6mo+): weekly leadership sync, monthly strategy deep-dive, quarterly comp review
  - **Team 2 — New hires** (0–6mo): daily 15-min stand-up week 1, 3x/week coaching weeks 2–4, weekly 1:1 month 2+, training module due every Friday
- Admins can add a team, edit cadence items, set reminder day-of-week
- Each cadence item has a "Send to company calendar" toggle that mirrors into existing `companycal` entries

### c) New-hire engagement playbook
Static-but-editable reference card with operator-tone tips:
- Day 1 outreach script (Slack/email template)
- Week 1 check-in questions ("What blocked you today?")
- Red-flag signals to escalate
- Reactivation script if they go quiet 48h+

Stored in a new `hire_playbook_entries` table so Brandon and I can edit on the fly.

## 3. Database changes

```sql
-- Team field on reps
ALTER TABLE rep_codes ADD COLUMN team_name text DEFAULT 'Team 2 — New hires';
CREATE INDEX rep_codes_team_idx ON rep_codes(team_name);

-- Teams catalog (so we can rename / add)
CREATE TABLE hire_teams (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text UNIQUE NOT NULL,
  description text,
  experience_band text,
  sort_order int DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- Per-team cadence
CREATE TABLE hire_team_cadence (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id uuid REFERENCES hire_teams(id) ON DELETE CASCADE,
  title text NOT NULL,
  cadence text NOT NULL, -- daily | weekly | monthly | quarterly
  day_of_week int,       -- 0–6 when weekly
  notes text,
  push_to_calendar boolean DEFAULT false,
  sort_order int DEFAULT 0
);

-- Engagement playbook entries
CREATE TABLE hire_playbook_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  section text NOT NULL,  -- day_one | week_one | red_flags | reactivation
  title text NOT NULL,
  body text NOT NULL,
  sort_order int DEFAULT 0,
  updated_at timestamptz DEFAULT now()
);
```

All three tables get RLS: admin-only via `is_admin(auth.uid())`. Seeded with Team 1 + Team 2 + default cadences + 8 starter playbook entries.

## 4. Cascading login removal

New edge function `revoke-rep-access`:
- Validates admin JWT
- Accepts `{ code }`
- Calls `supabase.auth.admin.deleteUser()` for any auth user matching the rep's email
- Deletes any rows in `portal_sessions` (if exists) for that code
- Deletes the `rep_codes` row (cascade handles dependents)
- Returns `{ revoked: true }`

`ManageRepsPanel` and the new Hires panel both call this instead of the existing `deleteRepCode`, so login dies instantly.

## Files touched
- `src/pages/Home.tsx` — insert objection callout
- `src/pages/AdminDashboard.tsx` — register new `hires` tab between Careers and Company Calendar
- `src/components/admin/AdminHiresOnboardingPanel.tsx` — new
- `src/lib/hireTeams.ts` — new client lib (CRUD for teams, cadence, playbook, revoke)
- `supabase/functions/revoke-rep-access/index.ts` — new edge function
- migration: tables + RLS + seed data
