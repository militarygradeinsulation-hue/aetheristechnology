-- Aetheris Golden Report: private Behavioral Friction experiment records.
-- Stored separately from public/shareable reports and canonical money totals.
-- Only a server function using a validated admin or scoped portal token may
-- read/write this table through the service-role connection.
create table if not exists public.golden_friction_experiments (
  id uuid primary key default gen_random_uuid(),
  scan_id uuid not null references public.forensic_scans(id) on delete cascade,
  finding_id text not null check(length(finding_id) between 1 and 200),
  observation text not null default '',
  lens text not null check(lens in ('operational','perceptual','human','economic')),
  hypothesis text not null default '',
  proposed_test text not null default '',
  metric text not null default '',
  owner_role text not null default '',
  status text not null default 'planned'
    check(status in ('planned','running','measured','closed')),
  baseline_value numeric(20,6),
  result_value numeric(20,6),
  baseline_period text not null default '',
  result_period text not null default '',
  measurement_notes text not null default '',
  mindprint_context jsonb,
  mindprint_consent_attested boolean not null default false,
  mindprint_consent_attested_at timestamptz,
  created_by text not null,
  revision integer not null default 1 check(revision > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(scan_id, finding_id),
  check (mindprint_context is null or mindprint_consent_attested)
);
create index if not exists golden_friction_experiments_scan_idx
  on public.golden_friction_experiments(scan_id, updated_at desc);
alter table public.golden_friction_experiments enable row level security;
revoke all on public.golden_friction_experiments from public, anon, authenticated;
grant select, insert, update, delete on public.golden_friction_experiments to service_role;
comment on table public.golden_friction_experiments is
  'Private, evidence-led experiments. No public row policies; authorized service API only. Mindprint context requires documented permission.';
