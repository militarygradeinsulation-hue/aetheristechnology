

# Aetheris Business Diagnostic — Full 20-Question Assessment

## Overview
Create a new `/diagnostic` page with a comprehensive 20-question business diagnostic quiz organized into 6 sections. Each question has scored options. After completion (with email gate), the user sees a total score, category-level breakdowns (Marketing, Conversion, Brand, Systems, Growth), and tailored recommendations with CTAs to the consultation page.

## What Gets Built

### 1. New Component: `BusinessDiagnostic.tsx`
- 20 questions across 6 sections (Business Profile, Marketing & Visibility, Conversion & Sales, Brand & Messaging, Systems & Operations, Growth & Strategy)
- Section-by-section flow with progress bar (not one question per screen — show all questions in a section, then advance to the next section)
- Scoring: Strong = 5, Moderate = 3, Weak = 1, Critical = 0 per question (Business Profile section is context-only, not scored)
- Email/name/company capture gate before results
- Results page shows:
  - Overall score with color-coded tier (Green 80-100, Yellow 50-79, Red 0-49)
  - Per-category breakdown bars (Marketing Gaps, Conversion Breakdowns, Messaging Issues, System Failures, Growth Blockers)
  - Personalized narrative output highlighting top 3 weakest areas with specific language like the example provided
  - CTA to book consultation / call

### 2. New Page: `DiagnosticPage.tsx`
- Route: `/diagnostic`
- SEO-optimized with meta description targeting "business diagnostic" keywords
- Same layout pattern as AssessmentPage (Background, Navbar, Footer, ContactModal)
- Headline: "Where Is Your Business Quietly Losing Money?"

### 3. Database: `diagnostic_leads` table
- Columns: id, email, name, company, industry, company_size, answers (jsonb), scores (jsonb), total_score, category_scores (jsonb), created_at
- RLS: anon insert, admin select
- Stores all answers plus computed scores for follow-up

### 4. Route Registration
- Add `/diagnostic` route to `App.tsx`

### 5. Navigation Link
- Add "Free Diagnostic" link to the Navbar for visibility

## Technical Details

**New files:**
- `src/components/BusinessDiagnostic.tsx` — main quiz component (~400 lines)
- `src/pages/DiagnosticPage.tsx` — page wrapper

**Modified files:**
- `src/App.tsx` — add route
- `src/components/Navbar.tsx` — add nav link

**New migration:**
- Create `diagnostic_leads` table with RLS policies

**Scoring logic (client-side):**
- 16 scored questions (Q5-Q20), max 80 points
- Questions 1-4 are profile context (not scored but stored)
- Category scores computed by grouping: Marketing (Q5-8), Conversion (Q9-12), Brand (Q13-15), Systems (Q16-18), Growth (Q19-20)
- Results narrative dynamically generated from the weakest 2-3 categories

