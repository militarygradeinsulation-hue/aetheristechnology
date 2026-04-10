

# Show Score First, Then Offer Personalized PDF for Contact Info

## Overview
Remove the email gate before results. Show scores immediately after the quiz. Add a contact info form on the results page that unlocks a personalized PDF action plan generated client-side using jsPDF, tailored to each user's specific weak categories.

## Changes

### 1. Restructure Flow in `BusinessDiagnostic.tsx`
- Remove the email gate step entirely — after the last section, go straight to results
- On the results page, add a "Get Your Free Action Plan" section with email/name/company fields
- On submit: save lead to `diagnostic_leads`, generate a personalized PDF, and trigger download

### 2. Create `src/lib/generateDiagnosticPdf.ts`
A client-side PDF generator (using jsPDF, same pattern as `generateBlogPdf.ts`) that builds a personalized action plan based on the user's weakest categories. Each category gets specific, actionable instructions:

- **Marketing**: Steps to build a lead gen system, content calendar, tracking setup
- **Conversion**: CTA optimization, response time protocols, follow-up sequences
- **Brand**: Messaging framework, visual audit checklist, differentiation exercises
- **Systems**: CRM setup guide, pipeline visibility steps, automation priorities
- **Growth**: Growth audit framework, bottleneck identification, strategy alignment

The PDF includes:
- Cover page with score and tier
- Category breakdown with scores
- 2-3 pages of specific action items for the user's top 3 weakest areas
- CTA page for the 14-Day Diagnostic

### 3. Updated Results UI
- Score card and category breakdown shown immediately (no gate)
- Below the findings: a card offering the free PDF
- Email field required, name/company optional
- "Download Your Free Action Plan" button
- After submit: PDF auto-downloads, lead saved to database

## Technical Details

**Modified files:**
- `src/components/BusinessDiagnostic.tsx` — remove email gate, show results directly, add PDF CTA form on results page
- `src/lib/generateDiagnosticPdf.ts` — new file, jsPDF-based personalized PDF generator

**No database changes needed** — `diagnostic_leads` table already exists with all required columns.

