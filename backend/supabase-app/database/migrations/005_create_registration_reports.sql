-- Snapshots written by the registration-report cron job.
create table if not exists public.registration_reports (
  id            bigint generated always as identity primary key,
  generated_at  timestamptz not null,
  total_users   integer not null,
  last_10m      integer not null,
  last_1h       integer not null,
  last_1d       integer not null,
  last_7d       integer not null,
  last_30d      integer not null
);
create index if not exists registration_reports_generated_idx on public.registration_reports (generated_at desc);

alter table public.registration_reports enable row level security;
revoke all on public.registration_reports from anon, authenticated;
