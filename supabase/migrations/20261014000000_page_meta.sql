-- Keep the page fields that only the app understands, so a cloud round-trip
-- (sign-in, a second device) no longer drops them.
--
-- `meta` holds: localId (the device id, which keepsakes, weaves and memory
-- decisions refer to), people, keepsakes, createdAt, emotions,
-- speechLanguage, writingVersion, writingStyle, artworkLevel, photoTreatment.
-- It is owned by the same RLS as the page row; nothing new is exposed.

alter table public.pages
  add column if not exists meta jsonb not null default '{}'::jsonb;

-- Fast lookup of a page by its device id when syncing.
create index if not exists pages_meta_local_id_idx
  on public.pages ((meta ->> 'localId'));

-- The return type changes, so the function has to be dropped and recreated.
drop function if exists public.get_my_pages();

create function public.get_my_pages()
returns table (
  page_id uuid,
  page_title text,
  dek text,
  body text,
  pull_quote text,
  layout text,
  page_created_at timestamptz,
  chapter_title text,
  chapter_position integer,
  volume_title text,
  book_title text,
  memory_id uuid,
  raw_text text,
  transcript text,
  captured_at timestamptz,
  page_meta jsonb
)
language sql
stable
security definer
set search_path = public
as $$
  select
    p.id,
    p.title,
    p.dek,
    p.body,
    p.pull_quote,
    p.layout,
    p.created_at,
    c.title,
    c.position,
    v.title,
    b.title,
    m.id,
    m.raw_text,
    m.transcript,
    m.captured_at,
    p.meta
  from public.pages p
  join public.chapters c on c.id = p.chapter_id
  join public.volumes v on v.id = c.volume_id
  join public.books b on b.id = v.book_id
  join public.memories m on m.id = p.memory_id
  where b.owner_id = auth.uid()
    and m.owner_id = auth.uid()
  order by p.created_at desc;
$$;

revoke all on function public.get_my_pages() from public;
grant execute on function public.get_my_pages() to authenticated;
