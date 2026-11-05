create table if not exists public.admin_image_studio (
  id uuid primary key default gen_random_uuid(),
  prompt text not null default '',
  url text not null,
  storage_path text,
  model text,
  source text not null default 'generated',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
alter table public.admin_image_studio enable row level security;
create policy "admin_image_studio_select" on public.admin_image_studio for select using (public.is_admin(auth.uid()));
create policy "admin_image_studio_insert" on public.admin_image_studio for insert with check (public.is_admin(auth.uid()));
create policy "admin_image_studio_delete" on public.admin_image_studio for delete using (public.is_admin(auth.uid()));
create index if not exists admin_image_studio_created_idx on public.admin_image_studio (created_at desc);