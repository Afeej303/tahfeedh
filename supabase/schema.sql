-- Run once in the Supabase SQL Editor for this project.
create table if not exists public.passages (
  user_id uuid not null references auth.users(id) on delete cascade,
  id text not null,
  payload jsonb not null default '{}'::jsonb,
  modified_at bigint not null,
  deleted_at bigint,
  primary key (user_id, id)
);

alter table public.passages enable row level security;

drop policy if exists "Users can access their own passages" on public.passages;
create policy "Users can access their own passages"
  on public.passages
  for all
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

grant select, insert, update on public.passages to authenticated;
