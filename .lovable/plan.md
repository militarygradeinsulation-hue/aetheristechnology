

# Careers Page — Commission-Based Rep Signup

## Overview
Create a `/careers` page where visitors can sign up as commission-based independent sales reps. After submitting their info, the page reveals the full playbook: pricing ladder, commission percentages, sales approach, what to say, what not to do, and sample monthly earnings.

## Database

**New table: `rep_signups`**
- `id` (uuid, PK)
- `name` (text, required)
- `email` (text, required)
- `phone` (text, nullable)
- `linkedin_url` (text, nullable)
- `experience` (text, nullable — brief background)
- `created_at` (timestamptz, default now())

RLS: anyone can insert (anon + authenticated), admins can select.

## Page Structure

### Before Signup (top half)
- Hero section with recruiting pitch: raw, direct language from the playbook ("Commission-Only Independent Sales Reps Wanted")
- Brief value prop bullets: what you sell, who you sell to, why it works
- Signup form: Name, Email, Phone, LinkedIn URL, Brief Experience/Background
- Submit saves to `rep_signups` table

### After Signup (revealed content)
The form disappears and the full playbook is shown in styled sections:

1. **Pricing Ladder** — table showing all offers ($125 snapshots through $25K+ implementation) with price, format, and purpose
2. **Your Commission** — table with base commission rates (25% on snapshots, 25% on evaluations, 12% on diagnostics, 8-10% on implementation) plus step-up bonuses
3. **How to Sell** — pain-to-offer matching table, the outreach sequence (lead with observation, not pitch), and "what not to do" rules
4. **Sample Monthly Earnings** — the example showing $1,950 commission on $12,000 in closed revenue
5. **How to Get Started** — share LinkedIn posts, email companies directly, call prospects, use the website scanner as a conversation starter

## Files

- **New:** `src/pages/CareersPage.tsx` — full page component with form + revealed playbook
- **Modified:** `src/App.tsx` — add `/careers` route
- **Migration:** create `rep_signups` table with RLS

## Technical Detail
- Form uses existing `supabase.from('rep_signups').insert()` pattern
- State toggle: `submitted` boolean controls form vs. playbook view
- Styled with existing glass/card patterns and amber accent colors
- Tables use the existing `<table>` UI component for the pricing/commission grids

