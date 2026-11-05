
-- Per-rep saved defaults
create table public.rep_settings (
  code text primary key references public.rep_codes(code) on delete cascade,
  defaults jsonb not null default '{}'::jsonb,
  preferences jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);
alter table public.rep_settings enable row level security;
create policy "Service role manages rep_settings" on public.rep_settings
  for all using (auth.role() = 'service_role') with check (auth.role() = 'service_role');

-- Free-form notes
create table public.rep_notes (
  id uuid primary key default gen_random_uuid(),
  code text not null references public.rep_codes(code) on delete cascade,
  title text not null default 'Untitled',
  body text not null default '',
  pinned boolean not null default false,
  tags text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index rep_notes_code_idx on public.rep_notes(code, updated_at desc);
alter table public.rep_notes enable row level security;
create policy "Service role manages rep_notes" on public.rep_notes
  for all using (auth.role() = 'service_role') with check (auth.role() = 'service_role');

-- Tool run history per rep
create table public.rep_library (
  id uuid primary key default gen_random_uuid(),
  code text not null references public.rep_codes(code) on delete cascade,
  tool_type text not null,
  title text not null,
  input_data jsonb not null default '{}'::jsonb,
  output_data jsonb not null default '{}'::jsonb,
  file_url text,
  lead_id uuid references public.rep_leads(id) on delete set null,
  created_at timestamptz not null default now()
);
create index rep_library_code_idx on public.rep_library(code, created_at desc);
create index rep_library_search_idx on public.rep_library using gin (to_tsvector('english', title));
alter table public.rep_library enable row level security;
create policy "Service role manages rep_library" on public.rep_library
  for all using (auth.role() = 'service_role') with check (auth.role() = 'service_role');

-- updated_at trigger for rep_settings + rep_notes
create trigger rep_settings_updated_at before update on public.rep_settings
  for each row execute function public.update_updated_at_column();
create trigger rep_notes_updated_at before update on public.rep_notes
  for each row execute function public.update_updated_at_column();
