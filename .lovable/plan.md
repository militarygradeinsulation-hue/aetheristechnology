# Staged Site Rewrite — Commercial Trade Contractor Niche

Message compressed to one line, kept across every page:
> **Your backlog is full. Your margin is not. That is not bad luck, and we can prove it.**

I'll ship this in 5 phases and stop for your approval after each. You can redirect at any checkpoint.

---

## Phase 1 — Homepage rewrite (`src/pages/Home.tsx`)
The five-second test drives everything else.

- **Hero**: "Your backlog is full. Your margin is not." + contractor-specific subhead, one CTA → **Open Your Case File** (routes to `/leak-audit`). Trade strip below: Mechanical · Electrical · Roofing · Sheet Metal · Plumbing · Fire Protection · Controls.
- **Qualifier strip**: $5M–$50M commercial only. No residential. No under $5M.
- **The Premise** section: "Nothing about this is random."
- **The Six Leaks** section (centerpiece): case-file cards for bid follow-up void, change order leakage, T&M slippage, service-to-agreement gap, dispatch drag, silent account decay. Each with the exact copy from the doc. Closer: *"If three of those made you uncomfortable, your case is worth opening."*
- **How It Works**: 4 steps (scan → case file → read-out → investigation).
- **What You Get**: "Findings, not activity."
- **The Architect**: Joseph, one operator, the chaos-theory pullquote.
- **Final CTA**: "The chaos has a cause. Let's find it."
- **Meta/SEO**: replace title + description with the doc's exact strings, drop the 26-keyword tag, remove any "30% average recovery" claim, change "Doctorate in Digital Forensics" → "Doctoral candidate" everywhere it appears.

Reuses existing tokens (charcoal + amber, crimson only on leak signals, Fraunces headlines, JetBrains Mono labels). No new colors.

---

## Phase 2 — Leak Audit landing (`/leak-audit`)
Rewrite the page to match the doc's tool landing:
- Hero: "Twelve questions. Five minutes. One number you do not currently have."
- "What you get" strip (4 bullets: real number, named exhibits, case file PDF, optional read-out).
- "What this is not" strip (no drip, no demo trap).
- Primary CTA: **Begin the Audit**.
- Leaves the existing audit engine untouched — just replaces the page shell/copy.

---

## Phase 3 — Services & Pricing page
New page `/services` (or rewrite existing) with three tiers exactly as specified:
1. **Free** — Contractor Leak Audit.
2. **$3,500** — Single-Leak Investigation (5 business days, credited 1:1 toward Diagnostic within 90 days).
3. **$18,500** — The Contractor Diagnostic (21 days, site visit, ride-along, 3× guarantee in writing, credited 1:1 toward implementation).
4. **From $15,000/mo, 3-month min** — Implementation (only offered post-Diagnostic).

Prices published on-page. USD only, matching the currency lock.

---

## Phase 4 — About + Why Aetheris
- **`/about`**: Joseph's story rewritten from the doc — Marine, aerospace, 30+ AI/automation systems, MS Marketing Liberty 4.0, doctoral candidate, IBM/Harvard/Google/HubSpot. "Why commercial trade contractors." One operator works your case.
- **`/why-us`** (rewrite existing `WhyUsPage`): "What we are not / What we are." Ends on **Real findings. No sugar.**

---

## Phase 5 — SEO niche pages (contractor hub + trade pages)
New route group under `/contractors`:
- `/contractors` — niche hub, links all trade + leak pages.
- `/change-order-leakage`
- `/bid-follow-up`
- `/commercial-hvac-contractors`
- `/commercial-electrical-contractors`
- `/commercial-roofing-contractors`

Each page reuses the same investigation frame with trade- or leak-specific case file, FAQs, and schema (Service + HowTo + FAQ), so the national firms don't own these SERPs.

---

## Global cleanup (rolls into Phase 1)
- Remove "Chaos Theory Forensics Operator" as an H1 anywhere it's still the primary headline. Keep it as signature/closer only.
- Purge "30% average recovery" and any unsubstantiated recovery percentages.
- Search for "Doctorate in Digital Forensics" and change to "Doctoral candidate" project-wide.
- Kill the 26-keyword meta tag in `index.html` / `SEOHead` if present.

---

## Technical notes
- No backend/schema changes. Copy + component + routing only.
- Existing design system (tokens, `.thumb-frame`, glass, amber, crimson-for-leaks) is reused — no new palette.
- Every new route registered in `src/app/AppRouter.tsx` (or the current router file) and added to `sitemap`/`SEOHead` breadcrumbs.
- I'll typecheck after each phase before handing back to you.

---

**Starting point:** I'll begin with **Phase 1 (homepage)** on approval and stop before Phase 2 so you can review the live preview.