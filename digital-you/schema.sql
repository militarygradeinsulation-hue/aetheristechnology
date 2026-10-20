-- Digital You / Essence Engine — production database schema (PostgreSQL / Supabase).
--
-- The browser prototype (essence-engine.js) runs entirely on localStorage and treats the whole
-- Digital You as one JSON document. This schema is the normalized version of that same
-- document for a real backend: one row per entity, foreign keys enforcing the architecture
-- (Existing Tool -> Bridge -> Memory -> Core -> Specialized You -> Decision DNA -> Goal Engine
-- -> Actions -> Proof -> Corrections -> Better Digital You), and Row Level Security so a Digital
-- You can only ever see and act on the identity it belongs to.
--
-- Apply with the Supabase CLI/MCP (`apply_migration`) or `psql -f schema.sql`.

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- Digital Core — one row per person's Digital You identity.
-- ---------------------------------------------------------------------------
create table if not exists digital_identities (
  id              uuid primary key default gen_random_uuid(),
  owner_user_id   uuid not null,                    -- references your auth.users(id)
  name            text not null default 'Digital You',
  mission         text not null default '',
  standards       jsonb not null default '[]',      -- text[]-shaped jsonb array
  boundaries      jsonb not null default '[]',
  style           jsonb not null default '{}',       -- { tone, vocabulary, doNot: [] }
  voice_provider      text default '',
  voice_avatar_provider text default '',
  voice_id        text default '',
  avatar_id       text default '',
  voice_base_url  text default '',                   -- your own backend, never a raw provider key
  active_instance_id uuid,                            -- fk added after specialized_instances exists
  storage_mode    text not null default 'local' check (storage_mode in ('local','remote')),
  -- Whole-document escape hatch, keyed by storage-adapter key (e.g. "essence_engine_db_v1"):
  -- adapters/storage-adapter.js's createSupabaseStorageAdapter reads/writes this column so the
  -- browser can persist the engine's single JSON document without decomposing it. A backend
  -- that reads/writes the normalized tables below instead can ignore this column entirely.
  snapshot        jsonb not null default '{}',
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- My Digital Team — Executive You, Marketing You, Operations You, Research You,
-- or unlimited custom copies. Each inherits digital_identities unless overridden.
-- ---------------------------------------------------------------------------
create table if not exists specialized_instances (
  id                uuid primary key default gen_random_uuid(),
  identity_id       uuid not null references digital_identities(id) on delete cascade,
  name              text not null,
  archetype         text not null default 'Custom'
                      check (archetype in ('Executive You','Marketing You','Operations You','Research You','Custom')),
  mission_override  text default '',
  autonomy          smallint not null default 0
                      check (autonomy between 0 and 4),  -- 0 Observe .. 4 Autonomous
  memory_scope      text not null default 'all' check (memory_scope in ('all','own')),
  created_at        timestamptz not null default now()
);

alter table digital_identities
  add constraint digital_identities_active_instance_fk
  foreign key (active_instance_id) references specialized_instances(id) on delete set null;

-- ---------------------------------------------------------------------------
-- Memory Graph — principles, preferences, observations, connected intelligence,
-- corrections, decision patterns. linked_instance_id null = shared across the team.
-- ---------------------------------------------------------------------------
create table if not exists memory_nodes (
  id                  uuid primary key default gen_random_uuid(),
  identity_id         uuid not null references digital_identities(id) on delete cascade,
  linked_instance_id  uuid references specialized_instances(id) on delete set null,
  type                text not null check (type in
                        ('principle','preference','observation','connected_intelligence','correction','decision_pattern')),
  content             text not null,
  tags                jsonb not null default '[]',
  weight              real not null default 0.5,
  source              text not null default 'manual',   -- manual | seed | bridge | correction
  created_at          timestamptz not null default now()
);
create index if not exists memory_nodes_identity_idx on memory_nodes(identity_id);
create index if not exists memory_nodes_type_idx on memory_nodes(identity_id, type);

-- Simple graph edges between memory nodes, for when relatedness needs to be explicit
-- rather than inferred at query time (the prototype infers relatedness via tag/keyword
-- overlap instead of storing edges — this table is here for when that stops being enough).
create table if not exists memory_edges (
  id           uuid primary key default gen_random_uuid(),
  identity_id  uuid not null references digital_identities(id) on delete cascade,
  from_node_id uuid not null references memory_nodes(id) on delete cascade,
  to_node_id   uuid not null references memory_nodes(id) on delete cascade,
  relation     text not null default 'related_to',
  created_at   timestamptz not null default now(),
  unique (from_node_id, to_node_id, relation)
);

-- ---------------------------------------------------------------------------
-- Decision DNA — "Teach Me You": situation / notice / consider / usually-do rules.
-- ---------------------------------------------------------------------------
create table if not exists thought_rules (
  id                  uuid primary key default gen_random_uuid(),
  identity_id         uuid not null references digital_identities(id) on delete cascade,
  linked_instance_id  uuid references specialized_instances(id) on delete set null,
  situation           text not null,
  what_i_notice       jsonb not null default '[]',
  what_i_consider     jsonb not null default '[]',
  what_i_usually_do   text not null,
  source              text not null default 'taught' check (source in ('taught','observed','corrected')),
  confidence          real not null default 0.5,
  created_at          timestamptz not null default now()
);
create index if not exists thought_rules_identity_idx on thought_rules(identity_id);

-- ---------------------------------------------------------------------------
-- Goal Engine + Live Work — an outcome decomposed into tasks, streamed across the team.
-- ---------------------------------------------------------------------------
create table if not exists goals (
  id                 uuid primary key default gen_random_uuid(),
  identity_id        uuid not null references digital_identities(id) on delete cascade,
  owner_instance_id  uuid references specialized_instances(id) on delete set null,
  outcome            text not null,
  status             text not null default 'active' check (status in ('active','complete','abandoned')),
  created_at         timestamptz not null default now()
);

create table if not exists tasks (
  id                 uuid primary key default gen_random_uuid(),
  identity_id        uuid not null references digital_identities(id) on delete cascade,
  goal_id            uuid references goals(id) on delete cascade,
  owner_instance_id  uuid references specialized_instances(id) on delete set null,
  title              text not null,
  description        text default '',
  status             text not null default 'queued' check (status in ('queued','in-progress','done')),
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);
create index if not exists tasks_goal_idx on tasks(goal_id);
create index if not exists tasks_identity_status_idx on tasks(identity_id, status);

-- ---------------------------------------------------------------------------
-- Idea Engine — opportunities that can convert directly into a goal.
-- ---------------------------------------------------------------------------
create table if not exists ideas (
  id                  uuid primary key default gen_random_uuid(),
  identity_id         uuid not null references digital_identities(id) on delete cascade,
  title               text not null,
  description         text default '',
  potential_impact    text not null default 'medium' check (potential_impact in ('low','medium','high')),
  status              text not null default 'new' check (status in ('new','queued','dismissed')),
  converted_goal_id   uuid references goals(id) on delete set null,
  created_at          timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Decision Center — where authority is insufficient, it waits for a human here.
-- ---------------------------------------------------------------------------
create table if not exists decisions (
  id                 uuid primary key default gen_random_uuid(),
  identity_id        uuid not null references digital_identities(id) on delete cascade,
  instance_id        uuid references specialized_instances(id) on delete set null,
  proof_id           uuid,                              -- fk added after proofs exists
  question           text not null,
  context             text default '',
  required_authority text not null default 'Execute With Approval',
  current_autonomy   text not null default 'Observe',
  status             text not null default 'pending_human' check (status in ('pending_human','resolved')),
  resolution         text check (resolution in ('approved','rejected','modified')),
  resolution_note    text default '',
  created_at         timestamptz not null default now(),
  resolved_at        timestamptz
);

-- ---------------------------------------------------------------------------
-- Proof System — actor, action, reason, evidence, confidence, outcome, recorded time.
-- Append-only by convention; nothing in the app updates or deletes a proof row.
-- ---------------------------------------------------------------------------
create table if not exists proofs (
  id           uuid primary key default gen_random_uuid(),
  identity_id  uuid not null references digital_identities(id) on delete cascade,
  actor        text not null,          -- instance name, "Human", "Channel Intelligence Bridge", etc.
  action       text not null,
  reason       text default '',
  evidence     jsonb not null default '[]',
  confidence   real,
  outcome      text default '',
  recorded_at  timestamptz not null default now()
);
create index if not exists proofs_identity_idx on proofs(identity_id, recorded_at desc);

alter table decisions
  add constraint decisions_proof_fk foreign key (proof_id) references proofs(id) on delete set null;

-- ---------------------------------------------------------------------------
-- That's Not Me — corrections become new training evidence (memory + a thought rule).
-- ---------------------------------------------------------------------------
create table if not exists corrections (
  id                     uuid primary key default gen_random_uuid(),
  identity_id            uuid not null references digital_identities(id) on delete cascade,
  instance_id            uuid references specialized_instances(id) on delete set null,
  proof_id               uuid references proofs(id) on delete set null,
  problem                text not null,
  what_should_have_been  text not null,
  why                    text not null,
  resulting_memory_id    uuid references memory_nodes(id) on delete set null,
  resulting_rule_id      uuid references thought_rules(id) on delete set null,
  created_at             timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Channel Intelligence Bridge (and any future connected system) — absorbed snapshots.
-- One row per "Absorb Current Dashboard" event; source distinguishes which tool it came from
-- so a CRM, Golden Report, email system, or custom Aetheris tool can plug into the same table.
-- ---------------------------------------------------------------------------
create table if not exists connected_system_snapshots (
  id             uuid primary key default gen_random_uuid(),
  identity_id    uuid not null references digital_identities(id) on delete cascade,
  source         text not null default 'channel-intelligence-dashboard',
  filters        jsonb not null default '{}',
  kpis           jsonb not null default '{}',
  filtered_data  jsonb not null default '[]',
  history_excerpt jsonb not null default '[]',
  raw_row_count  integer default 0,
  captured_at    timestamptz not null default now()
);
create index if not exists connected_snapshots_identity_idx on connected_system_snapshots(identity_id, captured_at desc);

-- ---------------------------------------------------------------------------
-- updated_at maintenance
-- ---------------------------------------------------------------------------
create or replace function set_updated_at() returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists digital_identities_set_updated_at on digital_identities;
create trigger digital_identities_set_updated_at
  before update on digital_identities
  for each row execute function set_updated_at();

drop trigger if exists tasks_set_updated_at on tasks;
create trigger tasks_set_updated_at
  before update on tasks
  for each row execute function set_updated_at();

-- ---------------------------------------------------------------------------
-- Row Level Security — a Digital You (and the human behind it) only ever sees its own data.
-- Adjust auth.uid() if you're not on Supabase Auth.
-- ---------------------------------------------------------------------------
alter table digital_identities enable row level security;
alter table specialized_instances enable row level security;
alter table memory_nodes enable row level security;
alter table memory_edges enable row level security;
alter table thought_rules enable row level security;
alter table goals enable row level security;
alter table tasks enable row level security;
alter table ideas enable row level security;
alter table decisions enable row level security;
alter table proofs enable row level security;
alter table corrections enable row level security;
alter table connected_system_snapshots enable row level security;

create policy "owner reads own identity" on digital_identities
  for select using (owner_user_id = auth.uid());
create policy "owner writes own identity" on digital_identities
  for all using (owner_user_id = auth.uid()) with check (owner_user_id = auth.uid());

-- Every other table hangs off digital_identities.owner_user_id via identity_id — the same
-- shape repeats per table so a Digital You instance can never read or act across identities.
create policy "owner reads own instances" on specialized_instances
  for select using (identity_id in (select id from digital_identities where owner_user_id = auth.uid()));
create policy "owner writes own instances" on specialized_instances
  for all using (identity_id in (select id from digital_identities where owner_user_id = auth.uid()))
  with check (identity_id in (select id from digital_identities where owner_user_id = auth.uid()));

create policy "owner reads own memory" on memory_nodes
  for select using (identity_id in (select id from digital_identities where owner_user_id = auth.uid()));
create policy "owner writes own memory" on memory_nodes
  for all using (identity_id in (select id from digital_identities where owner_user_id = auth.uid()))
  with check (identity_id in (select id from digital_identities where owner_user_id = auth.uid()));

create policy "owner reads own memory edges" on memory_edges
  for select using (identity_id in (select id from digital_identities where owner_user_id = auth.uid()));
create policy "owner writes own memory edges" on memory_edges
  for all using (identity_id in (select id from digital_identities where owner_user_id = auth.uid()))
  with check (identity_id in (select id from digital_identities where owner_user_id = auth.uid()));

create policy "owner reads own thought rules" on thought_rules
  for select using (identity_id in (select id from digital_identities where owner_user_id = auth.uid()));
create policy "owner writes own thought rules" on thought_rules
  for all using (identity_id in (select id from digital_identities where owner_user_id = auth.uid()))
  with check (identity_id in (select id from digital_identities where owner_user_id = auth.uid()));

create policy "owner reads own goals" on goals
  for select using (identity_id in (select id from digital_identities where owner_user_id = auth.uid()));
create policy "owner writes own goals" on goals
  for all using (identity_id in (select id from digital_identities where owner_user_id = auth.uid()))
  with check (identity_id in (select id from digital_identities where owner_user_id = auth.uid()));

create policy "owner reads own tasks" on tasks
  for select using (identity_id in (select id from digital_identities where owner_user_id = auth.uid()));
create policy "owner writes own tasks" on tasks
  for all using (identity_id in (select id from digital_identities where owner_user_id = auth.uid()))
  with check (identity_id in (select id from digital_identities where owner_user_id = auth.uid()));

create policy "owner reads own ideas" on ideas
  for select using (identity_id in (select id from digital_identities where owner_user_id = auth.uid()));
create policy "owner writes own ideas" on ideas
  for all using (identity_id in (select id from digital_identities where owner_user_id = auth.uid()))
  with check (identity_id in (select id from digital_identities where owner_user_id = auth.uid()));

create policy "owner reads own decisions" on decisions
  for select using (identity_id in (select id from digital_identities where owner_user_id = auth.uid()));
create policy "owner writes own decisions" on decisions
  for all using (identity_id in (select id from digital_identities where owner_user_id = auth.uid()))
  with check (identity_id in (select id from digital_identities where owner_user_id = auth.uid()));

create policy "owner reads own proofs" on proofs
  for select using (identity_id in (select id from digital_identities where owner_user_id = auth.uid()));
create policy "owner writes own proofs" on proofs
  for insert with check (identity_id in (select id from digital_identities where owner_user_id = auth.uid()));
-- No update/delete policy on proofs: the Proof System is append-only by design.

create policy "owner reads own corrections" on corrections
  for select using (identity_id in (select id from digital_identities where owner_user_id = auth.uid()));
create policy "owner writes own corrections" on corrections
  for all using (identity_id in (select id from digital_identities where owner_user_id = auth.uid()))
  with check (identity_id in (select id from digital_identities where owner_user_id = auth.uid()));

create policy "owner reads own connected snapshots" on connected_system_snapshots
  for select using (identity_id in (select id from digital_identities where owner_user_id = auth.uid()));
create policy "owner writes own connected snapshots" on connected_system_snapshots
  for all using (identity_id in (select id from digital_identities where owner_user_id = auth.uid()))
  with check (identity_id in (select id from digital_identities where owner_user_id = auth.uid()));
