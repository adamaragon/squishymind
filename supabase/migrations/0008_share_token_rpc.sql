-- 0008_share_token_rpc.sql
-- Restores intended share-link behaviour for PRIVATE maps. Previously the
-- /share/[token] route did a direct SELECT against mindmaps which RLS
-- blocks unless visibility is 'public' or 'unlisted'. Result: private map
-- + share link = silent 404, even though the token is supposed to be the
-- access gate.
--
-- This RPC runs as security definer (i.e. owns RLS via the function
-- definer), but is TIGHTLY scoped: a single SELECT keyed on exact token
-- match, no string interpolation, no extra columns beyond what the share
-- page actually needs. Returning zero rows for a wrong/missing token is
-- indistinguishable from "no such map" so attackers can't enumerate.
--
-- The function is granted to anon + authenticated because share links
-- work for signed-out viewers.

create or replace function public.get_mindmap_by_share_token(token text)
returns table (
  id uuid,
  owner_id uuid,
  title text,
  data jsonb,
  visibility text,
  share_token text,
  slug text,
  created_at timestamptz,
  updated_at timestamptz
)
language sql
security definer
stable
set search_path = public
as $$
  select
    id, owner_id, title, data, visibility, share_token, slug,
    created_at, updated_at
  from public.mindmaps
  where share_token = token
  limit 1;
$$;

revoke all on function public.get_mindmap_by_share_token(text) from public;
grant execute on function public.get_mindmap_by_share_token(text)
  to anon, authenticated;

comment on function public.get_mindmap_by_share_token(text) is
  'Resolve a hex share_token to its mindmap, regardless of visibility. '
  'The token IS the access gate — only callers who hold the token can '
  'discover its mindmap. Used by /share/[token].';
