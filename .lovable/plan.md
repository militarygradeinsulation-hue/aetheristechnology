## 1. Catalog page — premium look, packages over à la carte

- Add a new **Packages** section to `CatalogPage.tsx` above the existing Premium Tech Suite, with three tiers (CTA = "Request access" → opens ContactModal). No Stripe checkout — these are operator-led so they feel premium and exclusive.

  - **Starter — "First Look"** ($499/mo or one‑time)
    - Full Website Report, Digital Snapshot, Social Content Pack, Brand Contradiction Finder, Friction Vocabulary Audit
    - For owners testing the waters who want signal fast.

  - **Operator — "Revenue Systems"** ($1,499/mo)
    - Everything in First Look, plus: Strategy Blueprint, Content Calendar, Follow‑Up Plan, Sales Script Pack, Lead‑Nurture Automation, Strategic Question Engine
    - For $1M–$10M companies that want the working tools, not just the scan.

  - **Full Suite — "The Forensic Suite"** (Operator‑only, by application)
    - Everything in the catalog, the full Premium Tech Suite, plus the Forensic Diagnostic ($2,500 credit applied) and a Fractional CTO/CMO seat.
    - For owners who want the whole machine — price shown only after a fit call.

- Below the package tiers, keep the existing à la carte Premium Tech Suite but **grey it out**: wrap `<ServicesPricing />` in a `.catalog-suite-faded` container (`opacity-50`, hover lift removed) with a top banner "À la carte pricing under review — buy as a package above for the full operator stack." Prices stay visible but no checkout buttons fire (pointer‑events disabled on the price chips and CTAs).

## 2. Gated content — playbooks + field notes (blog)

Make Joseph's library feel exclusive: a few free samples, the rest behind a short signup that returns a personal access code.

- **DB migration** — `public.access_codes` table:
  - `code text primary key` (8‑char base36)
  - `name`, `email`, `phone`, `created_at`, `last_used_at`
  - `unique(lower(email))`
  - RLS: no anon read; service_role full. Edge function handles all reads/writes.

- **Edge function** `request-access-code`:
  - Input: `{ name, email, phone }` (zod validation)
  - Generates a code, upserts on email, returns `{ code }`.
  - Already covered by INBOUND_EMAIL infra — for now the code is returned in‑UI; no transactional email until Joseph asks for it.

- **Edge function** `verify-access-code`:
  - Input: `{ code }` → `{ valid: boolean }`. Updates `last_used_at`.

- **New component** `AccessGate.tsx`:
  - Two tabs: **Get a code** (name/email/phone form) and **Have a code** (single input).
  - On success, stores code in `localStorage` under `aetheris_access_code` and calls an `onUnlocked()` callback. Shows the code prominently after signup so they can save it.

- **Gating rules**
  - `BlogList.tsx`: show the first **3** newest posts free. Render the rest only if `aetheris_access_code` is present in localStorage; otherwise show `<AccessGate />` instead of the remaining cards, plus a small "Members read X more field notes" line.
  - `ResourcesPage.tsx`: show the first **2** playbooks free; gate the rest the same way.
  - `BlogPostPage.tsx`: leave individual post URLs open (they're already discoverable via SEO) — gating lives at the list level so direct links from search still resolve.

## 3. Out of scope

- No emailing the code yet (returns it in‑UI).
- Existing Stripe products for individual tools stay registered (greying out is presentation‑only); we keep the option to re‑enable per‑item checkout later.
- No login/auth system — code lives in localStorage. Joseph can grant or revoke codes from the DB directly via the existing admin tools.

## Files

- New: `src/components/PackageTiers.tsx`, `src/components/AccessGate.tsx`, `supabase/functions/request-access-code/index.ts`, `supabase/functions/verify-access-code/index.ts`
- Edited: `src/pages/CatalogPage.tsx`, `src/components/BlogList.tsx`, `src/pages/ResourcesPage.tsx`, `src/index.css` (the `.catalog-suite-faded` rule)
- Migration: `access_codes` table + RLS + GRANTs
