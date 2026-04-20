

## Connect LinkedIn to Admin — Direct Posting with Auto-Schedule + Override

### What this does

1. Stores your LinkedIn app credentials (Client ID and Client Secret) as secrets.
2. Implements LinkedIn OAuth 2.0 authorization flow so you can authorize once from your admin dashboard.
3. Creates a post queue system — posts auto-generate on schedule, but you can review, edit, skip, or force-post any item from the admin UI.
4. Posts go out to LinkedIn via the Posts API (`POST https://api.linkedin.com/rest/posts`) using the `w_member_social` scope.

### Technical details

**1. Store LinkedIn credentials as secrets**

Two secrets to add:
- `LINKEDIN_CLIENT_ID` — your app's Client ID
- `LINKEDIN_CLIENT_SECRET` — your app's Primary Client Secret

**2. New table: `linkedin_tokens`**

| Column | Type | Description |
|--------|------|-------------|
| id | int (default 1) | Single-row config |
| access_token | text | OAuth access token |
| refresh_token | text | For token refresh |
| expires_at | timestamptz | When access token expires |
| linkedin_person_urn | text | `urn:li:person:{id}` for posting |
| updated_at | timestamptz | Last token update |

RLS: Service role only. Never exposed to client.

**3. New table: `linkedin_post_queue`**

| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| content | text | Post text (commentary) |
| format | text | brandjack, newsjack, namejack, hottake, authority |
| source_type | text | blog, playbook, generated |
| source_id | uuid | Optional FK to blog_posts/playbooks |
| status | text | `queued`, `approved`, `posted`, `skipped` |
| scheduled_for | timestamptz | When to auto-post |
| posted_at | timestamptz | When it actually posted |
| linkedin_post_id | text | LinkedIn post URN after posting |
| created_at | timestamptz | |

RLS: Admin-only via `is_admin()` + service role.

**4. New edge function: `linkedin-auth`**

Handles two actions:
- `authorize` — Returns the LinkedIn OAuth URL (`https://www.linkedin.com/oauth/v2/authorization`) with redirect back to your admin page. Scopes: `openid profile w_member_social`.
- `callback` — Exchanges the authorization code for access + refresh tokens, fetches your `urn:li:person` ID via `/v2/userinfo`, stores everything in `linkedin_tokens`.
- `status` — Returns whether LinkedIn is connected (token exists and not expired).

**5. New edge function: `linkedin-post`**

Two modes:
- `post` — Takes a post ID from the queue, calls `POST https://api.linkedin.com/rest/posts` with the content, marks it as `posted`.
- `process-queue` — Finds all `queued` posts with `scheduled_for <= now()`, posts them in order (respecting LinkedIn rate limits), updates status. Can be triggered by cron or manually.
- `queue-from-content` — Takes generated social content (from the LinkedIn Growth Content Pack) and adds it to the queue with scheduled times based on the posting schedule.

Both functions validate the admin token and use the stored LinkedIn access token.

**6. Admin UI: New "LinkedIn" tab in AdminDashboard**

Replaces/extends the Outlook tab or sits alongside it:

- **Connection status**: Shows whether LinkedIn is authorized, with a "Connect LinkedIn" button that triggers the OAuth flow.
- **Post Queue**: Table of upcoming posts with columns: Date, Format badge, Content preview, Status. Each row has buttons: "Post Now", "Edit", "Skip", "Approve".
- **Quick Post**: Text area to compose and post immediately.
- **Auto-Queue**: Button to pull from the latest LinkedIn Growth Content Pack results and queue them across the weekly schedule.
- **History**: Recent posted items with LinkedIn post URN links.

### OAuth redirect flow

```text
Admin clicks "Connect LinkedIn"
  → Edge function returns OAuth URL
  → Browser redirects to linkedin.com/oauth/v2/authorization
  → User authorizes
  → LinkedIn redirects to https://aetheris.technology/admin?linkedin_callback=true&code=xxx
  → Admin page detects the callback, sends code to linkedin-auth edge function
  → Edge function exchanges code for tokens, stores in linkedin_tokens
  → Admin page shows "Connected ✓"
```

### Files to create/modify

| File | Action |
|------|--------|
| `supabase/functions/linkedin-auth/index.ts` | New — OAuth flow + token storage |
| `supabase/functions/linkedin-post/index.ts` | New — Post to LinkedIn + queue processing |
| `src/pages/AdminDashboard.tsx` | Add LinkedIn tab with connection status, queue, and quick post |
| Database migration | Create `linkedin_tokens` and `linkedin_post_queue` tables |

### What does NOT change

- Outlook sync — stays as-is, separate concern
- Content generation — untouched
- Existing posting schedule table — reused for timing

