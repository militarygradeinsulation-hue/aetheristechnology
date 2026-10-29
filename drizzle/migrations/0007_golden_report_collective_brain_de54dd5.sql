-- Verbatim apply of supabase/migrations/20261029171000_golden_report_collective_brain.sql @ de54dd5
create table if not exists public.golden_report_collective_patterns (
  pattern_key text primary key,
  pattern_title text not null,
  category text,
  chapter_slug text,
  report_count integer not null default 0,
  occurrence_count integer not null default 0,
  company_count integer not null default 0,
  report_share numeric,
  first_seen_at timestamptz,
  last_seen_at timestamptz,
  sample_actions jsonb not null default '[]'::jsonb,
  evidence_grades jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

create table if not exists public.golden_report_pattern_pairs (
  pattern_a text not null,
  pattern_b text not null,
  reports_together integer not null default 0,
  pair_share numeric,
  updated_at timestamptz not null default now(),
  primary key (pattern_a, pattern_b)
);

create table if not exists public.golden_report_industry_patterns (
  industry text not null,
  pattern_key text not null,
  pattern_title text not null,
  category text,
  report_count integer not null default 0,
  occurrence_count integer not null default 0,
  industry_report_count integer not null default 0,
  industry_share numeric,
  updated_at timestamptz not null default now(),
  primary key (industry, pattern_key)
);

create table if not exists public.golden_report_brain_state (
  id text primary key default 'collective',
  reports_analyzed integer not null default 0,
  findings_analyzed integer not null default 0,
  companies_analyzed integer not null default 0,
  classified_industries integer not null default 0,
  last_refresh_at timestamptz,
  notes jsonb not null default '{}'::jsonb
);

alter table public.golden_report_collective_patterns enable row level security;
alter table public.golden_report_pattern_pairs enable row level security;
alter table public.golden_report_industry_patterns enable row level security;
alter table public.golden_report_brain_state enable row level security;

revoke all on public.golden_report_collective_patterns from anon, authenticated;
revoke all on public.golden_report_pattern_pairs from anon, authenticated;
revoke all on public.golden_report_industry_patterns from anon, authenticated;
revoke all on public.golden_report_brain_state from anon, authenticated;
grant all on public.golden_report_collective_patterns to service_role;
grant all on public.golden_report_pattern_pairs to service_role;
grant all on public.golden_report_industry_patterns to service_role;
grant all on public.golden_report_brain_state to service_role;

create index if not exists grcp_report_count_idx on public.golden_report_collective_patterns(report_count desc);
create index if not exists grip_industry_idx on public.golden_report_industry_patterns(industry, report_count desc);

truncate table public.golden_report_collective_patterns;
insert into public.golden_report_collective_patterns (
  pattern_key, pattern_title, category, chapter_slug, report_count, occurrence_count,
  company_count, report_share, first_seen_at, last_seen_at, sample_actions, evidence_grades, updated_at
)
with total as (
  select count(distinct scan_id)::numeric n from public.golden_report_findings_index
), base as (
  select
    lower(regexp_replace(trim(coalesce(nullif(root_cause_title,''), nullif(title,''), 'unknown')), '\\s+', ' ', 'g')) pattern_key,
    min(coalesce(nullif(root_cause_title,''), nullif(title,''), 'Unknown')) pattern_title,
    min(category) category,
    min(chapter_slug) chapter_slug,
    count(distinct scan_id)::int report_count,
    count(*)::int occurrence_count,
    count(distinct brain_company_id)::int company_count,
    min(created_at) first_seen_at,
    max(created_at) last_seen_at,
    jsonb_agg(distinct recommended_action) filter (where coalesce(trim(recommended_action),'') <> '') sample_actions,
    jsonb_object_agg(coalesce(evidence_grade,'unknown'), grade_count) evidence_grades
  from (
    select f.*, coalesce(f.company_id, a.company_id) as brain_company_id,
      count(*) over (
        partition by lower(regexp_replace(trim(coalesce(nullif(root_cause_title,''), nullif(title,''), 'unknown')), '\\s+', ' ', 'g')),
        coalesce(evidence_grade,'unknown')
      ) grade_count
    from public.golden_report_findings_index f
    left join public.golden_report_archive a on a.scan_id=f.scan_id
  ) x
  group by pattern_key
)
select b.pattern_key,b.pattern_title,b.category,b.chapter_slug,b.report_count,b.occurrence_count,
  b.company_count,round(b.report_count/nullif(t.n,0),4),b.first_seen_at,b.last_seen_at,
  coalesce(b.sample_actions,'[]'::jsonb),coalesce(b.evidence_grades,'{}'::jsonb),now()
from base b cross join total t;

truncate table public.golden_report_pattern_pairs;
insert into public.golden_report_pattern_pairs(pattern_a,pattern_b,reports_together,pair_share,updated_at)
with report_patterns as (
  select distinct scan_id,
    lower(regexp_replace(trim(coalesce(nullif(root_cause_title,''), nullif(title,''), 'unknown')), '\\s+', ' ', 'g')) pattern_key
  from public.golden_report_findings_index
), total as (
  select count(distinct scan_id)::numeric n from report_patterns
)
select a.pattern_key,b.pattern_key,count(distinct a.scan_id)::int,
  round(count(distinct a.scan_id)::numeric/nullif(t.n,0),4),now()
from report_patterns a
join report_patterns b on b.scan_id=a.scan_id and b.pattern_key>a.pattern_key
cross join total t
group by a.pattern_key,b.pattern_key,t.n
having count(distinct a.scan_id) >= 3;

truncate table public.golden_report_industry_patterns;
insert into public.golden_report_industry_patterns(
  industry,pattern_key,pattern_title,category,report_count,occurrence_count,industry_report_count,industry_share,updated_at
)
with classified as (
  select a.scan_id,c.industry,
    lower(regexp_replace(trim(coalesce(nullif(f.root_cause_title,''), nullif(f.title,''), 'unknown')), '\\s+', ' ', 'g')) pattern_key,
    coalesce(nullif(f.root_cause_title,''),nullif(f.title,''),'Unknown') pattern_title,
    f.category
  from public.golden_report_findings_index f
  join public.golden_report_archive a on a.scan_id=f.scan_id
  join public.golden_report_companies c on c.id=a.company_id
  where coalesce(trim(c.industry),'') <> ''
), totals as (
  select industry,count(distinct scan_id)::numeric n from classified group by industry
)
select c.industry,c.pattern_key,min(c.pattern_title),min(c.category),count(distinct c.scan_id)::int,count(*)::int,
  t.n::int,round(count(distinct c.scan_id)::numeric/nullif(t.n,0),4),now()
from classified c join totals t using(industry)
group by c.industry,c.pattern_key,t.n;

insert into public.golden_report_brain_state(id,reports_analyzed,findings_analyzed,companies_analyzed,classified_industries,last_refresh_at,notes)
select 'collective',
  (select count(distinct scan_id) from public.golden_report_archive),
  (select count(*) from public.golden_report_findings_index),
  (select count(*) from public.golden_report_companies),
  (select count(distinct industry) from public.golden_report_companies where coalesce(trim(industry),'')<>''),
  now(),
  jsonb_build_object(
    'industry_status', case when exists(select 1 from public.golden_report_companies where coalesce(trim(industry),'')<>'') then 'classified' else 'awaiting_evidence_based_classification' end,
    'privacy','collective tables contain aggregate pattern intelligence only'
  )
on conflict(id) do update set
 reports_analyzed=excluded.reports_analyzed,
 findings_analyzed=excluded.findings_analyzed,
 companies_analyzed=excluded.companies_analyzed,
 classified_industries=excluded.classified_industries,
 last_refresh_at=excluded.last_refresh_at,
 notes=excluded.notes;