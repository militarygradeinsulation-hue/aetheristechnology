

## What the user is asking

"Can we retarget the people who visited the site by their IP address and get back in front of them?"

Short answer: **not via raw IP — that doesn't work in 2026 and isn't legal in most cases.** But there are 3 legitimate paths that achieve the same goal, and we already have most of the data needed.

## The reality on IP-based retargeting

- Browsers don't expose IP to client JS, and IP→person resolution is unreliable (NAT, mobile carriers, VPNs).
- "IP retargeting" as a B2B tactic exists (RB2B, Clearbit Reveal, Warmly, Koala) — these are paid third-party services that match IP → company (not person) using their own data graphs. Cost: $300–$2k/mo.
- Cookie/pixel-based retargeting (Meta, LinkedIn, Google Ads) is the standard, legal, and far more accurate path.
- We currently store `session_id` + `user_agent` in `site_events` — no IP, no cookies for ad networks.

## Three paths I recommend (ranked by ROI)

### Path A — LinkedIn Insight Tag + retargeting audience (highest ROI for B2B)
Drop the LinkedIn Insight Tag in `index.html`, build a retargeting audience of everyone who hit `/services`, `/why-us`, `/pricing`, or any blog post but didn't fill the contact form. Run a $20–50/day Sponsored Content campaign back at them. This is the single highest-leverage move for Aetheris's ICP.

### Path B — Meta + Google retargeting pixels
Same idea, broader reach. Meta Pixel + Google Ads tag in `index.html`, custom audiences for non-converters, exclude anyone in `contact_submissions`.

### Path C — Company-level identification (the closest thing to "IP retargeting")
Integrate **RB2B** (free tier identifies up to 1k US visitors/mo as company + sometimes person + LinkedIn URL) or **Warmly**. Pipe identified visitors into the CRM as warm leads, then I personally outreach via LinkedIn.

## What I'll build (Path A + Path C — the highest-leverage combo)

### 1. Add LinkedIn Insight Tag + Meta Pixel to `index.html`
- Tags load only after the existing `ConsentBanner` consent (we already have one).
- Stub partner IDs as env-driven placeholders — you paste yours after creating the audiences.

### 2. New `RetargetingPixel.tsx` component
- Listens to route changes via `useLocation`.
- Fires `track('PageView', {category})` to LinkedIn + Meta with smart categories (services, blog, pricing, contact).
- Fires conversion events on contact form submit and Stripe success so we can build lookalikes.
- Skips firing if no consent.

### 3. New `/admin` "Retargeting" tab
- Setup checklist with copy-paste IDs (LinkedIn Partner ID, Meta Pixel ID, RB2B script).
- Status indicator: pixel firing yes/no (checks `localStorage` consent + script tag presence).
- Suggested audiences with the exact URL filters to plug into LinkedIn/Meta:
  - "Hot — Pricing viewers, no contact" (`/services`, `/why-us` viewers minus `contact_submissions`)
  - "Warm — Blog readers" (`/blog/*`)
  - "Cold — Homepage only"
- Pre-built CSV export of the past 90 days of visitor sessions + the pages they hit, so you can also upload them as a Customer Match list to Google/LinkedIn (matched on email when we have it from forms).

### 4. New `/admin` "Visitor Companies" panel (optional Path C)
- If you add an RB2B-style script ID, surface their identified visitors via their public webhook into a new `identified_visitors` table.
- Show: company, person (if known), pages viewed, last seen, LinkedIn link, "Add to CRM" button that creates a `crm_companies` + `crm_contacts` row.
- I'll wire the table + admin UI now; you flip it on by adding the script ID later.

### 5. Add an "Email match list" export
- Pull every email we already have (`contact_submissions`, `assessment_leads`, `diagnostic_leads`, `subscriptions`) into a single de-duplicated CSV, ready to upload as a Custom Audience to LinkedIn/Meta/Google. This is the fastest retargeting win — you've already got hundreds of warm emails.

## What I will NOT do

- Will not try to resolve raw IPs to individuals (not reliable, not GDPR/CCPA-safe, not worth the legal risk).
- Will not auto-purchase ads or connect ad accounts — you control spend and account access.
- Will not store IPs in `site_events` — pointless without a paid resolver, and adds compliance burden.

## Files touched

- `index.html` — pixel script stubs (consent-gated)
- New: `src/components/RetargetingPixel.tsx`
- `src/App.tsx` — mount `<RetargetingPixel />` next to `<PageViewTracker />`
- New: `src/components/admin/RetargetingPanel.tsx`
- New: `src/components/admin/VisitorCompaniesPanel.tsx`
- `src/pages/AdminDashboard.tsx` — add "Retargeting" + "Visitor Companies" tabs
- New edge function: `export-retargeting-audience` (returns the email match CSV)
- New edge function: `rb2b-webhook` (receives identified visitors, populates `identified_visitors`)
- New migration: `identified_visitors` table with RLS

## Validation

- Open `/admin` → Retargeting tab → see setup checklist, paste a test LinkedIn Partner ID, reload, confirm pixel script appears in `<head>` after consent.
- Hit `/services`, check browser network tab for `px.ads.linkedin.com` + `facebook.com/tr` calls.
- Click "Download Email Match List" → CSV downloads with all known emails de-duped.
- Visitor Companies tab loads (empty until RB2B is wired).

