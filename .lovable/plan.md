
# Social Publishing Hub — Plan

## Reality check (important)
HubSpot's public API does **not** support creating or scheduling **social** broadcasts (LinkedIn/FB/IG/X) anymore. It DOES support scheduling **blog posts** via the CMS API. So "to HubSpot" = blog scheduling. True multi-network social scheduling needs a third-party scheduler (Ayrshare is the cleanest single-API option).

---

## Part 1 — HubSpot Blog Scheduler

New edge function `hubspot-blog-publish` (uses existing OAuth token via `_shared/hubspot-token.ts`):
- `action: "list-blogs"` → GET `/cms/v3/blogs/blogs` (let user pick which blog)
- `action: "schedule-post"` → POST `/cms/v3/blogs/posts` with `{ contentGroupId, name, postBody, metaDescription, publishDate (future ISO), state: "SCHEDULED" }`
- `action: "publish-now"` → same but `state: "PUBLISHED"` and `publishImmediately: true`
- `action: "list-scheduled"` → GET `/cms/v3/blogs/posts?state=SCHEDULED`

UI: add a **"Send to HubSpot Blog"** button on every long-form generator (`PlaybookCreator`, `BlogList`/blog generation flow, `AllInOneGenerator`'s blog tab). Modal: pick blog, set publish date/time, confirm. Surface result toast with HubSpot post URL.

## Part 2 — Extend LinkedIn Queue everywhere

Today only `SocialContentGenerator` and admin LinkedIn panel push to `linkedin_post_queue`. Add a **"Schedule on LinkedIn"** action (with date/time picker) to:
- `ContentCalendarGenerator` (per-day post)
- `PostFromSourceGenerator`
- `RepCreationStudio` social outputs
- Any other generator that produces short-form copy

Reuses existing `linkedin-post` edge function `action: "queue-from-content"`. Add a small shared `<ScheduleLinkedInButton content={...} />` component so we don't duplicate logic.

Admin: add a **Scheduled Queue** view (table of `linkedin_post_queue` rows with `status in ('queued','approved')`, `scheduled_for`, edit/cancel/post-now buttons). The cron job that calls `process-queue` should already exist; if not, add one (`*/15 * * * *`).

## Part 3 — Multi-network via Ayrshare connector

Ayrshare = one API → LinkedIn/FB/IG/X/TikTok/YouTube/Pinterest/Threads/Bluesky. Free tier covers testing.

Steps:
1. Ask Joseph for Ayrshare API key (one secret: `AYRSHARE_API_KEY`).
2. New edge function `social-scheduler`:
   - `action: "schedule"` → POST `https://api.ayrshare.com/api/post` with `{ post, platforms: [...], scheduleDate, mediaUrls }`
   - `action: "list"` → GET `/history`
   - `action: "delete"` → DELETE `/post/:id`
   - `action: "analytics"` → GET `/analytics/post`
3. New table `social_scheduled_posts` to mirror status + source generator + rep_code:
   ```
   id uuid pk, ayrshare_id text, content text, platforms text[],
   scheduled_for timestamptz, status text, source text, source_id uuid,
   media_urls text[], result jsonb, created_by text, created_at, updated_at
   ```
   RLS: admin-only via service role (admin token guard on the edge function).
4. Shared `<ScheduleSocialButton />` (network multiselect + datetime + media URLs) added to every social generator. Replaces the LinkedIn-only button when Ayrshare key is present; falls back to LinkedIn queue when not.
5. Admin tab **Social Scheduler** under Tools: calendar view + table of upcoming posts across networks, edit/delete/post-now, per-network status icons.

## Technical notes
- All three edge functions guarded by `verifyAdminToken` (same pattern as `linkedin-post`).
- HubSpot blog post body should accept HTML; sanitize `<script>` server-side.
- Date/time picker stored as UTC ISO; UI shows in user's local TZ.
- New schema migration for `social_scheduled_posts` only (no other table changes).
- No changes to existing LinkedIn flow — it keeps working as a fallback.

## Out of scope
- Posting to HubSpot social (API doesn't allow it).
- Real-time analytics dashboards (Part 3 just exposes counts; richer analytics later).
- Buffer/Hootsuite alternatives (Ayrshare picked for single API + low overhead).
