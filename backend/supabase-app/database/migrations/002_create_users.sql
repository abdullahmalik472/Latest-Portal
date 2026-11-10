create table if not exists public.users (
  id             uuid primary key default gen_random_uuid(),
  org_id         uuid not null,
  name           text not null check (char_length(name) between 1 and 120),
  email          text not null check (char_length(email) <= 254),  -- NOT unique: same email may exist in many orgs
  password_hash  text not null,                                    -- bcrypt
  role           text not null check (role in ('admin', 'teacher', 'student')),
  reg            text not null,
  created_at     timestamptz not null default now(),
  migrated_from  text null,          -- 'mysql' when imported by the one-way migration
  imported_at    timestamptz null,
  constraint users_org_fk foreign key (org_id) references public.orgs (id) on delete restrict,
  constraint users_reg_uq unique (reg)
);
create index if not exists users_email_idx    on public.users (email);
create index if not exists users_org_role_idx on public.users (org_id, role);
create index if not exists users_created_idx  on public.users (created_at);

alter table public.users enable row level security;
revoke all on public.users from anon, authenticated;
