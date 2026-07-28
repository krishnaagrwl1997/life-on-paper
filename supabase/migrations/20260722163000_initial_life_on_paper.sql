create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text,
  avatar_url text,
  is_discoverable boolean not null default false,
  onboarding_completed boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.books (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles (id) on delete cascade,
  title text not null,
  subtitle text,
  summary text,
  cover_style text not null default 'linen',
  visibility text not null default 'private'
    check (visibility in ('private', 'request', 'previews')),
  status text not null default 'active'
    check (status in ('draft', 'active', 'complete', 'archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.volumes (
  id uuid primary key default gen_random_uuid(),
  book_id uuid not null references public.books (id) on delete cascade,
  title text not null,
  position integer not null default 1 check (position > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (book_id, position)
);

create table if not exists public.chapters (
  id uuid primary key default gen_random_uuid(),
  volume_id uuid not null references public.volumes (id) on delete cascade,
  title text not null,
  summary text,
  position integer not null default 1 check (position > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (volume_id, position)
);

create table if not exists public.memories (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles (id) on delete cascade,
  chapter_id uuid references public.chapters (id) on delete set null,
  source_type text not null default 'text'
    check (source_type in ('text', 'voice', 'photo', 'document', 'mixed')),
  raw_text text,
  transcript text,
  ai_summary text,
  feeling_note text,
  captured_at timestamptz not null default now(),
  status text not null default 'draft'
    check (status in ('draft', 'gathering', 'placed', 'page_created')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.memory_emotions (
  memory_id uuid not null references public.memories (id) on delete cascade,
  emotion text not null,
  intensity smallint check (intensity between 1 and 5),
  created_at timestamptz not null default now(),
  primary key (memory_id, emotion)
);

create table if not exists public.media_assets (
  id uuid primary key default gen_random_uuid(),
  memory_id uuid not null references public.memories (id) on delete cascade,
  owner_id uuid not null references public.profiles (id) on delete cascade,
  bucket text not null default 'memory-media',
  path text not null unique,
  media_type text not null
    check (media_type in ('image', 'audio', 'document')),
  mime_type text,
  original_name text,
  size_bytes bigint check (size_bytes is null or size_bytes >= 0),
  width integer check (width is null or width > 0),
  height integer check (height is null or height > 0),
  duration_seconds numeric check (duration_seconds is null or duration_seconds >= 0),
  created_at timestamptz not null default now()
);

create table if not exists public.pages (
  id uuid primary key default gen_random_uuid(),
  chapter_id uuid not null references public.chapters (id) on delete cascade,
  memory_id uuid not null unique references public.memories (id) on delete cascade,
  layout text not null default 'story'
    check (layout in (
      'story', 'quote', 'illustration', 'little_things', 'letter',
      'timeline', 'travel', 'people', 'reflection'
    )),
  title text not null,
  dek text,
  body text not null,
  pull_quote text,
  position integer not null default 1 check (position > 0),
  is_preview_public boolean not null default false,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (chapter_id, position)
);

create table if not exists public.book_access_requests (
  id uuid primary key default gen_random_uuid(),
  book_id uuid not null references public.books (id) on delete cascade,
  requester_id uuid not null references public.profiles (id) on delete cascade,
  status text not null default 'pending'
    check (status in ('pending', 'granted', 'denied', 'revoked')),
  requested_at timestamptz not null default now(),
  decided_at timestamptz,
  unique (book_id, requester_id)
);

create index if not exists books_owner_id_idx on public.books (owner_id);
create index if not exists books_visibility_idx on public.books (visibility);
create index if not exists volumes_book_id_idx on public.volumes (book_id);
create index if not exists chapters_volume_id_idx on public.chapters (volume_id);
create index if not exists memories_owner_id_captured_at_idx
  on public.memories (owner_id, captured_at desc);
create index if not exists memories_chapter_id_idx on public.memories (chapter_id);
create index if not exists media_assets_memory_id_idx on public.media_assets (memory_id);
create index if not exists pages_chapter_id_idx on public.pages (chapter_id);
create index if not exists access_requests_book_status_idx
  on public.book_access_requests (book_id, status);
create index if not exists access_requests_requester_idx
  on public.book_access_requests (requester_id);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

drop trigger if exists books_set_updated_at on public.books;
create trigger books_set_updated_at
before update on public.books
for each row execute function public.set_updated_at();

drop trigger if exists volumes_set_updated_at on public.volumes;
create trigger volumes_set_updated_at
before update on public.volumes
for each row execute function public.set_updated_at();

drop trigger if exists chapters_set_updated_at on public.chapters;
create trigger chapters_set_updated_at
before update on public.chapters
for each row execute function public.set_updated_at();

drop trigger if exists memories_set_updated_at on public.memories;
create trigger memories_set_updated_at
before update on public.memories
for each row execute function public.set_updated_at();

drop trigger if exists pages_set_updated_at on public.pages;
create trigger pages_set_updated_at
before update on public.pages
for each row execute function public.set_updated_at();

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, display_name, avatar_url)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name'),
    new.raw_user_meta_data ->> 'avatar_url'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

insert into public.profiles (id, display_name, avatar_url)
select
  id,
  coalesce(raw_user_meta_data ->> 'full_name', raw_user_meta_data ->> 'name'),
  raw_user_meta_data ->> 'avatar_url'
from auth.users
on conflict (id) do nothing;

create or replace function public.owns_book(target_book_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.books
    where id = target_book_id
      and owner_id = auth.uid()
  );
$$;

create or replace function public.has_book_access(target_book_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.owns_book(target_book_id)
    or exists (
      select 1
      from public.book_access_requests
      where book_id = target_book_id
        and requester_id = auth.uid()
        and status = 'granted'
    );
$$;

revoke all on function public.owns_book(uuid) from public;
revoke all on function public.has_book_access(uuid) from public;
grant execute on function public.owns_book(uuid) to anon, authenticated;
grant execute on function public.has_book_access(uuid) to anon, authenticated;

alter table public.profiles enable row level security;
alter table public.books enable row level security;
alter table public.volumes enable row level security;
alter table public.chapters enable row level security;
alter table public.memories enable row level security;
alter table public.memory_emotions enable row level security;
alter table public.media_assets enable row level security;
alter table public.pages enable row level security;
alter table public.book_access_requests enable row level security;

drop policy if exists "Profiles are visible when discoverable" on public.profiles;
create policy "Profiles are visible when discoverable"
on public.profiles for select
using (id = auth.uid() or is_discoverable);

drop policy if exists "Users create their own profile" on public.profiles;
create policy "Users create their own profile"
on public.profiles for insert
with check (id = auth.uid());

drop policy if exists "Users update their own profile" on public.profiles;
create policy "Users update their own profile"
on public.profiles for update
using (id = auth.uid())
with check (id = auth.uid());

drop policy if exists "Readers can discover shared books" on public.books;
create policy "Readers can discover shared books"
on public.books for select
using (owner_id = auth.uid() or visibility in ('request', 'previews'));

drop policy if exists "Owners create books" on public.books;
create policy "Owners create books"
on public.books for insert
with check (owner_id = auth.uid());

drop policy if exists "Owners update books" on public.books;
create policy "Owners update books"
on public.books for update
using (owner_id = auth.uid())
with check (owner_id = auth.uid());

drop policy if exists "Owners delete books" on public.books;
create policy "Owners delete books"
on public.books for delete
using (owner_id = auth.uid());

drop policy if exists "Readers see permitted volumes" on public.volumes;
create policy "Readers see permitted volumes"
on public.volumes for select
using (
  public.has_book_access(book_id)
  or exists (
    select 1 from public.books
    where books.id = volumes.book_id and books.visibility = 'previews'
  )
);

drop policy if exists "Owners manage volumes" on public.volumes;
create policy "Owners manage volumes"
on public.volumes for all
using (public.owns_book(book_id))
with check (public.owns_book(book_id));

drop policy if exists "Readers see permitted chapters" on public.chapters;
create policy "Readers see permitted chapters"
on public.chapters for select
using (
  exists (
    select 1
    from public.volumes
    where volumes.id = chapters.volume_id
      and (
        public.has_book_access(volumes.book_id)
        or exists (
          select 1 from public.books
          where books.id = volumes.book_id and books.visibility = 'previews'
        )
      )
  )
);

drop policy if exists "Owners manage chapters" on public.chapters;
create policy "Owners manage chapters"
on public.chapters for all
using (
  exists (
    select 1 from public.volumes
    where volumes.id = chapters.volume_id
      and public.owns_book(volumes.book_id)
  )
)
with check (
  exists (
    select 1 from public.volumes
    where volumes.id = chapters.volume_id
      and public.owns_book(volumes.book_id)
  )
);

drop policy if exists "Owners manage memories" on public.memories;
create policy "Owners manage memories"
on public.memories for all
using (owner_id = auth.uid())
with check (owner_id = auth.uid());

drop policy if exists "Owners manage memory emotions" on public.memory_emotions;
create policy "Owners manage memory emotions"
on public.memory_emotions for all
using (
  exists (
    select 1 from public.memories
    where memories.id = memory_emotions.memory_id
      and memories.owner_id = auth.uid()
  )
)
with check (
  exists (
    select 1 from public.memories
    where memories.id = memory_emotions.memory_id
      and memories.owner_id = auth.uid()
  )
);

drop policy if exists "Owners manage media metadata" on public.media_assets;
create policy "Owners manage media metadata"
on public.media_assets for all
using (owner_id = auth.uid())
with check (
  owner_id = auth.uid()
  and exists (
    select 1 from public.memories
    where memories.id = media_assets.memory_id
      and memories.owner_id = auth.uid()
  )
);

drop policy if exists "Readers see permitted pages" on public.pages;
create policy "Readers see permitted pages"
on public.pages for select
using (
  is_preview_public
  or exists (
    select 1
    from public.chapters
    join public.volumes on volumes.id = chapters.volume_id
    where chapters.id = pages.chapter_id
      and public.has_book_access(volumes.book_id)
  )
);

drop policy if exists "Owners manage pages" on public.pages;
create policy "Owners manage pages"
on public.pages for all
using (
  exists (
    select 1
    from public.chapters
    join public.volumes on volumes.id = chapters.volume_id
    where chapters.id = pages.chapter_id
      and public.owns_book(volumes.book_id)
  )
)
with check (
  exists (
    select 1
    from public.chapters
    join public.volumes on volumes.id = chapters.volume_id
    where chapters.id = pages.chapter_id
      and public.owns_book(volumes.book_id)
  )
);

drop policy if exists "Participants see access requests" on public.book_access_requests;
create policy "Participants see access requests"
on public.book_access_requests for select
using (
  requester_id = auth.uid()
  or public.owns_book(book_id)
);

drop policy if exists "Readers request access" on public.book_access_requests;
create policy "Readers request access"
on public.book_access_requests for insert
with check (
  requester_id = auth.uid()
  and not public.owns_book(book_id)
  and exists (
    select 1 from public.books
    where books.id = book_access_requests.book_id
      and books.visibility = 'request'
  )
);

drop policy if exists "Owners decide access requests" on public.book_access_requests;
create policy "Owners decide access requests"
on public.book_access_requests for update
using (public.owns_book(book_id))
with check (public.owns_book(book_id));

drop policy if exists "Readers withdraw access requests" on public.book_access_requests;
create policy "Readers withdraw access requests"
on public.book_access_requests for delete
using (requester_id = auth.uid());

insert into storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
values (
  'memory-media',
  'memory-media',
  false,
  52428800,
  array[
    'image/jpeg', 'image/png', 'image/webp', 'image/heic',
    'audio/mpeg', 'audio/mp4', 'audio/wav', 'audio/webm',
    'application/pdf', 'text/plain'
  ]
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Users upload their own memory media" on storage.objects;
create policy "Users upload their own memory media"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'memory-media'
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists "Users read their own memory media" on storage.objects;
create policy "Users read their own memory media"
on storage.objects for select to authenticated
using (
  bucket_id = 'memory-media'
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists "Users update their own memory media" on storage.objects;
create policy "Users update their own memory media"
on storage.objects for update to authenticated
using (
  bucket_id = 'memory-media'
  and (storage.foldername(name))[1] = auth.uid()::text
)
with check (
  bucket_id = 'memory-media'
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists "Users delete their own memory media" on storage.objects;
create policy "Users delete their own memory media"
on storage.objects for delete to authenticated
using (
  bucket_id = 'memory-media'
  and (storage.foldername(name))[1] = auth.uid()::text
);
