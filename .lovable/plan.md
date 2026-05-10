
# 90-Day Fix Plan — Public-Facing Rewrite

Scope: everything visible to prospects. Rep portal, admin, and rep program code/CTAs stay intact. Old Stripe products stay live but hidden from the site.

---

## 1. Positioning & messaging shift

**New site-wide narrative:**
- Audience: specialty manufacturers, $5M–$25M, US-based.
- Lead with credentials, not metaphors. "Revenue leak" language stays in long-form content but stops leading the homepage and offer pages.
- Single offer: **The 21-Day Revenue Diagnostic — $18,500 fixed fee.**
- Implementation retainer: **$15K/month, 3-month minimum, diagnostic clients only.**

**Update memory:**
- Rewrite `mem://business/brand-strategy` — replace Forensic Diagnostic ($2,500) and 7-step Leak Audit positioning with credentials-first specialty-manufacturer wedge + 21-Day Diagnostic.
- Rewrite `mem://business/pricing` — mark old products as "internal/legacy, hidden from public site"; document the two new offers as the only public SKUs.
- Update `mem://index.md` Core rules accordingly (drop the "Forensic Diagnostic $2,500" line, add "$18,500 21-Day Diagnostic + $15K/mo retainer; specialty manufacturers $5–25M").

---

## 2. Homepage rewrite (`src/components/Hero.tsx`, `src/pages/Home.tsx`)

**New hero:**
- Eyebrow: `Revenue systems for specialty manufacturers · Indianapolis`
- H1 (credentials-first):
  > 20 years building revenue systems for manufacturers. Marine Corps veteran. Former Director of Strategy at a $25M aerospace firm with SpaceX accounts.
- Subhead:
  > We help specialty manufacturers find the $200K–$2M they're losing to broken CRM, sales, and operational systems — and fix it.
- Primary CTA: **Book a 15-minute call** (HubSpot meeting link, already wired).
- Secondary CTA: **Read the methodology** → `/methodology`.
- Tertiary: **See credentials** → `/credentials`.
- Keep the architect video circle. Drop the "leaking / inside the building" italicized hero copy and the "Free AI Readiness Score" + "Run the Free Leak Audit" CTAs from the hero (Leak Audit page stays accessible from footer, demoted).

**Home.tsx body changes:**
- Replace `LeakAuditMethod` placement with a slimmer "How the 21-Day Diagnostic works" section (3 steps: Map → Quantify → Roadmap).
- Keep `CaseFileCard` field-reports section but reframe header to "What we've found inside specialty manufacturers."
- Remove `FreeTools`, `WhatsWrongDiagnostic`, and the `tldr` quick-answer block from Home — they push the wrong offer.
- Keep HubSpot booking embed.
- Update `SEOHead` title/desc/keywords to credentials + specialty manufacturers.

---

## 3. New pages

### `/methodology` (`src/pages/MethodologyPage.tsx`)
Two-page measurement methodology doc, rendered as a long-form page + downloadable PDF.

Sections:
1. How we define a revenue leak
2. How we measure baseline (CRM export, deal stage tracking, response-time sampling, attribution windows)
3. How we attribute recovered revenue
4. Scope (in/out)
5. What an auditor would need to verify it
6. The 21-Day Diagnostic deliverables (written report, prioritized fixes, ROI projections, implementation roadmap)

PDF: generate via existing `jspdf` pattern (mirror `generateLeakAuditPdf.ts`) → `src/lib/generateMethodologyPdf.ts`. Download button on the page.

### `/credentials` (`src/pages/CredentialsPage.tsx`)
One-page credibility sheet + PDF download.

Content: Joseph Toney bio, Marine Corps service, prior operator roles ($25M aerospace / SpaceX accounts), certifications (IBM, Harvard, Google, HubSpot), company formation date, structure, and "if Joe gets hit by a bus" continuity blurb (who runs sales, who delivers, where files live, partner contact).

PDF: `src/lib/generateCredentialsPdf.ts`.

