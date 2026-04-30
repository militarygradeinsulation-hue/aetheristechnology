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
- The legacy `/rep-portal` page (code+email login, stats only) still exists for backwards compatibility — new portal is `/portal`.

## Roles (rep_codes.role column)
- `rep` (default) — sees Overview, Commission Calculator, My Tools, AI Sales Coach.
- `partner` — sees everything reps see PLUS a "Company Portal" tab. Their AI coach has 4 read-only tools: `get_company_summary`, `list_all_reps`, `list_recent_leads`, `list_recent_contact_submissions`. Never gets admin tools.

## Partner credential (seeded)
- Code: **963169**, name: "Business Partner", email: partner@aetheris.technology, role: partner.
- Created in migration; renameable via admin Reps panel anytime.

## AI Sales Coach
- Edge function: **`rep-assistant`** (model: `google/gemini-2.5-flash`).
- Gated by portal token. NOT the public sales chat, NOT the admin assistant.
- System prompt = full pricing ladder + 10% commission rules + objection-handling playbook.
- Partners get an addendum + the 4 read-only company tools.
- Suggestion chips: same `<suggestions>[...]</suggestions>` parser pattern as AdminAssistant/SalesChat.

## Components
- Page: `src/pages/PortalPage.tsx` (login + 4-or-5-tab dashboard).
- Coach panel: `src/components/portal/SalesCoachChat.tsx` (works embedded or floating).
- Reuses: `src/components/admin/CommissionStructurePanel.tsx` (no admin dependency, pure UI).

## Hard rules
- Portal NEVER grants admin access. `/admin` remains PIN 9822 only.
- No CRM, no edit/delete, no admin tools, no Supabase Auth user — fully isolated session.
