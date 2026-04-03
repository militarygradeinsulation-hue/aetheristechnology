

# Automated Weekly Playbook Generation

## Overview
Create a system that generates one new strategic playbook PDF per week, stores it in cloud storage, and displays it dynamically on the Resources page. The current 6 hardcoded playbooks stay as-is; new ones get added automatically.

## Changes

### 1. Database: New `playbooks` table
Store metadata for generated playbooks (title, subtitle, description, tags, file URL, published date). Seed it with the 6 existing playbooks so everything renders from one source.

### 2. New Edge Function: `generate-playbook/index.ts`
- Uses Lovable AI (Gemini 2.5 Pro) to generate a full 15-20 page strategic playbook on a rotating topic from the three core pillars
- Topics are drawn from a curated pool aligned to the 360 Brew framework (e.g., "The Revenue Attribution Playbook," "The CRM Adoption Recovery Guide," "The AI Visibility Scorecard Framework")
- Generates structured markdown content with executive summary, data tables, frameworks, implementation roadmaps, and Aetheris CTAs
- Converts to PDF using jsPDF and uploads to a `playbooks` storage bucket
- Inserts metadata into the `playbooks` table

### 3. Weekly Schedule via pg_cron
- Runs every Monday at 8 AM EST
- Calls the `generate-playbook` edge function

### 4. Update Resources Page
- Replace the hardcoded `RESOURCES` array with a database query to the `playbooks` table
- Render dynamically, newest first
- Keep the same card design and download functionality

## Technical Details
- **New table**: `playbooks` (id, title, subtitle, description, tags, file_url, icon_name, published_at, created_at)
- **New storage bucket**: `playbooks` (public)
- **New edge function**: `supabase/functions/generate-playbook/index.ts`
- **Modified file**: `src/pages/ResourcesPage.tsx` — dynamic data from database
- **Cron job**: Weekly Monday 8 AM EST via pg_cron + pg_net

