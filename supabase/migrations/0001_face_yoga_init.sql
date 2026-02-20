-- Enable required extension.
create extension if not exists pgcrypto;

-- Users profile table (auth.users reference).
create table if not exists public.user_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id text not null unique,
  goals text[] not null default '{}',
  consent_version text not null default 'v1',
  created_at timestamptz not null default now()
);

create table if not exists public.calibration_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id text not null unique,
  quality_average numeric not null,
  quality_sample_count integer not null,
  recommended_duration_sec integer not null,
  neutral_expression_proxy numeric not null,
  expression_std_dev numeric not null,
  symmetry_index numeric not null,
  device_platform text not null,
  device_user_agent text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.sessions (
  id uuid primary key default gen_random_uuid(),
  user_id text not null,
  started_at timestamptz not null,
  ended_at timestamptz not null,
  duration_sec integer not null,
  completion_rate numeric not null,
  consistency numeric not null,
  created_at timestamptz not null default now()
);

create table if not exists public.session_movements (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.sessions(id) on delete cascade,
  movement_id text not null,
  average_accuracy numeric not null,
  rep_count integer not null
);

alter table public.user_profiles enable row level security;
alter table public.calibration_profiles enable row level security;
alter table public.sessions enable row level security;
alter table public.session_movements enable row level security;

create policy "user_profiles_owner"
on public.user_profiles
for all
using (auth.uid()::text = user_id)
with check (auth.uid()::text = user_id);

create policy "calibration_profiles_owner"
on public.calibration_profiles
for all
using (auth.uid()::text = user_id)
with check (auth.uid()::text = user_id);

create policy "sessions_owner"
on public.sessions
for all
using (auth.uid()::text = user_id)
with check (auth.uid()::text = user_id);

create policy "session_movements_owner"
on public.session_movements
for all
using (
  exists (
    select 1
    from public.sessions s
    where s.id = session_movements.session_id
      and s.user_id = auth.uid()::text
  )
)
with check (
  exists (
    select 1
    from public.sessions s
    where s.id = session_movements.session_id
      and s.user_id = auth.uid()::text
  )
);
