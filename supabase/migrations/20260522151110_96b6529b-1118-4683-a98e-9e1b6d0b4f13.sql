create table if not exists public.rep_lead_skips (
  id uuid primary key default gen_random_uuid(),
  rep_code text not null,
  lead_id uuid not null references public.rep_leads(id) on delete cascade,
  skipped_at timestamptz not null default now(),
  unique (rep_code, lead_id)
);
create index if not exists idx_rep_lead_skips_rep on public.rep_lead_skips (rep_code);
create index if not exists idx_rep_lead_skips_lead on public.rep_lead_skips (lead_id);
alter table public.rep_lead_skips enable row level security;
create policy "rep_lead_skips_no_client_access"
  on public.rep_lead_skips for all
  using (false) with check (false);