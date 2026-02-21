create table if not exists public.user_consents (
  id uuid primary key default gen_random_uuid(),
  user_id text not null unique,
  telemetry_opt_in boolean not null default false,
  consent_version text not null default 'v1',
  locale text not null default 'tr-TR',
  updated_at timestamptz not null default now()
);

create table if not exists public.model_versions (
  id uuid primary key default gen_random_uuid(),
  model_key text not null unique,
  model_version text not null,
  release_notes text not null default '',
  created_at timestamptz not null default now()
);

create table if not exists public.movement_reference_profiles (
  id uuid primary key default gen_random_uuid(),
  movement_id text not null unique,
  title text not null,
  video_url text not null,
  guidance text[] not null default '{}',
  target_feature text not null,
  model_version text not null,
  created_at timestamptz not null default now()
);

alter table public.user_consents enable row level security;
alter table public.model_versions enable row level security;
alter table public.movement_reference_profiles enable row level security;

create policy "user_consents_owner"
on public.user_consents
for all
using (auth.uid()::text = user_id)
with check (auth.uid()::text = user_id);

create policy "model_versions_read"
on public.model_versions
for select
using (true);

create policy "movement_reference_profiles_read"
on public.movement_reference_profiles
for select
using (true);
