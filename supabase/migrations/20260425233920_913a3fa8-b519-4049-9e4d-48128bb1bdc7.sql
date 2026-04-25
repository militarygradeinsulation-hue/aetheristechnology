-- Strategy: single-row configuration for the content engine
create table public.content_engine_strategy (
  id uuid primary key default gen_random_uuid(),
  business_description text not null default '',
  niche text not null default '',
  target_buyer text not null default '',
  goals text[] not null default '{}',
  frequency text not null default '4x/week',
  posting_days text[] not null default ARRAY['Mon','Tue','Wed','Thu'],
  posting_times text[] not null default ARRAY['07:30','12:00'],
  format_mix jsonb not null default '{"auditRoast":40,"patternReveal":30,"founderPOV":20,"counterTake":10}'::jsonb,
  voice_reference text not null default '',
  cta_link text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.content_engine_strategy enable row level security;

-- Posts: generated LinkedIn video posts
create table public.content_engine_posts (
  id uuid primary key default gen_random_uuid(),
  scheduled_date date not null,
  scheduled_time text not null default '07:30',
  format text not null,
  topic_angle text not null default '',
  target_emotion text,
  hook text not null default '',
  script text not null default '',
  caption text not null default '',
  hashtags text[] not null default '{}',
  status text not null default 'draft',
  generated_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.content_engine_posts enable row level security;

create index idx_content_engine_posts_date on public.content_engine_posts(scheduled_date);
create index idx_content_engine_posts_status on public.content_engine_posts(status);

-- Auto-update updated_at
create trigger trg_content_engine_strategy_updated_at
  before update on public.content_engine_strategy
  for each row execute function public.update_updated_at_column();

create trigger trg_content_engine_posts_updated_at
  before update on public.content_engine_posts
  for each row execute function public.update_updated_at_column();

-- Seed default strategy row
insert into public.content_engine_strategy (
  business_description, niche, target_buyer, goals, frequency,
  posting_days, posting_times, format_mix, voice_reference, cta_link
) values (
  'Aetheris Technology — forensic operator that audits revenue systems in specialty B2B businesses, finds the leaks (CRM hygiene, follow-up failures, ghosted deals, attribution gaps), and recovers the revenue with autonomous workflows.',
  'Specialty Manufacturing',
  'Owners and Sales VPs of $5M-$50M specialty manufacturing businesses using HubSpot',
  ARRAY['Generate inbound leads','Build authority in niche','Drive shadow audit signups'],
  '4x/week',
  ARRAY['Mon','Tue','Wed','Thu'],
  ARRAY['07:30','12:00'],
  '{"auditRoast":40,"patternReveal":30,"founderPOV":20,"counterTake":10}'::jsonb,
  'Direct, specific, no fluff. Lead with the dollar figure or the broken thing. I do not do inspirational quotes. I show what is broken and how to fix it. Talk to operators, not marketers.',
  'https://aetheris.technology/audit'
);