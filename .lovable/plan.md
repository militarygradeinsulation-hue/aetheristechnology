

# Growth Strategy Implementation Plan

This plan covers the **buildable website changes** from the growth strategy. Items like LinkedIn posting cadence, GMB setup, and LinkedIn Ads are external actions outside the codebase.

## What We'll Build

### 1. Free AI Readiness Assessment (Lead Magnet)
Create a new `/assessment` page with an interactive "AI Readiness Score" calculator. Users answer 5-6 quick multiple-choice questions about their operations (CRM usage, automation level, data tracking, etc.), enter their email, and receive an instant score with a breakdown. The submission saves to a new `assessment_leads` database table.

- **New page**: `src/pages/AssessmentPage.tsx` — multi-step quiz UI with progress bar, ending in email capture + instant score reveal
- **New component**: `src/components/AIReadinessAssessment.tsx` — quiz logic, scoring algorithm, and results display
- **Database**: New `assessment_leads` table (id, email, name, company, answers jsonb, score integer, created_at) with RLS allowing anonymous inserts
- **Route**: Add `/assessment` to App.tsx
- **Nav update**: Add "Free Assessment" CTA button to Navbar (amber/highlighted style)

### 2. Mid-Scroll CTA in Blog Posts
Insert a persistent CTA block midway through every blog post, breaking up long content and giving readers a clear next step.

- **Modify `BlogPostPage.tsx`**: After rendering the post content via `dangerouslySetInnerHTML`, inject a mid-article CTA component. Since content is HTML string, we'll add the CTA as a React component rendered between a split of the content (split at roughly the halfway `<h2>` or `<p>` tag).
- **New component**: `src/components/BlogMidCTA.tsx` — compact card with "Get Your Free AI Readiness Score" linking to `/assessment`, plus a secondary "Book a Diagnostic" CTA.

### 3. Sticky Header CTA
Add a sticky "Free Diagnostic" banner that appears after scrolling past the hero on all pages.

- **Modify `Navbar.tsx`**: When `isScrolled` is true, show a slim secondary bar below the nav with "Get Your Free AI Readiness Score →" linking to `/assessment`. This uses the existing scroll detection logic.

### 4. SEO Meta Description Optimization
Update meta descriptions across all service/about pages to include "AI Business Consulting Indianapolis" keyword targeting.

- **Modify**: `ServicesPage.tsx`, `AboutPage.tsx`, `ContactPage.tsx`, `Home.tsx` — update `<SEOHead>` description props to naturally include Indianapolis-focused keywords
- **Modify**: `public/sitemap.xml` — add `/assessment` page entry

### 5. Homepage Contact Form Enhancement
Supplement the existing contact form with a prominent lead magnet CTA above it, directing users to the assessment first.

- **Modify `ContactForm.tsx`**: Add a banner above the form: "Not ready to talk? Take the free 2-minute AI Readiness Assessment first →"

## Technical Details

- **Database migration**: One new table `assessment_leads` with anonymous insert RLS policy (no auth required for lead capture)
- **Scoring logic**: Client-side calculation based on weighted answers (no backend needed for score)
- **Files created**: `AssessmentPage.tsx`, `AIReadinessAssessment.tsx`, `BlogMidCTA.tsx`
- **Files modified**: `App.tsx`, `Navbar.tsx`, `BlogPostPage.tsx`, `ContactForm.tsx`, `ServicesPage.tsx`, `AboutPage.tsx`, `ContactPage.tsx`, `Home.tsx`, `sitemap.xml`

