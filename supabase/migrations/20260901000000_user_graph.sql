-- Phase 6+ — Cloud sync of the local memory graph (decisions, dismissed, care, monthly).
-- Apply this migration to the Supabase project to enable multi-device graph sync.

create table if not exists public.user_graph (
  owner_id uuid primary key references auth.users(id) on delete cascade,
  payload jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

create or replace function public.load_my_graph(p_owner_id uuid)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select payload from public.user_graph where owner_id = p_owner_id;
$$;

create or replace function public.save_my_graph(p_owner_id uuid, p_payload jsonb)
returns void
language sql
security definer
set search_path = public
as $$
  insert into public.user_graph (owner_id, payload, updated_at)
  values (p_owner_id, p_payload, now())
  on conflict (owner_id)
  do update set payload = excluded.payload, updated_at = now();
$$;

grant execute on function public.load_my_graph(uuid) to anon, authenticated;
grant execute on function public.save_my_graph(uuid, jsonb) to anon, authenticated;
