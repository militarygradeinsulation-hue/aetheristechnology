# Nexus Recovery + Substack Publishing

Two separate pieces of work in one pass.

## Part 1: Dean's lost Nexus data

### What happened

Nexus chat threads are saved only in the browser, under the local storage key `aetheris-nexus-threads-v1`. There is no server copy. When Chrome updated and cleared his profile data, the threads went with it. Nothing in the database holds them.

### Recovery attempt (best effort, no guarantee)

Pull the AI gateway request logs for the Nexus chat function and search for calls tied to Dean's rep code (482917). Gateway logs may retain prompt and response text for recent activity. If they do, I will reconstruct what is recoverable into a readable transcript document he can keep, and optionally seed it back into his Nexus as recovered threads.

If the logs do not carry message bodies or have aged out, I will say so plainly rather than fabricate anything. Also worth Dean checking: Chrome sync, or an old profile folder still on disk, which can be restored before we do anything else.

### Permanent fix so this cannot repeat

Add server-side Nexus thread storage:

- New table `nexus_threads` (id, rep_code, title, messages jsonb, created_at, updated_at, deleted_at) with RLS plus grants; reps read and write only their own rows, admins read all.
- `AetherisNexusPage` keeps local storage as an offline cache, but syncs threads up on change and hydrates from the server on load. Last-write-wins per thread using `updated_at`.
- One-time migration on first load: any threads already in a user's browser get pushed to the server so nobody else loses history.
- Threads are keyed to the signed-in rep/admin identity already used by the portal auth; anonymous visitors keep the current local-only behavior.

## Part 2: Substack publishing

### Constraint

Substack has no public write API and no Lovable connector. Nothing can truly auto-publish to it. Any "integration" is a assisted-draft workflow. Building it that way keeps it reliable instead of a scraper that breaks.

### What gets built

A Substack tab in the admin area, next to LinkedIn Publisher:

- Pulls any LinkedIn post (from `content_engine_posts` and `linkedin_publications`) and expands it into a long-form Substack draft: title, subtitle, body, and a closing CTA, written in the Forensic Operator voice with the no-dash rule enforced.
- Inline editing, one-click copy of title / subtitle / body, and a direct link to the Substack new-post editor.
- Status tracking per post: draft, ready, published, with the published URL stored so history shows what shipped where.
- Optional image attach using the existing generated post imagery.

Plus scheduled email delivery:

- A `substack-draft-email` edge function that sends the ready-to-paste draft to a configured address at a chosen time, so Dean or Joseph just paste and hit publish.
- Reuses the existing email infrastructure rather than adding a provider.

### Data

- New table `substack_drafts` (id, source_post_id, source_urn, title, subtitle, body, image_url, status, scheduled_for, published_url, timestamps) with RLS and grants, admin-only access.

## Technical notes

- Nexus sync lives in `src/pages/AetherisNexusPage.tsx` plus a small `useNexusThreads` hook; no change to the chat/model path in `aetheris-nexus-chat`.
- Substack panel is a new `src/components/admin/AdminSubstackPanel.tsx`, lazy-loaded into `AdminDashboard.tsx` as its own tab, following the existing LinkedIn panel pattern.
- Draft generation runs through a new `substack-draft` edge function using the Lovable AI gateway and the existing brand voice prompt, with `stripDashesDeep` applied to output.
- No changes to Golden Report, financial, or forensic data paths.
