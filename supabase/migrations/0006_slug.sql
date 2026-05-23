-- 0006_slug.sql
-- Adds the slug column that the code has been relying on (was previously
-- added via the Supabase dashboard so fresh clones couldn't rebuild the
-- schema from migrations alone). Unique constraint implicitly creates the
-- index slug lookups need.

alter table public.mindmaps
  add column if not exists slug text;

create unique index if not exists mindmaps_slug_idx
  on public.mindmaps (slug)
  where slug is not null;
