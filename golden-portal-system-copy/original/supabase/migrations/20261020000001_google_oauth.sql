-- google_oauth_state: short-lived CSRF state tokens for the OAuth flow
create table if not exists google_oauth_state (
  id         uuid primary key default gen_random_uuid(),
  state      text not null unique,
  rep_code   text not null,
  expires_at timestamptz not null default now() + interval '10 minutes',
  created_at timestamptz not null default now()
);
create index if not exists google_oauth_state_state_idx on google_oauth_state (state);

-- google_oauth_tokens: per-rep Google access + refresh tokens
create table if not exists google_oauth_tokens (
  rep_code       text primary key,
  google_email   text,
  access_token   text not null,
  refresh_token  text,
  expires_at     timestamptz not null,
  scope          text,
  connected_at   timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);
