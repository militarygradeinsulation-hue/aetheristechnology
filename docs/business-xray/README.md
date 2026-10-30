# Aetheris Business X-Ray (no-budget launch kit)

A browser-based, self-service operations diagnostic designed to drive interest in a paid, human-verified audit. No backend, model API, database, login, or tracking is required. Everything runs locally in the visitor's browser. **This is a functioning static MVP, not a deployed service or live payment checkout.**

## What works now

- Guided assessment over three stages: commercial flow, capacity, organizational friction.
- Three independent illustrative financial opportunity estimates, with formulas and explicit guardrails against double counting.
- People / Process / Systems friction scoring from nine self-reported frequency questions.
- Rule-based recommendations, demo data, editable inputs, locally saved drafts (only after user clicks Save), browser Print/Save as PDF, and downloadable JSON.
- Mobile-friendly and printer-friendly styling. No data leaves the browser.

## Launch on free hosting

1. This copy lives at `public/business-xray/index.html` in the existing Aetheris website repository, so the site's Vite build serves it at `/business-xray/index.html`.
2. Upload `index.html` as the site's root index file.
3. Publish using Cloudflare Pages (connect GitHub, set output root for a static HTML site, no build command) (do not use GitHub Pages to host a commercial SaaS).
4. Open the live URL on desktop and mobile and test both a blank assessment and the demo scenario.
5. The results page now offers **Request verified review**, opening an editable email to the contact address published on the Aetheris website (`aetheris.technology@outlook.com`). This is a manual service enquiry, **not** a checkout or a completed order. Verify the inbox is monitored before advertising.
6. Agree on scope, delivery and payment with each buyer, then deliver the paid review manually. Collect written permission before accessing business records or Mindprint reports. No automated paywall, payment processing or fulfillment is included.

You can also open `index.html` locally to test without hosting.

## Business model (proposed prices to test; not market-validated)

- Free: X-Ray snapshot; unverified, self-service.
- $199 one-time: Verified X-Ray. Review owner-supplied numbers, sample two workflows, and deliver a concise evidence-based action brief plus an optional live review meeting.
- $599 one-time: 30-Day Correction Roadmap. Prioritized fixes, accountable owners, measures of success, and an implementation plan. Scope must be agreed before sale.
- Optional: convert to Golden Report and Mindprint work separately with consent and appropriately sourced data.

The first paid deliverable can be prepared with ordinary documents and manual analysis, with no AI token charges.

## What this does NOT do

- It does not prove revenue losses, certify ROI, infer employee personality, scan LinkedIn, process uploaded PDFs, or generate a bespoke AI report.
- It cannot promise guaranteed savings. Self-reported answers may overlap; never add the three financial cards and present them as confirmed recoverable money.
- It does not collect leads or automatically email anyone. Add only a consent-based lead flow and a proper privacy policy if you later include server-side data collection.
- It does not process customer payments. The results page starts an email enquiry; pricing, scope, payment and fulfillment remain manual.

## Quick verification

Open `index.html`, choose `Try a demo scenario`, then `Print / save PDF`. The sample values should display:

- Missed inquiries: $1,680 / month scenario
- Unfollowed quotes: $840 / month scenario
- Capacity tied up: $3,031 / month (rounded from $3,031)
- People 78/100; Process 78/100; Systems 67/100

These are fictional sample numbers provided strictly to test functionality.