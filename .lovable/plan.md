

The user uploaded files from a different "CTOguy.ai Project Vision" project (a project management dashboard with team workload, tasks, AI chatbot). They want me to:
1. Build a **full CRM** into the admin backend to consolidate/clean things up
2. **Showcase this custom CRM as a demo on the front-end** for clients to see

The TO-DO.json hints at CRM scope: contacts, interactions, leads, pipeline stages, CSV import.

Looking at current state — there's already `drip_prospects` (basically leads), `contact_submissions`, `assessment_leads`, `diagnostic_leads`, `subscriber_profiles`, `purchases`. These are scattered. A real CRM should unify them into Contacts + Companies + Deals + Interactions.

Let me ask one clarifying question about scope so I don't overbuild, then present the plan.

Actually — the request is clear enough. Let me present a plan with sensible defaults and let the user prune.

---

# Plan: Aetheris CRM (Admin tool + Public demo)

## What you'll get

**1. A unified CRM inside `/admin`** — one place that ties together every contact, lead, and deal. Cleans up the scattered tables (drip prospects, contact submissions, assessment/diagnostic leads, purchases) by surfacing them as one timeline per person.

**2. A live demo CRM on the public site** at `/crm-demo` — read-only, sandboxed sample data, branded to look exactly like the real admin tool. Shareable link for client pitches.

## Scope

### Data model (new tables)
- `crm_companies` — name, website, industry, size, notes
- `crm_contacts` — name, email, phone, title, company_id, owner, tags
- `crm_deals` — title, contact_id, value, stage (Lead → Qualified → Proposal → Won/Lost), close date
- `crm_interactions` — contact_id, type (call/email/meeting/note), subject, body, occurred_at
- `crm_demo_data` — pre-seeded fictional companies/contacts/deals for the public demo (separate so the demo is never polluted with real data)

All tables: RLS locked to `is_admin(auth.uid())` for the real CRM; demo table is publicly readable.

### Admin CRM UI (new tab in `/admin`)
- **Contacts list** — searchable, filterable by tag/owner, CSV import
- **Contact detail** — profile + interaction timeline + linked deals + linked company
- **Companies list + detail** — same pattern
- **Deals pipeline** — Kanban board with drag-and-drop between stages
- **Interactions log** — quick-add call/email/meeting/note from any contact
- **Auto-import bridges**:
  - New `contact_submissions` → auto-create CRM contact + "Inbound form" interaction
  - New `drip_prospects` → CRM contact tagged "outbound"
  - New `purchases` → CRM deal marked Won
  - New `diagnostic_leads` / `assessment_leads` → contact + scored interaction

### Public Demo (`/crm-demo`)
- Same UI components, fed from `crm_demo_data` (fictional brands like "Northpoint Logistics", "Helix Medical", etc.)
- Banner: "Live demo of the Aetheris CRM — sample data only"
- Read-only: drag/edit interactions show a toast "Demo mode — sign up to enable editing"
- Linked from `/services` and a new nav entry "See our CRM"

## File changes (high level)

```text
NEW  supabase/migrations/* — 5 tables + RLS + seed demo data
NEW  src/components/crm/
       ContactsList.tsx
       ContactDetail.tsx
       CompaniesList.tsx
       DealsPipeline.tsx        ← Kanban drag-drop (use @dnd-kit)
       InteractionTimeline.tsx
       QuickInteractionModal.tsx
       CsvImportDialog.tsx
       CrmShell.tsx             ← shared layout (used by admin + demo)
NEW  src/lib/crm.ts             ← typed query helpers
NEW  src/pages/CrmDemoPage.tsx  ← public read-only demo
EDIT src/pages/AdminDashboard.tsx — add "CRM" tab
EDIT src/App.tsx — add /crm-demo route
EDIT supabase/functions/admin-data/index.ts — CRM read endpoints
NEW  supabase/functions/crm-import-csv/index.ts
NEW  supabase/functions/crm-bridge-leads/index.ts ← cron-style sync from existing lead tables
```

## What I'm NOT including (tell me if you want any)
- Email send-from-CRM (you already have the campaign tool)
- Reporting/analytics charts (your admin already has insights)
- AI chat inside the CRM (can add a Lovable AI "summarize this contact" button if you want)
- Mobile app

## Order of work
1. Migrations + RLS + demo seed
2. Shared CRM components (ContactsList, ContactDetail, Timeline)
3. Companies + Deals pipeline (Kanban)
4. CSV import + lead-table bridge
5. Wire admin tab
6. Build public `/crm-demo` page
7. Add nav link + landing-page mention

