-- Secure the cloud memory-graph sync.
--
-- The original functions were SECURITY DEFINER, took the owner id as a
-- parameter, and were granted to `anon`. Because SECURITY DEFINER bypasses
-- row level security, anyone holding the public (publishable) key could read
-- or overwrite ANY user's graph simply by passing that user's id.
--
-- This migration keeps the same function signatures, so existing clients keep
-- working, but closes the hole:
--   1. enables row level security on public.user_graph,
--   2. restricts every row to its owner via auth.uid(),
--   3. runs the functions as SECURITY INVOKER so RLS actually applies,
--   4. removes anonymous access entirely (authenticated users only).
--
-- Note: `security invoker` is the default in Postgres, but it is stated
-- explicitly here so this file reads as the reversal of the original
-- `security definer` definitions.

alter table public.user_graph enable row level security;

drop policy if exists "Owners read their own graph" on public.user_graph;
create policy "Owners read their own graph"
  on public.user_graph
  for select
  to authenticated
  using (owner_id = auth.uid());

drop policy if exists "Owners insert their own graph" on public.user_graph;
create policy "Owners insert their own graph"
  on public.user_graph
  for insert
  to authenticated
  with check (owner_id = auth.uid());

drop policy if exists "Owners update their own graph" on public.user_graph;
create policy "Owners update their own graph"
  on public.user_graph
  for update
  to authenticated
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid());

drop policy if exists "Owners delete their own graph" on public.user_graph;
create policy "Owners delete their own graph"
  on public.user_graph
  for delete
  to authenticated
  using (owner_id = auth.uid());

-- Read: equivalent to the old call, but the caller can only ever reach their
-- own row. Both the explicit predicate and RLS enforce this.
create or replace function public.load_my_graph(p_owner_id uuid)
returns jsonb
language sql
stable
security invoker
set search_path = public
as $$
  select payload
  from public.user_graph
  where owner_id = auth.uid()
    and p_owner_id = auth.uid();
$$;

-- Write: the row is always written for the signed-in user. If the caller
-- passes someone else's id, the SELECT yields no rows and nothing is written.
create or replace function public.save_my_graph(p_owner_id uuid, p_payload jsonb)
returns void
language sql
security invoker
set search_path = public
as $$
  insert into public.user_graph (owner_id, payload, updated_at)
  select auth.uid(), p_payload, now()
  where p_owner_id = auth.uid()
  on conflict (owner_id)
  do update set payload = excluded.payload, updated_at = now();
$$;

-- Never expose the graph helpers to anonymous callers.
revoke all on function public.load_my_graph(uuid) from anon, public;
revoke all on function public.save_my_graph(uuid, jsonb) from anon, public;
grant execute on function public.load_my_graph(uuid) to authenticated;
grant execute on function public.save_my_graph(uuid, jsonb) to authenticated;
