create table if not exists public.frame_telemetry_samples (
  id uuid primary key default gen_random_uuid(),
  user_id text not null,
  pseudo_session_key text not null,
  movement_id text not null,
  model_version text not null,
  device_orientation text not null,
  quality_overall numeric not null,
  accuracy numeric not null,
  confidence numeric not null,
  status_color text not null,
  distance_bucket text not null,
  latency_ms numeric not null default 0,
  notes text[] not null default '{}',
  created_at timestamptz not null default now()
);

create table if not exists public.evaluation_rollups (
  id uuid primary key default gen_random_uuid(),
  user_id text not null,
  bucket_id text not null,
  sample_count integer not null,
  average_accuracy numeric not null,
  average_confidence numeric not null,
  red_rate numeric not null,
  model_version text not null,
  created_at timestamptz not null default now()
);

create index if not exists idx_frame_telemetry_user_time
  on public.frame_telemetry_samples (user_id, created_at desc);

create index if not exists idx_evaluation_rollups_user_bucket
  on public.evaluation_rollups (user_id, bucket_id);

alter table public.frame_telemetry_samples enable row level security;
alter table public.evaluation_rollups enable row level security;

create policy "frame_telemetry_owner"
on public.frame_telemetry_samples
for all
using (auth.uid()::text = user_id)
with check (auth.uid()::text = user_id);

create policy "evaluation_rollups_owner"
on public.evaluation_rollups
for all
using (auth.uid()::text = user_id)
with check (auth.uid()::text = user_id);
