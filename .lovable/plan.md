# Content Engine Thumbnails — Plan

Add AI-generated thumbnails to every post in the Content Engine, using OpenAI's `gpt-image-1` model and a persistent library of your operator headshots as visual reference.

---

## What gets built

### 1. Operator headshot library (one-time setup, persistent)

The 5 uploaded photos become a permanent "brand asset library" stored in Supabase Storage. Each photo is tagged with a wardrobe/mood label so the system can pick the right one per post:

| Photo | Tag | Used for |
|---|---|---|
| Brown suede jacket + denim | `field_notes` | Founder POV, casual operator posts |
| Black blazer + black henley | `executive_dark` | Audit Roast, hard takedowns |
| Charcoal double-breasted + glasses | `boardroom` | Pattern Reveal, strategic takes |
| Tweed blazer + olive sweater | `analyst` | Counter-Take, contrarian posts |
| Camel overcoat + black turtleneck | `authority` | High-stakes / hero posts |

A new admin sub-section "Brand Assets" inside the Content Engine lets you re-upload, retag, set a default, or disable any photo.

### 2. Per-post thumbnail generation

A new `thumbnail_url` column on `content_engine_posts`. Each post card gets:

- **Auto-generated for hero formats**: Audit Roast + Pattern Reveal thumbnails are produced as soon as the post script finishes generating (background job — doesn't block the script appearing).
- **Manual button for the rest**: Founder POV + Counter-Take posts show a "Generate thumbnail" button on the card. Click → 8–15s spinner → thumbnail appears.
- **Regenerate**: Every thumbnail has a "↻" button to reroll with the same or a different reference photo.
- **Edit reference**: Dropdown to swap which headshot is used.

### 3. Thumbnail composition

`gpt-image-1` is called with:
- The selected reference photo (uploaded as input image)
- A prompt built from the post's hook + format + target emotion
- Forensic case-file aesthetic: dark background, crimson + amber accents, the hook text overlaid as bold serif headline, "CASE FILE #" badge

Output: 1024x1024 PNG, saved to the existing `content-images` storage bucket, URL stored on the post row.

### 4. Settings & safety

- Estimated cost shown next to the generate button (~$0.04/image at standard quality)
- Daily generation cap (default 50/day, configurable) to prevent runaway spend
- Failed generations get a clear error toast (rate limit, content policy, missing API key) instead of silent failures

---

## Technical details

**Database migration:**
- Add `thumbnail_url text`, `thumbnail_reference_id uuid`, `thumbnail_generated_at timestamptz` to `content_engine_posts`
- New table `operator_headshots` (id, storage_path, public_url, tag, label, is_default, sort_order, disabled, created_at)
- New table `thumbnail_settings` (singleton row: daily_cap, default_quality, auto_generate_formats text[])

**Storage:**
- Reuse existing public `content-images` bucket
- Upload the 5 reference photos to `content-images/operator-headshots/`
- Store generated thumbnails at `content-images/post-thumbnails/{postId}.png`

**Edge function:** `content-engine-thumbnail`
- Admin-token gated (same pattern as `content-engine-generate`)
- Actions: `generate` (single post), `bulk_generate` (array of post IDs), `list_headshots`, `upload_headshot`, `update_headshot`
- Calls OpenAI `https://api.openai.com/v1/images/edits` with `gpt-image-1`, the reference photo, and the composed prompt
- Streams the returned base64 → uploads to storage → updates the post row

**Auto-generation hook:**
- After `content-engine-generate` finishes writing a post, if `format ∈ auto_generate_formats`, fire-and-forget invoke `content-engine-thumbnail` with action `generate`
- Doesn't block the user-facing response

**Frontend (`src/components/admin/ContentEngine.tsx`):**
- Post card: new thumbnail slot at the top — shows image, "Generate" button, or loading spinner
- New "Brand Assets" tab in the engine settings drawer for managing the headshot library
- Reference-photo dropdown on each post card

**Required secret:**
- `OPENAI_API_KEY` — you'll need to provide this. I'll request it via the secret tool when implementation starts. Get it from https://platform.openai.com/api-keys (needs billing enabled, ~$5 credit covers ~125 thumbnails).

---

## Out of scope (this round)

- Carousel / multi-slide image generation
- Video thumbnails
- Per-post manual prompt editing (uses the auto-built prompt only — can add later if needed)
- Higgsfield / Leonardo fallbacks (OpenAI only per your choice)
