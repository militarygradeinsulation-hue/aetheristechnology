

# Website Scanner: Full PDF Report + Tiered Unlock Gate

## Overview
Two changes: (1) upgrade the edge function to generate a comprehensive executive diagnostic report matching the PDF style you showed, and (2) redesign the unlock/gate section to show four pricing tiers matching the screenshot.

## Changes

### 1. Upgrade Edge Function (`supabase/functions/scan-website/index.ts`)
Expand the AI prompt to generate a full executive report structure beyond just gaps:
- **Executive Summary** with overall grade, revenue leak estimate, and company positioning
- **Current State Diagnostic** with detailed findings and annual leak estimates
- **Gap Analysis with Revenue Recovery** — each gap gets a cost, fix, and projected ROI
- **Strategic Roadmap** (6-month implementation plan with projected costs/recovery)
- **Competitive Intelligence Brief** with 3-tier dashboard recommendations
- **ROI Projections table** (Current Annual Waste vs Projected Recovery)
- **Recommended Next Steps** (5 numbered action items)
- **Closing statement** with the signature Aetheris tone

Return this as structured JSON: `{ score, grade, companyName, gaps[], executiveSummary, diagnosticSections[], roadmap[], roiTable[], nextSteps[], competitiveBrief }`.

Store the full report data in the `website_scans` table (the existing `gaps` JSONB column can hold the entire report object).

### 2. Client-Side PDF Generation (`src/lib/generateScanReport.ts`)
Create a new PDF generator using `jsPDF` (already installed) that replicates the Timotay PDF style:
- **Cover page**: Dark background (#0f0f14), gold accent bars (#D99E2E), "EXECUTIVE DIAGNOSTIC REPORT" title, company name, "Prepared by Aetheris Technology / Strategic Business Architecture Division", date, "CONFIDENTIAL"
- **Executive Summary page**: Gold-accented section headers, body text in light gray, grade callout
- **Gap Analysis pages**: Each gap formatted as a mini table with Cost/Fix/Projected ROI rows
- **Strategic Roadmap page**: Month-by-month breakdown with projected costs and revenue recovery
- **ROI Projections page**: Table with Category/Current Waste/Projected Recovery columns
- **Recommended Next Steps**: Numbered list
- **Back page**: CTA + contact info + signature closing line ("Notice I didn't ask for your business...")

### 3. Redesign Unlock Section (`src/components/WebsiteScanner.tsx`)
Replace the current simple lock overlay with the tiered pricing gate matching the screenshot:
- Lock icon at top
- **"Unlock the Full Report for [Company Name]"** heading
- Subtitle: "You are viewing a preview. The complete diagnostic, strategic roadmap, and implementation plan are available below."
- **Four pricing cards** in a 2x2 grid:
  - Digital Snapshot — $125 — "Key findings overview + actionable next steps"
  - Full Evaluation — $750 — "Complete diagnostic with strategic roadmap"
  - Strategy Sprint — $2,500 — "90 day implementation plan + weekly check-ins"
  - Fractional CTO/CMO — $5,000/mo — "Ongoing strategic leadership + execution"
- Each card: dark glass background, gold border-left accent, category label uppercase, large price, description
- **"REQUEST FULL REPORT"** button (gold/amber background, dark text, icon) that opens contact modal
- Closing italic text: "Notice I did not ask for your business. This is free... What I do is educational."

### 4. Wire PDF Download to Visible Preview
The 2 visible gap cards remain. Add a subtle "Download Preview" link that generates a 1-page summary PDF (score + 2 gaps only). The full report PDF is gated behind the pricing tiers / contact.

## Technical Details
- **Edge function**: Enhanced AI prompt requesting full report structure via tool calling schema
- **New file**: `src/lib/generateScanReport.ts` — jsPDF-based full report generator
- **Modified**: `src/components/WebsiteScanner.tsx` — new unlock gate UI with pricing tiers
- **Modified**: `supabase/functions/scan-website/index.ts` — expanded AI analysis prompt and response schema
- No database migration needed (existing `gaps` JSONB column stores the full report object)

