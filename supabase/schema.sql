-- Bloom database schema
-- Paste this whole file into the Supabase SQL Editor (see README.md) and click "Run".
-- It is safe to run more than once.

create extension if not exists "pgcrypto";

-- ---------- books ----------
create table if not exists public.books (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade default auth.uid(),
  title text not null,
  description text default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------- chapters ----------
create table if not exists public.chapters (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade default auth.uid(),
  book_id uuid not null references public.books (id) on delete cascade,
  title text not null default 'Untitled chapter',
  body text not null default '',
  order_index integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists chapters_book_id_idx on public.chapters (book_id);
create index if not exists chapters_user_id_idx on public.chapters (user_id);

-- ---------- tags ----------
create table if not exists public.tags (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade default auth.uid(),
  name text not null,
  created_at timestamptz not null default now(),
  unique (user_id, name)
);

-- ---------- chapter_tags (many-to-many) ----------
create table if not exists public.chapter_tags (
  chapter_id uuid not null references public.chapters (id) on delete cascade,
  tag_id uuid not null references public.tags (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade default auth.uid(),
  primary key (chapter_id, tag_id)
);

create index if not exists chapter_tags_tag_id_idx on public.chapter_tags (tag_id);

-- ---------- chapter_versions (version history) ----------
create table if not exists public.chapter_versions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade default auth.uid(),
  chapter_id uuid not null references public.chapters (id) on delete cascade,
  title text not null default '',
  body text not null default '',
  created_at timestamptz not null default now()
);

create index if not exists chapter_versions_chapter_id_idx on public.chapter_versions (chapter_id, created_at desc);

-- ---------- backup_log (Google Drive backup history) ----------
create table if not exists public.backup_log (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade default auth.uid(),
  created_at timestamptz not null default now(),
  status text not null default 'success',
  note text default ''
);

-- ---------- keep updated_at fresh ----------
create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists set_updated_at on public.books;
create trigger set_updated_at before update on public.books
  for each row execute function public.set_updated_at();

drop trigger if exists set_updated_at on public.chapters;
create trigger set_updated_at before update on public.chapters
  for each row execute function public.set_updated_at();

-- ---------- Row Level Security: every table is private to its owner ----------
alter table public.books enable row level security;
alter table public.chapters enable row level security;
alter table public.tags enable row level security;
alter table public.chapter_tags enable row level security;
alter table public.chapter_versions enable row level security;
alter table public.backup_log enable row level security;

drop policy if exists "own rows only" on public.books;
create policy "own rows only" on public.books
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "own rows only" on public.chapters;
create policy "own rows only" on public.chapters
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "own rows only" on public.tags;
create policy "own rows only" on public.tags
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "own rows only" on public.chapter_tags;
create policy "own rows only" on public.chapter_tags
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "own rows only" on public.chapter_versions;
create policy "own rows only" on public.chapter_versions
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "own rows only" on public.backup_log;
create policy "own rows only" on public.backup_log
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