### `/diagnostic` (`src/pages/DiagnosticPage.tsx`) — replaces the old high-tier offer page
- Headline: **The 21-Day Revenue Diagnostic — $18,500**
- What you get, what we measure, timeline, what it does NOT include.
- "Methodology" link prominent (signals we'll send the doc before pricing).
- CRM-agnostic note: "Works on a CSV export of contacts, deals, and activity. HubSpot/Salesforce live integration available as an upsell, not a prerequisite."
- CTA: Book a 15-min call (HubSpot). No Buy Now button — sales-led only.

### `/implementation` — short page
- $15K/mo, 3-month minimum, diagnostic clients only. CTA: book a call.

---

## 4. Strip old offers from the public site

**Hide, don't delete** (Stripe products + rep portal remain functional):
- `src/components/ServicesPricing.tsx`, `src/components/Services.tsx`, `src/pages/ServicesPage.tsx`: replace contents with the two new offers only.
- `src/components/FreeTools.tsx`, `src/components/WhatsWrongDiagnostic.tsx`, `src/components/AllInOneGenerator.tsx` and the tool-pack pages (`/scan`, `/content-generator`, `/content-calendar`, `/sales-scripts`, `/follow-up-plan`, `/friction-audit`, `/strategic-questions`, `/brand-contradictions`, `/ai-checklist`, `/leak-audit`): keep the routes alive (rep portal links, SEO, existing customers) but remove from `Navbar`, `Footer`, and Home.
- `Navbar.tsx`: new top-level links → Home, Methodology, Credentials, Diagnostic, Book a Call. Remove "Free Tools" / "Services" mega-menus.
- `Footer.tsx`: collapse tool links into a single "Resources" subsection at the bottom; promote Methodology, Credentials, Diagnostic.

**Forensic Diagnostic ($2,500) / 14-Day Diagnostic ($2,900):** removed from all public navigation and CTAs. References inside `Hero`, `Home`, and FAQs scrubbed.

---

## 5. Industry messaging — "specialty manufacturers" wedge

- Verticals page (`src/pages/IndustriesPage.tsx` / `VerticalLandingPage.tsx`): trim to specialty manufacturing and a "see also" list. Don't name "commercial playground" publicly per your call.
- Update `src/config/verticals.ts` ordering so manufacturing leads.
- Hero, Methodology, Diagnostic pages all use the phrase "specialty manufacturers."

---

## 6. SEO + structured data

- `Home.tsx` `SEOHead`: new title `Revenue Systems for Specialty Manufacturers | Aetheris`, desc with credentials + dollar range, drop "forensics" keyword stack.
- JSON-LD `serviceType` updated to: Revenue System Diagnostic, CRM Implementation, Sales Operations, Manufacturing Revenue Operations.
- `public/llms.txt` and `public/llms-full.txt`: rewrite intro paragraph to match the new positioning.
- `public/sitemap.xml`: add `/methodology`, `/credentials`, `/diagnostic`, `/implementation`; demote (keep but lower priority) the tool pages.

---

## 7. Explicitly out of scope (per your instructions)

- Rep portal, rep codes, commission logic, rep-facing CTAs in `/portal` — untouched.
- Admin dashboard, mailboxes, training, calendar — untouched.
- Stripe products / webhook — untouched (legacy products keep working for existing reps and direct links).
- Public pilot pricing — not added. Pilot offer lives in your outreach scripts only.
- No new database changes, no new edge functions.

---

## Technical details

**Files created:**
- `src/pages/MethodologyPage.tsx`
- `src/pages/CredentialsPage.tsx`
- `src/pages/DiagnosticPage.tsx`
- `src/pages/ImplementationPage.tsx`
- `src/lib/generateMethodologyPdf.ts`
- `src/lib/generateCredentialsPdf.ts`

**Files edited:**
- `src/components/Hero.tsx` — credentials-first copy, new CTAs
- `src/pages/Home.tsx` — section reorder, removed components, new SEO
- `src/components/Navbar.tsx`, `src/components/Footer.tsx` — nav restructure
- `src/components/ServicesPricing.tsx`, `src/components/Services.tsx`, `src/pages/ServicesPage.tsx` — two-offer rewrite
- `src/app/AppRouter.tsx` — register new routes
- `src/config/verticals.ts` — manufacturing first
- `public/llms.txt`, `public/llms-full.txt`, `public/sitemap.xml`
- `mem://index.md`, `mem://business/brand-strategy`, `mem://business/pricing` — new positioning

**Deferred until you have 3 case studies (per your plan):**
- Re-introducing rep program publicly (already intact in code, just not promoted).
- À la carte tool-pack promotion.
- Industry-specific landing pages beyond manufacturing.

---

## Order of execution

1. Memory updates (lock the new positioning).
2. New pages + PDFs (Methodology, Credentials, Diagnostic, Implementation).
3. Hero + Home rewrite.
4. Navbar, Footer, Services strip.
5. SEO + sitemap + llms.txt.
6. QA on the preview at mobile (441px) and desktop.
