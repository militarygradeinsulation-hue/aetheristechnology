

## Goal
Turn the existing drip campaign system into a full power-house in the admin dashboard: a single "Email Campaigns" tab where admins can start/pause campaigns, customize email templates, generate AI images, attach playbooks, and insert pre-made website links into emails.

## Context Found
- `drip_sequences` (steps as JSON), `drip_prospects`, `drip_emails` tables exist
- `process-drip` edge function sends pre-generated emails via Outlook (100/day cap)
- `generate-drip-batch` pre-generates email content per prospect
- `CampaignActivity.tsx` already shows live stats (sent/pending/failed/hot prospects)
- `playbooks` storage bucket exists, `admin_library` table exists
- `generate-blog-images` proves Lovable AI image generation pattern (Gemini 2.5 flash image)
- Cron currently drives `process-drip` automatically — need an admin on/off switch

## Plan

### 1. Database (one migration)
- Add `campaign_settings` table (singleton row): `is_active boolean`, `daily_limit int`, `from_name`, `from_email`, `signature_html`, `default_links jsonb` (array of `{label, url}`), `updated_at`
- Add `campaign_assets` table: `id`, `type` ('image'|'playbook'|'link'), `name`, `url`, `metadata jsonb`, `created_at` — for reusable items in the email composer
- RLS: admin-only via `is_admin(auth.uid())`
- Seed `campaign_settings` with one row + the site's main CTAs (Scan, Diagnostic, Strategy Call, Playbooks) as `default_links`

### 2. New edge function: `campaign-image-generator`
- Accepts `prompt` + optional `style`
- Calls Lovable AI Gateway with `google/gemini-2.5-flash-image`
- Uploads result to `playbooks` bucket under `campaign-images/`
- Inserts row in `campaign_assets`
- Returns public URL
- Admin-gated via `is_admin` check

### 3. Update `process-drip`
- Read `campaign_settings.is_active` at start — if false, return early ("paused")
- Use `daily_limit` from settings (instead of hardcoded 100)
- Inject `signature_html` into outgoing email body if template doesn't already include one

### 4. Update `generate-drip-batch`
- Pull `default_links` from settings and pass to AI prompt so generated emails embed real CTA buttons (e.g. Scan link, Strategy Call link)
- Pass `from_name` for personalization
- Allow optional `attachment_urls[]` (playbook PDFs) — append as styled link block at email bottom

### 5. New admin component: `CampaignControlCenter.tsx`
Single tab inside AdminDashboard with sub-sections:

**a. Master Controls (top)**
- Big on/off toggle: "Campaign Active" → updates `campaign_settings.is_active`
- Daily limit input
- "Send Next Batch Now" button → invokes `process-drip` manually
- "Generate Next Wave" button → invokes `generate-drip-batch`

**b. Sender Identity**
- From name, from email, signature HTML editor (textarea with preview)

**c. Pre-Made Links Library**
- Editable list of `{label, url}` pairs (the CTAs that AI can embed)
- Pre-seeded with: Free Scan, Diagnostic Quiz, Book Strategy Call, Playbooks Library, Industries pages
- Click a row to copy `<a>` snippet to clipboard for manual use

**d. Image Generator**
- Prompt input + "Generate Image" button → calls `campaign-image-generator`
- Grid of previously generated images (from `campaign_assets` where type='image')
- Click image → copies its `<img>` tag to clipboard

**e. Playbook Attachments**
- Lists files in `playbooks` storage bucket
- Toggle "Auto-attach to next batch" per playbook → stored in `campaign_assets`
- Used by `generate-drip-batch` when building emails

**f. Template Preview / Edit**
- Lists `drip_sequences` with their steps
- Inline edit each step's prompt template (subject + body skeleton)
- "Regenerate pending emails" button → deletes pending `drip_emails` rows so next `generate-drip-batch` rebuilds them with new templates

**g. Live Activity (existing)**
- Embeds the existing `CampaignActivity` component below the controls

### 6. AdminDashboard wiring
- Add `'campaigns'` tab key, label "📨 Campaign Powerhouse"
- Move existing `CampaignActivity` rendering inside the new `CampaignControlCenter` (or keep `events` tab as activity-only and add separate `campaigns` tab — recommend **merging**: rename existing `events` tab to `campaigns` and render `CampaignControlCenter`)

## Files to Create/Edit

**Create:**
- `supabase/migrations/<ts>_campaign_powerhouse.sql`
- `supabase/functions/campaign-image-generator/index.ts`
- `src/components/admin/CampaignControlCenter.tsx`
- `src/components/admin/campaign/MasterControls.tsx`
- `src/components/admin/campaign/SenderIdentity.tsx`
- `src/components/admin/campaign/LinksLibrary.tsx`
- `src/components/admin/campaign/ImageGenerator.tsx`
- `src/components/admin/campaign/PlaybookAttachments.tsx`
- `src/components/admin/campaign/TemplateEditor.tsx`

**Edit:**
- `supabase/functions/process-drip/index.ts` — read settings, honor pause toggle
- `supabase/functions/generate-drip-batch/index.ts` — inject links + signature + attachments into AI prompt
- `src/pages/AdminDashboard.tsx` — replace `events` tab with `CampaignControlCenter`
- `supabase/config.toml` — add `verify_jwt = false` for `campaign-image-generator` (uses in-code admin check via JWT)

## Out of Scope
- A/B testing variants per template
- Per-prospect personalization tokens beyond name/business (already supported)
- Email open/click tracking pixels (Outlook-sent, no built-in tracking)
- Building a marketing-style sequence designer UI (drag-drop step builder)

