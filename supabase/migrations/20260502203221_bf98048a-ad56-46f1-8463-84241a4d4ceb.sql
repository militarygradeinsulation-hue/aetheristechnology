
-- ============ TRAININGS ============
create table if not exists public.trainings (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  kind text not null default 'mcq' check (kind in ('mcq','open')),
  passing_score integer not null default 70,
  attachments jsonb not null default '[]'::jsonb, -- [{name,url,kind}]
  reference_text text,                            -- admin notes / source content for AI grading
  is_published boolean not null default false,
  order_index integer not null default 0,
  created_by_admin boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.training_questions (
  id uuid primary key default gen_random_uuid(),
  training_id uuid not null references public.trainings(id) on delete cascade,
  question_text text not null,
  options jsonb,            -- array of strings (mcq only)
  correct_index integer,    -- mcq only
  rubric text,              -- open only: what a strong answer covers
  weight integer not null default 1,
  order_index integer not null default 0,
  created_at timestamptz not null default now()
);
create index if not exists idx_training_questions_training on public.training_questions(training_id);

create table if not exists public.training_attempts (
  id uuid primary key default gen_random_uuid(),
  training_id uuid not null references public.trainings(id) on delete cascade,
  rep_code text not null,
  answers jsonb not null default '[]'::jsonb,    -- [{question_id, answer}]
  score integer,                                  -- 0..100
  passed boolean,
  ai_feedback text,
  per_question_feedback jsonb,                    -- [{question_id, score, comment}]
  started_at timestamptz not null default now(),
  completed_at timestamptz
);
create index if not exists idx_training_attempts_rep on public.training_attempts(rep_code);
create index if not exists idx_training_attempts_training on public.training_attempts(training_id);

create table if not exists public.training_qa (
  id uuid primary key default gen_random_uuid(),
  training_id uuid references public.trainings(id) on delete set null,
  rep_code text not null,
  rep_name text,
  question text not null,
  ai_answer text,
  admin_answer text,
  status text not null default 'open' check (status in ('open','answered','closed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_training_qa_training on public.training_qa(training_id);
create index if not exists idx_training_qa_rep on public.training_qa(rep_code);

-- updated_at triggers
drop trigger if exists trg_trainings_updated on public.trainings;
create trigger trg_trainings_updated before update on public.trainings
  for each row execute function public.update_updated_at_column();

drop trigger if exists trg_training_qa_updated on public.training_qa;
create trigger trg_training_qa_updated before update on public.training_qa
  for each row execute function public.update_updated_at_column();

-- RLS: lock everything down; edge functions use service role.
alter table public.trainings enable row level security;
alter table public.training_questions enable row level security;
alter table public.training_attempts enable row level security;
alter table public.training_qa enable row level security;

-- (No public policies — service role bypasses RLS; anon/auth get nothing.)

-- ============ STORAGE BUCKET for uploaded training docs ============
insert into storage.buckets (id, name, public)
values ('training-uploads', 'training-uploads', true)
on conflict (id) do nothing;

-- Public read for the bucket (docs are sales-training collateral, no PII)
do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname='storage' and tablename='objects'
      and policyname='Public read training-uploads'
  ) then
    create policy "Public read training-uploads"
      on storage.objects for select
      using (bucket_id = 'training-uploads');
  end if;
end $$;
