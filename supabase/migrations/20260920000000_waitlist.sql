-- The launch waitlist.
--
-- Anonymous visitors must be able to join — by definition they are not signed
-- in yet — but nobody must ever be able to read the list back. It is a
-- marketing asset and the publishable key is public, so this table is
-- deliberately INSERT-ONLY: there is no select, update, or delete policy at
-- all, which means the `anon` and `authenticated` roles cannot read a single
-- row even if they hold the key.
--
-- Reading the list requires the service role (or the Supabase dashboard).
-- Do not add a select policy to this table.

create table if not exists public.waitlist (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  source text,
  created_at timestamptz not null default now()
);

-- Case-insensitive uniqueness: one person should not appear twice because they
-- capitalised their address differently.
create unique index if not exists waitlist_email_lower_key
  on public.waitlist (lower(email));

alter table public.waitlist enable row level security;

drop policy if exists "Anyone may join the waitlist" on public.waitlist;
create policy "Anyone may join the waitlist"
  on public.waitlist
  for insert
  to anon, authenticated
  with check (true);

-- No select / update / delete policy. Intentional. See the note above.
