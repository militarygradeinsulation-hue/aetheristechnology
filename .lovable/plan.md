# Personal Rep Workspace (Per-Code Persistence)

Turn the Rep & Partner Portal into a personal CRM for each rep. Everything keyed to their 6-digit `code` so it follows them across logins/devices.

## What you get

1. **Saved settings** per rep code (defaults that auto-fill every tool).
2. **Notes area** — free-form scratchpad with multiple notes, search, pin/star, last-edited timestamps.
3. **History area** — every tool run (Sales Script, Follow-Up Plan, Strategic Questions, Brand Contradictions, Friction Audit, Website Scanner, Business Diagnostic) is auto-saved with title, input, output, and timestamp.
4. **Search bar** across all history + notes (title, body, tool type, prospect/business name).
5. Reuses the same View / Copy / Download PDF / Download .txt / Delete actions the admin library has.

---

## How it fits the existing portal

New tab in `/portal` between **My Tools** and **AI Coach**:

```text
Overview | Commissions | Leads | My Tools | Workspace | AI Coach | (Company)
                                            ^^^^^^^^^ NEW
```

Workspace tab has 3 sub-tabs: **History**, **Notes**, **Settings** — with one global search bar at the top that filters History + Notes simultaneously.

---

## Technical Plan

### 1. Database (one migration, three tables — all service-role only)

```sql
-- Per-rep saved defaults that auto-fill tool forms
create table public.rep_settings (
  code text primary key references public.rep_codes(code) on delete cascade,
  defaults jsonb not null default '{}'::jsonb,  -- { business_type, target_audience, tone, signature, ... }
  preferences jsonb not null default '{}'::jsonb, -- { theme_density, default_tab, ... }
  updated_at timestamptz not null default now()
);

-- Free-form notes
create table public.rep_notes (
  id uuid primary key default gen_random_uuid(),
  code text not null references public.rep_codes(code) on delete cascade,
  title text not null default 'Untitled',
  body text not null default '',
  pinned boolean not null default false,
  tags text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index rep_notes_code_idx on public.rep_notes(code, updated_at desc);

-- Auto-saved tool runs (mirror of admin_library, scoped to rep code)
create table public.rep_library (
  id uuid primary key default gen_random_uuid(),
  code text not null references public.rep_codes(code) on delete cascade,
  tool_type text not null,           -- 'sales_scripts' | 'follow_up_plan' | ...
  title text not null,
  input_data jsonb not null default '{}'::jsonb,
  output_data jsonb not null default '{}'::jsonb,
  file_url text,
  lead_id uuid references public.rep_leads(id) on delete set null, -- optional link to a claimed lead
  created_at timestamptz not null default now()
);
create index rep_library_code_idx on public.rep_library(code, created_at desc);
create index rep_library_search_idx on public.rep_library using gin (to_tsvector('english', title));
```

All three tables: RLS on, **service-role only**. Reps reach them via the existing portal HMAC token.

### 2. Edge function: `portal-workspace`

Single function (mirrors `portal-leads` pattern), gated by `x-portal-token`:

| action | does |
|---|---|
| `settings_get` / `settings_save` | read/write `rep_settings` for the code |
| `notes_list` / `notes_upsert` / `notes_delete` | full CRUD on rep_notes |
| `library_list` (with `q`, `tool_type`, `lead_id` filters) | search + filter |
| `library_save` | called by tools when generating |
| `library_delete` | remove an item |
| `search` | unified search across notes + library, ranked by recency |

### 3. Frontend

- **`src/lib/portalWorkspace.ts`** — wrapper functions identical in shape to `adminLibrary.ts` (`saveToRepLibrary`, `listRepLibrary`, `deleteFromRepLibrary`, `getRepSettings`, `saveRepSettings`, `listRepNotes`, `upsertRepNote`, `deleteRepNote`, `searchWorkspace`).
- **`src/components/portal/WorkspaceTab.tsx`** — new component with global search input + tabs:
  - `WorkspaceHistory.tsx` — reuses `LibraryItemRenderer` + the same view/copy/download/PDF/delete row UI from `AdminLibrary.tsx`. Filter chips per tool type. Optional "Linked to lead: X" badge when item has `lead_id`.
  - `WorkspaceNotes.tsx` — list on the left, editor on the right (title, markdown body, pin toggle, tags). Auto-save on blur. "New note" button.
  - `WorkspaceSettings.tsx` — form for default business name, industry, tone, signature, default CTA URL, etc. Saved values auto-fill tool inputs.
- **`src/pages/PortalPage.tsx`** — add `'workspace'` to `Tab` union, render new tab, log `tab_view` activity.

### 4. Auto-save tool outputs to rep library

The 5 generators already call `saveToAdminLibrary` when `adminMode` is true. Add a parallel `staffMode` (or extend the existing prop) so when launched from the portal they call `saveToRepLibrary` instead. One small change per tool component (~3 lines each).

Tools that get history saving:
- Sales Script Generator
- Follow-Up Plan Generator
- Strategic Question Engine
- Brand Contradiction Finder
- Friction Vocabulary Audit
- Website Scanner (saves scan URL + score + summary)
- Business Diagnostic (saves answers + score)

### 5. Settings auto-fill

When opening any tool from the portal, read `rep_settings.defaults` once and pre-populate matching form fields (business name, industry, tone, sender name, signature). Rep can override per-run; saving from Settings updates the defaults.

### 6. Activity logging

Existing `portal-activity` already tracks tab views. Add events: `note_create`, `note_update`, `library_save`, `settings_save`, `workspace_search` so admin's RepActivityPanel shows engagement depth.

---

## Files Touched

**New**
- `supabase/migrations/<ts>_rep_workspace.sql`
- `supabase/functions/portal-workspace/index.ts`
- `src/lib/portalWorkspace.ts`
- `src/components/portal/WorkspaceTab.tsx`
- `src/components/portal/WorkspaceHistory.tsx`
- `src/components/portal/WorkspaceNotes.tsx`
- `src/components/portal/WorkspaceSettings.tsx`

**Edited**
- `src/pages/PortalPage.tsx` (new tab + wiring + pass `staffMode` to embedded tools)
- `src/components/SalesScriptGenerator.tsx`, `FollowUpPlanGenerator.tsx`, `StrategicQuestionEngine.tsx`, `BrandContradictionFinder.tsx`, `FrictionVocabularyAudit.tsx`, `WebsiteScanner.tsx`, `BusinessDiagnostic.tsx` (~3 lines each — branch save target)
- `.lovable/memory/features/rep-partner-portal.md` (document the workspace)

## Hard rules carried forward
- Workspace data is fully isolated per `code`. No rep can see another rep's notes or history.
- No Supabase Auth required — uses portal HMAC token only.
- Admin (`/admin`, PIN 9822) is unaffected and keeps its own `admin_library`.
