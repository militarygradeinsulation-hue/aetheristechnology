

# On-Demand Playbook Generator — Plan

## Concept
Add a "Request a Playbook" section to the Resources page where users browse topic categories, click a topic, the system generates a custom playbook via AI, and charges them to download the full PDF.

## How It Works

```text
User browses topic chips/cards → Clicks "Generate This Playbook"
  → Signs in (if not already) → Pays $25 via Stripe checkout
    → Edge function generates PDF → Saved to storage → Download link delivered
```

## Implementation Steps

### 1. Create Stripe Product & Price
- Product: `custom_playbook` — "Custom AI-Generated Strategic Playbook"
- Price: `custom_playbook_once` — $25 one-time (or your preferred price)

### 2. Database: `generated_playbooks` table
- `id`, `user_id`, `topic_title`, `topic_data` (jsonb), `status` (pending/generating/ready/failed), `file_url`, `stripe_session_id`, `created_at`
- RLS: users see only their own; service role manages all

### 3. New UI Section on Resources Page
- Below the existing playbooks grid, add a "Build Your Own Playbook" section
- Display the ~36 topics from the existing `TOPIC_POOL` as clickable cards grouped by pillar (Marketing Technology, Strategic Consulting, AI Transformation)
- Each card shows title, subtitle, tags
- Search/filter bar to find topics by keyword
- Click → opens a modal with topic details + "Generate & Buy — $25" button

### 4. Purchase & Generation Flow
- "Generate & Buy" triggers Stripe checkout for `custom_playbook_once` with the topic title in metadata
- On successful payment (webhook), the `payments-webhook` edge function inserts a row into `generated_playbooks` with status `pending`
- A new edge function `generate-custom-playbook` picks up pending rows, reuses the existing `generate-playbook` PDF generation logic, uploads to the `playbooks` storage bucket, updates status to `ready` with `file_url`
- The webhook calls `generate-custom-playbook` immediately after recording the purchase

### 5. User's Download Page
- After checkout return, show the playbook status (generating → ready with download link)
- Users can also see their purchased playbooks from a simple "My Playbooks" section (query `generated_playbooks` where `user_id = auth.uid()`)

### 6. Files Changed/Created
- **New migration**: `generated_playbooks` table + RLS
- **New Stripe product/price**: `custom_playbook` / `custom_playbook_once` at $25
- **New edge function**: `generate-custom-playbook/index.ts` — reuses existing PDF logic from `generate-playbook`
- **Modified**: `payments-webhook/index.ts` — trigger generation on custom playbook purchase
- **Modified**: `src/pages/ResourcesPage.tsx` — add topic browser section with search, pillar filters, and buy button
- **New component**: `src/components/PlaybookTopicBrowser.tsx` — topic grid with search/filter
- **Modified**: `src/pages/CheckoutReturn.tsx` — handle playbook generation status display

### Technical Notes
- The topic pool already exists in `generate-playbook/index.ts` with 36+ topics — we'll expose these as the browsable catalog
- Authentication is required before purchase (existing auth flow)
- The generation reuses the same AI prompt + jsPDF rendering already built

