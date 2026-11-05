create table if not exists public.forecast_briefings (
  id uuid primary key default gen_random_uuid(),
  briefing_date date not null unique,
  tip jsonb not null default '{}'::jsonb,
  tech jsonb not null default '[]'::jsonb,
  industry jsonb not null default '[]'::jsonb,
  companies jsonb not null default '[]'::jsonb,
  sources jsonb not null default '[]'::jsonb,
  model text,
  generated_at timestamptz not null default now()
);

create index if not exists idx_forecast_briefings_date on public.forecast_briefings (briefing_date desc);

alter table public.forecast_briefings enable row level security;

alter table public.rep_leads drop constraint if exists rep_leads_source_chk;
alter table public.rep_leads add constraint rep_leads_source_chk
  check (
    source in ('admin_scrape','rep_upload','admin_manual')
    or source like 'rep_scrape:%'
    or source like 'forecast:%'
    or source like 'hubspot_import%'
  );