

# Downloadable Rep Instructions PDF

## Overview
Generate a branded PDF "Rep Playbook" that reps can download from the Careers page after signing up. The PDF covers the daily action plan: repost Aetheris content, follow our network, email/call prospects, book appointments, close deals, get paid.

## PDF Content Structure

1. **Cover Page** — "Aetheris AI — Independent Sales Rep Playbook"
2. **Daily Action Checklist**
   - Repost every Aetheris LinkedIn post, blog, video, and carousel to your feed
   - Follow the people and companies Aetheris follows — they're your prospect list
   - Comment on prospect posts to get visible before you pitch
3. **Outreach Playbook**
   - Email template: lead with a specific website observation
   - Cold call script: "I noticed your website — you're losing bids because of it"
   - LinkedIn connect message template
   - Follow-up cadence: Day 1, Day 3, Day 7
4. **The Sales Ladder** — pricing recap ($125 → $25K+)
5. **Commission Structure** — rates and step-up bonuses
6. **How You Get Paid** — book appointment → close deal → client pays → you get paid within 7 days
7. **Contact & Resources** — email, phone, scanner URL

## Implementation

1. **Create a Python script** to generate a branded PDF using reportlab with Aetheris colors (dark bg, amber accents) — output to `/mnt/documents/rep_playbook.pdf`
2. **Upload PDF to backend storage** (Supabase Storage bucket)
3. **Add download button** to the PlaybookSection in `CareersPage.tsx` — appears after signup, links to the stored PDF

## Files
- **Script:** `/tmp/gen_rep_playbook.py` (temporary)
- **Output:** `/mnt/documents/rep_playbook.pdf`
- **Modified:** `src/pages/CareersPage.tsx` — add download button in PlaybookSection

