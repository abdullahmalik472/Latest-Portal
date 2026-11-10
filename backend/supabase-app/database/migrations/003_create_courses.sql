create table if not exists public.courses (
  id          uuid primary key default gen_random_uuid(),
  org_id      uuid not null,
  teacher_id  uuid not null,
  title       text not null check (char_length(title) between 2 and 160),
  created_at  timestamptz not null default now(),
  constraint courses_org_fk     foreign key (org_id)     references public.orgs (id)  on delete restrict,
  constraint courses_teacher_fk foreign key (teacher_id) references public.users (id) on delete restrict
);
create index if not exists courses_org_idx     on public.courses (org_id);
create index if not exists courses_teacher_idx on public.courses (teacher_id);

alter table public.courses enable row level security;
revoke all on public.courses from anon, authenticated;
