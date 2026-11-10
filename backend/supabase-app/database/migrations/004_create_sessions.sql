-- Server-side sessions. Only the SHA-256 of the cookie token is stored.
create table if not exists public.sessions (
  id            uuid primary key,
  user_id       uuid not null,
  token_hash    text not null,
  created_at    timestamptz not null,
  expires_at    timestamptz not null,
  last_seen_at  timestamptz not null,
  ip            text null,
  user_agent    text null,
  constraint sessions_user_fk  foreign key (user_id) references public.users (id) on delete cascade,
  constraint sessions_token_uq unique (token_hash)
);
create index if not exists sessions_user_idx    on public.sessions (user_id);
create index if not exists sessions_expires_idx on public.sessions (expires_at);

alter table public.sessions enable row level security;
revoke all on public.sessions from anon, authenticated;
