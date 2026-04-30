---
name: Rep & Partner Portal
description: Code-only portal for sales reps and the business partner — separate from /admin
type: feature
---

# Rep & Partner Portal

## Auth
- Route: **`/portal`** (also `/partner-portal` alias). Public, code-only.
- Login = single 6-digit code from `public.rep_codes` (no email, no password).
- Validated via edge function **`rep-portal-login`**, which returns a 12h HMAC token signed with `SUPABASE_SERVICE_ROLE_KEY`.
- Token format: `<expEpochMs>.<role>.<code>.<hmacHex>` (role = "rep" | "partner").
- Client stores token in `localStorage` (`aetheris_portal_token`) + cached profile (`aetheris_portal_profile`).
- Helpers: `src/lib/portalAuth.ts`. Shared verifier: `supabase/functions/_shared/portal-token.ts`.

## Roles (rep_codes.role column)
- `rep` (default) — sees Overview, Commission Calculator, Leads, My Tools, Workspace, AI Sales Coach.
- `partner` — sees everything reps see PLUS a "Company Portal" tab. AI coach gets 4 read-only tools.
- Partner credential: code 963169.

## Tabs (in order)
Overview · Commissions · Leads · My Tools · **Workspace** · AI Coach · (Company)

## AI Sales Coach
- Edge function: `rep-assistant` (model: `google/gemini-2.5-flash`). Gated by portal token.

## Components
- Page: `src/pages/PortalPage.tsx`.
- Coach panel: `src/components/portal/SalesCoachChat.tsx`.
- Leads board: `src/components/portal/LeadsBoard.tsx`.
- Workspace: `src/components/portal/WorkspaceTab.tsx` (+ History/Notes/Settings sub-components).

## Leads system
- Tables: `rep_leads` (shared pool, claim-based) and `rep_activity` (every login + action). Service-role only.
- Edge functions: `portal-leads`, `portal-activity`, admin-side `admin-scrape-leads` (Firecrawl + Gemini).
- Hard caps: 25 active claimed leads per rep. 500 rows max per upload.

## Personal Workspace (added 2026-04)
- Tables (service-role only): `rep_settings` (per-code defaults + preferences), `rep_notes` (free-form notes), `rep_library` (auto-saved tool runs, optionally linked to a rep_lead).
- Edge function: `portal-workspace` — actions: `settings_get/save`, `notes_list/upsert/delete`, `library_list/save/delete`, unified `search`. Gated by portal HMAC token.
- Client wrapper: `src/lib/portalWorkspace.ts`.
- **Auto-save**: SalesScriptGenerator, FollowUpPlanGenerator, StrategicQuestionEngine, BrandContradictionFinder, FrictionVocabularyAudit save outputs via `src/lib/toolSaveHelper.ts` which routes to `rep_library` if a portal session exists, else `admin_library`.
- Settings drive form auto-fill across the 5 tools (business name, industry, tone, sender, signature, default CTA).
- Workspace tab has a global search bar + 3 sub-tabs (History / Notes / Settings).
- Reuses `LibraryItemRenderer` and `generateLibraryPdf` for view + PDF download (same UX as admin library).

## Hard rules
- Portal NEVER grants admin access. `/admin` remains PIN 9822 only.
- Workspace data is fully isolated per `code`. No rep can see another rep's notes or history.
- No Supabase Auth user — fully isolated session via portal HMAC token.
