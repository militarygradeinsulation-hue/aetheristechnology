

## What you're asking

Repositioning Aetheris from "AI Systems Architect / 10-industry consulting" to **"Business Forensics Operator"** — a category-of-one brand built around a named methodology (**The Leak Audit™**), forensic case-file aesthetics, and a tighter funnel from content → free audit → paid diagnostic → Co-CEO engagement.

I'll execute this in **phases** so we ship a credible v1 in one pass and layer the rest after you see it live. This plan covers **Phase 1 (the rebrand foundation)**. Phases 2–4 are scoped at the bottom so you know what's coming.

---

## Phase 1 — Rebrand foundation (this build)

### 1. Hero + homepage rewrite (`src/components/Hero.tsx`, `src/pages/Home.tsx`)
- New H1: **"Your business is leaking. You just can't see it from the inside."**
- Sub: "We run forensic audits on operations, marketing, and systems — find where revenue is bleeding out, then rebuild with AI."
- New eyebrow chip: "Business Forensics Operator · Indianapolis"
- Replace TL;DR copy to lead with the forensics frame, not the keyword stack.
- Primary CTA: **"Run the Free Leak Audit"** → `/leak-audit`
- Secondary: "Book a Forensic Diagnostic" → opens HubSpot meeting link
- Kill the existing italic "honesty & accuracy" pull-quote (replaced by the leak hook).

### 2. Name the methodology — "The Leak Audit™"
- New `src/components/LeakAuditMethod.tsx` on the homepage (replaces the current `ServiceCapabilities` slot in flow).
- Visual: 7-step forensic process rendered as a numbered case-file dossier. Steps:
  1. Intake — surface symptoms
  2. Reconnaissance — map systems, channels, handoffs
  3. Trace — follow the lead/dollar/hour from entry to exit
  4. Identify — name each leak (Stale Lead, Quote Follow-Up, Trust Gap, Response Time, etc.)
  5. Quantify — dollar value per leak per year
  6. Prescribe — exact fix (system, automation, AI, or human)
  7. Seal — implement & verify
- Trademark glyph (™) on first mention everywhere.

### 3. Visual identity shift — "Forensic Field Kit"
- New `src/components/CaseFileCard.tsx` reusable component:
  - "CASE FILE #0XX" top-left in mono
  - Business type label
  - Leak found
  - Dollar amount bled
  - Status stamp ("SEALED" / "ACTIVE")
- Add **oxidized-red accent** as a *second* accent token in `tailwind.config.ts` + `index.css` (`--crimson: 0 65% 38%`), used sparingly on case files and "leak found" callouts. Keeps amber as primary brand; crimson is the forensic signal color.
- Add a **serif display font** (`Fraunces` via Google Fonts — close to Tiempos, free) and a **technical mono** (`JetBrains Mono`, already common) — wire into `tailwind.config.ts` as `font-forensic` (serif) and `font-case` (mono). Existing Space Grotesk + Inter stay for body/UI; serif is reserved for autopsy headlines and case files only, so we don't blow up the existing system.

### 4. New page: `/leak-audit` (the free lead magnet)
- New file: `src/pages/LeakAuditPage.tsx` + route in `App.tsx`.
- 14-point self-scoring audit (radio/slider per question) across 4 categories: **Lead Capture, Response & Follow-Up, Operational Drag, Trust & Conversion**.
- Score → "Leak Severity" rating with estimated annual $ bleeding (uses simple multipliers tied to user-input revenue band).
- Email-gate the **detailed PDF report** (uses existing `generateDiagnosticPdf.ts` pattern — new generator `generateLeakAuditPdf.ts`).
- Saves to existing `assessment_leads` table (new `source: 'leak_audit'` value) — no new table needed.
- Soft CTA at end: "Book the paid Forensic Diagnostic — $2,500. Applied toward engagement if you proceed."

### 5. Pricing page reframe (`src/components/ServicesPricing.tsx`)
- Lead with **The Forensic Diagnostic — $2,500** (rename current "14-Day Diagnostic"). Frame it as the diagnosis you pay for; everything else is the prescription.
- Add the credit-toward-engagement note explicitly.
- Demote the long industry/services list — kept on `/services` but pushed below the diagnostic.

