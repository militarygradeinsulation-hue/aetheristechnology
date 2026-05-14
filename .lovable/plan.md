## Resume Analysis — Public Paid Tool

A public, live-on-homepage tool where prospects buy resume scan credits ($20 each, with 5/10 packs at a discount), enter a company website + role context + upload a resume, and receive an AI-generated culture-fit + capability breakdown plus a branded PDF and a soft upsell to the Forensic Diagnostic.

### 1. Pricing & credits

- Stripe products via `payments--batch_create_product`:
  - `resume_scan_1` — $20 (1 credit)
  - `resume_scan_5` — $80 (5 credits, $16/ea)
  - `resume_scan_10` — $150 (10 credits, $15/ea)
- Anonymous flow: buyer enters email at checkout. Credits keyed to lowercased email, not `user_id`.
- New table `resume_scan_credits` (email, credits_remaining, credits_purchased, last_purchase_at).
- New table `resume_scans` (email, company_url, role_title, role_notes, resume_storage_path, scan_result jsonb, fit_score int, pdf_url, created_at, stripe_session_id).
- Storage bucket `resume-scans` (private) for uploaded resumes + generated PDFs.

### 2. Purchase flow

- Homepage section "Resume Forensics — $20/scan" with the 3 pack tiers.
- `create-checkout` extended (or new `create-resume-credits-checkout`) to accept `priceId ∈ resume_scan_*` + `customerEmail` (required), `mode: payment`, embedded checkout, `return_url` → `/resume-forensics?session_id={CHECKOUT_SESSION_ID}`.
- `payments-webhook` handler adds `checkout.session.completed` branch: when line item is a `resume_scan_*` price, increment `resume_scan_credits` for the buyer email by the pack size. Idempotent on `stripe_session_id`.

### 3. Tool flow (post-purchase, gated by credits)

New page `/resume-forensics` (`ResumeForensicsPage.tsx`) with 4 steps:
1. **Email gate** — enter email, fetch credit balance via new edge function `resume-credits-check`. If 0, show pack purchase. If ≥1, proceed.
2. **Company scan** — input website URL → calls new edge function `resume-company-scan` which uses **Firecrawl** to crawl homepage + `/about` + `/careers` + `/team` (limit 4–6 pages, `formats: ['markdown','summary']`), then Lovable AI (`google/gemini-2.5-pro`) to extract company brief: mission, values, culture signals, hiring posture. Cached on `company_url` for 7 days in a new `company_briefs` table.
3. **Role context** — title + free-form notes (priorities, deal-breakers, seniority).
4. **Resume upload + scan** — upload to `resume-scans` bucket, call new edge function `resume-public-scan` which:
   - decrements 1 credit atomically (RPC `consume_resume_credit(email)`),
   - reuses the existing `resume-analyze` extraction logic against the resume,
   - feeds resume + role context + company brief into Gemini for a structured culture-fit JSON: `fit_score` (0–100), `summary`, `culture_alignment[]`, `capability_match[]`, `risk_flags[]`, `interview_questions[]`, `recommended_next_steps`.
   - generates a branded PDF (jsPDF, dark charcoal + amber, "Aetheris AI Studio" watermark, Fraunces headlines, JetBrains Mono labels — per Forensic Identity memory),
   - stores PDF in `resume-scans` bucket, returns signed URL,
   - emails the PDF to the buyer (existing email infra),
   - inserts notification for admins.

### 4. Results screen

- Big fit score with crimson accent only if score < 50 (leak signal rule).
- Sections: Culture Alignment, Capability Match, Risk Flags, Suggested Interview Questions.
- **Follow-up CTA**: 
  - Score ≥ 70 → "Lock this hire in — Forensic Diagnostic ($2,500)" linking to existing diagnostic flow.
  - Score 40–69 → "Borderline — book a 15-min review with the operator" → Calendly/diagnostic.
  - Score < 40 → "This one's leaking before day 1 — see the Leak Audit".
- "Buy more scans" button + download PDF.

### 5. Admin

- New row in `AdminDashboard` tools registry: `resume_forensics_orders` showing all purchases, scans, fit scores, buyer emails. Reuses existing admin shell — no new auth.
- Existing `AdminResumeAnalyzer` stays unchanged for internal hiring use.

### 6. Homepage placement

- New section component `ResumeForensicsTeaser.tsx` placed on `Home.tsx` between existing capability/diagnostic sections.
- Headline: "Hire the wrong person and your business starts leaking." Sub: "Run any resume against any company in under 90 seconds. $20."
- Three pack cards → opens embedded Stripe checkout via existing `useStripeCheckout` hook.

### Technical details

- **Edge functions** (new): `resume-credits-check`, `resume-company-scan`, `resume-public-scan`. All `verify_jwt = false` (anonymous).
- **Modified**: `payments-webhook` (new branch), `create-checkout` (allow new price IDs), `Home.tsx`, `App.tsx` route, types.
- **DB migration**: 3 new tables + `consume_resume_credit(email)` RPC (SECURITY DEFINER, atomic decrement) + RLS (service-role-only writes; public read disabled — clients always go through edge functions which check email match).
- **Firecrawl**: connector already enabled (`FIRECRAWL_API_KEY` present). Crawl limit 6 pages, `maxDepth: 2`, scoped to homepage + about/careers/team paths.
- **Resume parsing**: reuse text-extraction from existing `resume-analyze` function (PDF/DOCX + Gemini OCR fallback).
- **PDF**: jsPDF in the edge function, base64 → upload to bucket → signed URL.
- **Anti-abuse**: 1 scan per credit, max 3 company-scan calls per email per credit (cached briefs), 5 MB resume limit, rate limit by email + IP.
- **Refunds/edge cases**: if AI scan fails after credit decrement, refund credit via the same RPC.
