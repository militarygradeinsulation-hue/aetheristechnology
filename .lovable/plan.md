## Goal

Integrate the uploaded **Content Engine** (LinkedIn video script planner with calendar + generator + strategy editor) into the existing Admin Dashboard as a first-class tab — fully rebuilt to match the Aetheris forensic dark theme, persisted in the backend (not localStorage), and powered by Lovable AI (no Anthropic key needed).

## What you'll see

A new **"Content Engine"** tab in the Admin Dashboard (`/admin`) with three views:

1. **Calendar** — Month grid showing every scheduled LinkedIn video post, color-coded by format (Audit Roast / Pattern Reveal / Founder POV / Counter-Take). Click any post to open the detail modal.
2. **Generator** — One-click "Generate 12 Posts" (or custom batch size). Plans dates from your posting schedule, generates hooks + scripts + captions + hashtags in parallel, drops them onto the calendar.
3. **Strategy** — Editable form: business description, niche, target buyer, posting days/times/frequency, format mix sliders, voice reference. Auto-saves.

The post detail modal supports: edit, regenerate, duplicate +7 days, delete, reschedule, status (draft → approved → posted), and copy hook/script/caption/hashtags to clipboard. Export-all-to-TSV button on the calendar.

## Key adaptations from the uploaded file

| Original | Adapted |
|---|---|
| Inline JSX colors (`#ff6b35`, `#0a0a0c`) | Aetheris design tokens (`amber`, `crimson`, `bg-background`, `border-border`, `glass`) |
| Anthropic API direct fetch with hardcoded key | New Supabase edge function `content-engine-generate` using Lovable AI (`google/gemini-2.5-flash` for plans, `openai/gpt-5-mini` for scripts) |
| `window.storage` / localStorage | Supabase tables `content_engine_strategy` (singleton per admin) + `content_engine_posts` |
| Pure client-side regenerate | Same edge function, single-script mode |
| No auth | Gated behind existing PIN admin token (`x-admin-token` header) |
| Plain inline-style buttons | shadcn `Button`, `Card`, `Badge`, `Dialog`, `Tabs`, `Slider` |

## Technical plan

### 1. Database (migration)

```sql
-- Singleton strategy row keyed by admin (since this is single-tenant admin)
create table public.content_engine_strategy (
  id uuid primary key default gen_random_uuid(),
  business_description text not null,
  niche text not null,
  target_buyer text not null,
  goals text[] not null default '{}',
  frequency text not null default '4x/week',
  posting_days text[] not null default '{"Mon","Tue","Wed","Thu"}',
  posting_times text[] not null default '{"07:30","12:00"}',
  format_mix jsonb not null default '{"auditRoast":40,"patternReveal":30,"founderPOV":20,"counterTake":10}',
  voice_reference text not null,
  cta_link text not null,
  updated_at timestamptz not null default now()
);

create table public.content_engine_posts (
  id uuid primary key default gen_random_uuid(),
  scheduled_date date not null,
  scheduled_time text not null,
  format text not null,           -- auditRoast | patternReveal | founderPOV | counterTake
  topic_angle text not null,
  target_emotion text,
  hook text not null,
  script text not null,
  caption text not null,
  hashtags text[] not null default '{}',
  status text not null default 'draft',  -- draft | approved | posted
  generated_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

alter table public.content_engine_strategy enable row level security;
alter table public.content_engine_posts enable row level security;

-- Admin-only access; edge functions use service role to bypass RLS.
-- No public policies — all access flows through admin-token-gated edge function.
```

### 2. Edge function: `supabase/functions/content-engine-generate/index.ts`

- Verifies `x-admin-token` (HMAC, same pattern as existing admin functions).
- Three actions:
  - `plan_and_generate` — takes `numPosts`, computes next N dates from strategy, calls Lovable AI to plan slots (format + topic angle + emotion), then runs all script generations in `Promise.all`, inserts into `content_engine_posts`, returns the new posts.
  - `regenerate_post` — single post by id, re-runs script generation with same format/angle.
  - `get_strategy` / `save_strategy` / `get_posts` / `update_post` / `delete_post` — CRUD wrappers.
- Uses `LOVABLE_API_KEY` env var (already provisioned, no user input needed).
- Wraps long batch generation in `EdgeRuntime.waitUntil` if >5 posts to avoid worker shutdown mid-loop.

### 3. New admin component: `src/components/admin/ContentEngine.tsx`

Single component containing the three sub-views (Calendar / Generator / Strategy) and the post detail dialog. Uses:
- `Card`, `Button`, `Badge`, `Tabs`, `Dialog`, `Slider`, `Input`, `Textarea`, `Select` from shadcn
- `lucide-react` icons (already used everywhere)
- `supabase.functions.invoke('content-engine-generate', ...)` with admin token
- `useToast` for save/generate feedback

### 4. Wire into `src/pages/AdminDashboard.tsx`

- Add `'engine'` to the `activeTab` union type.
- Add nav button "Content Engine" (icon: `Zap`) alongside existing tabs.
- Render `<ContentEngine />` when `activeTab === 'engine'`.

### 5. Files

**Create**
- `supabase/migrations/<timestamp>_content_engine.sql`
- `supabase/functions/content-engine-generate/index.ts`
- `src/components/admin/ContentEngine.tsx`

**Edit**
- `src/pages/AdminDashboard.tsx` (add tab + render)

## Out of scope (call out if you want them)

- Auto-posting generated scripts to LinkedIn (separate from existing `linkedin-post` queue — could be wired later).
- Video file upload / storage.
- Multi-user separation (single admin assumed, matching your current setup).