### 6. Navbar + LinkedIn-ready bio block
- Navbar: keep simple. No new items — the `/leak-audit` flows from CTAs, not nav clutter.
- New `src/components/OperatorBio.tsx` shown on `/about` — short forensic-operator framing (psychology + Marine + operator stack), one accent line, one case-stat. Replaces the current generic CEO copy block.

### 7. SEO + AEO updates
- Update `SEOHead` titles/descriptions on `/`, `/about`, `/services` to lead with "Business Forensics Operator" + the leak hook. Keep Indianapolis + AI consulting keywords inside the description so we don't tank existing rankings.
- Update FAQ entries to use forensic language ("What is a Leak Audit?", "How do you find revenue leaks?").
- Add `/leak-audit` to `public/sitemap.xml`.

### 8. Memory updates
- Update `mem://business/brand-strategy` → new positioning.
- New `mem://style/forensic-identity` → case-file visual system, crimson accent, serif/mono usage rules.
- Update `mem://index.md` Core block: add the leak-hook + forensic positioning rules so future edits don't drift back to generic AI-consultant copy.

---

## What I will NOT touch in Phase 1

- The 10-industry pages (`/industries/*`, `VerticalLandingPage`) — staying live for SEO traffic. We'll prune in Phase 3 once the new positioning is indexed.
- Existing `/business-diagnostic` 20-question tool — stays, will be cross-linked from `/leak-audit` as the deeper paid-tier preview.
- Stripe products — `fourteen_day_diagnostic_once` price stays $2,500; we just rename it presentation-side to "Forensic Diagnostic." Stripe metadata untouched.
- Color tokens for amber — stays primary; crimson is additive, not replacement.
- All admin/CRM/campaign infrastructure — none of it touches the public rebrand.

---

## Files touched (Phase 1)

**Created**
- `src/pages/LeakAuditPage.tsx`
- `src/components/LeakAuditMethod.tsx`
- `src/components/CaseFileCard.tsx`
- `src/components/OperatorBio.tsx`
- `src/lib/generateLeakAuditPdf.ts`
- `mem://style/forensic-identity`

**Edited**
- `src/components/Hero.tsx`
- `src/pages/Home.tsx`
- `src/pages/AboutPage.tsx`
- `src/pages/ServicesPage.tsx`
- `src/components/ServicesPricing.tsx`
- `src/components/CEOProfile.tsx` (swap copy block to OperatorBio)
- `src/App.tsx` (add `/leak-audit` route)
- `tailwind.config.ts` (add crimson token, Fraunces, JetBrains Mono)
- `src/index.css` (font imports, crimson CSS var)
- `public/sitemap.xml`
- `mem://business/brand-strategy`
- `mem://index.md`

---

## Phases 2–4 (scoped, not built yet — confirm after Phase 1 ships)

**Phase 2 — Content engine**: Autopsy post template generator in admin (LinkedIn-ready PNG case files exported from `CaseFileCard`), "Leak of the Week" content library, autopost scheduling via existing campaign infrastructure.

**Phase 3 — Authority assets**: Quarterly "State of the Leak" report generator (pulls anonymized aggregate from CRM/diagnostic data), prune to 2–3 vertical pages, redirect retired industry pages to `/leak-audit`.

**Phase 4 — Funnel polish**: 4-email nurture sequence after Free Leak Audit (Resend, uses existing `process-email-queue`), conversion tracking from leak-audit → paid diagnostic → engagement, dashboard widget for funnel health.

---

## Validation (Phase 1)

- Load `/` → hero reads "Your business is leaking…" with new CTA → "Run the Free Leak Audit"
- `/leak-audit` → 14 questions → score + estimated $ leak → email gate → PDF download + lead row in `assessment_leads`
- `/about` → forensic operator bio replaces generic CEO copy
- `/services` → "Forensic Diagnostic — $2,500" is the lead offer
- Case-file components render with crimson accent + serif headline + mono labels
- No regressions on Stripe checkout, existing diagnostic tool, or admin

