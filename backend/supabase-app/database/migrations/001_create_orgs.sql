create table if not exists public.orgs (
  id          uuid primary key default gen_random_uuid(),
  name        text not null check (char_length(btrim(name)) between 2 and 120),
  name_key    text generated always as (lower(btrim(name))) stored,
  created_at  timestamptz not null default now(),
  constraint orgs_name_key_uq unique (name_key)
);

-- Only the server (service role) may touch this table: RLS on with no policies, client roles stripped.
alter table public.orgs enable row level security;
revoke all on public.orgs from anon, authenticated;
