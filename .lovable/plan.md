

## Send Blogs & Playbooks to Outlook + Create LinkedIn Posting Schedule

### What this does

1. Creates a new edge function `sync-content-to-outlook` that reads published blog posts and playbooks from the database, formats them as draft emails in your Outlook mailbox (organized in a dedicated folder), so your other AI can pull from the drafts and post to social media.

2. Creates a `content_posting_schedule` table to store your weekly posting calendar with the LinkedIn growth framework baked in.

3. Seeds the schedule with the strategic weekly mix from the framework you provided.

### Technical details

**1. New edge function: `supabase/functions/sync-content-to-outlook/index.ts`**

- Fetches all published `blog_posts` and `playbooks` from the database
- For each item, creates a **draft email** in your Outlook mailbox via the connector gateway (`POST /me/messages`) with:
  - Subject: `[BLOG] {title}` or `[PLAYBOOK] {title}`
  - Body (HTML): The blog content or playbook description + file URL
  - Tags/growth format included in the body for your AI to parse
- Tracks which items have been synced using a new `content_sync_log` table (prevents duplicates)
- Can be triggered manually from admin or scheduled via cron

**2. New table: `content_sync_log`**

| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| content_type | text | `blog` or `playbook` |
| content_id | uuid | FK to blog_posts or playbooks |
| synced_at | timestamptz | When it was sent to Outlook |
| outlook_message_id | text | The draft message ID from Outlook |

RLS: Admin-only access via `is_admin()` function.

**3. New table: `content_posting_schedule`**

| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| day_of_week | int | 0=Sun through 6=Sat |
| day_name | text | Mon, Tue, etc. |
| content_type | text | Growth format label |
| strategic_goal | text | What this slot achieves |
| post_time | time | Suggested posting time |
| notes | text | Additional guidance |

RLS: Public read, admin write.

**4. Seed the schedule** with the LinkedIn framework:

| Day | Content Type | Strategic Goal |
|-----|-------------|----------------|
| Mon | Brandjack or Newsjack | New Audience Acquisition / Reach |
| Tue | Authority / Niche Deep-Dive | Deepen Trust with Existing Followers |
| Wed | Case Study / Forensic Report | Prove Competence / Social Proof |
| Thu | Namejack or Hot Take | Scale Visibility / Industry Ecosystem |
| Fri | Niche Expertise / Q&A | Engagement / Retention |

**5. Admin UI addition** — Add a "Sync to Outlook" button in the admin dashboard that triggers the edge function and shows sync status.

### Files touched

| File | Action |
|------|--------|
| `supabase/functions/sync-content-to-outlook/index.ts` | New edge function |
| `src/pages/AdminDashboard.tsx` | Add sync button + schedule view |
| Database migration | Create `content_sync_log` and `content_posting_schedule` tables |

### What does NOT change

- Blog/playbook generation logic — untouched
- Existing drip campaign system — separate concern
- No new secrets needed — `MICROSOFT_OUTLOOK_API_KEY` and `LOVABLE_API_KEY` already configured

