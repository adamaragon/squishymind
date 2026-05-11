-- v3.0 — Threaded comments on mind-map nodes.
-- Depends on:
--   public.mindmaps        (0001_init.sql)
--   public.collaborators   (0001_init.sql)
--   public.touch_updated_at() trigger fn (0001_init.sql)
--
-- After running this, enable Realtime on the comments table in
-- Supabase → Database → Replication.

create table if not exists public.comments (
  id uuid primary key default gen_random_uuid(),
  mindmap_id uuid not null references public.mindmaps on delete cascade,
  node_id text not null,
  parent_comment_id uuid references public.comments on delete cascade,
  author_id uuid not null references auth.users on delete cascade,
  body text not null check (length(body) > 0 and length(body) <= 4000),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists comments_mindmap_idx on public.comments (mindmap_id);
create index if not exists comments_node_idx on public.comments (mindmap_id, node_id);

drop trigger if exists comments_touch on public.comments;
create trigger comments_touch
  before update on public.comments
  for each row execute function public.touch_updated_at();

alter table public.comments enable row level security;

-- READ: anyone who can read the parent mindmap can read its comments.
drop policy if exists "comments_read" on public.comments;
create policy "comments_read" on public.comments for select using (
  exists (
    select 1 from public.mindmaps m where m.id = mindmap_id and (
      m.visibility in ('public', 'unlisted')
      or m.owner_id = auth.uid()
      or exists (
        select 1 from public.collaborators c
        where c.mindmap_id = m.id and c.user_id = auth.uid()
      )
    )
  )
);

-- INSERT: owner or any collaborator (editor or commenter) can add a comment.
drop policy if exists "comments_insert" on public.comments;
create policy "comments_insert" on public.comments for insert with check (
  author_id = auth.uid()
  and exists (
    select 1 from public.mindmaps m where m.id = mindmap_id and (
      m.owner_id = auth.uid()
      or exists (
        select 1 from public.collaborators c
        where c.mindmap_id = m.id and c.user_id = auth.uid()
      )
    )
  )
);

-- UPDATE: only the author can edit their own comment.
drop policy if exists "comments_update_self" on public.comments;
create policy "comments_update_self" on public.comments for update using (
  author_id = auth.uid()
);

-- DELETE: author OR the map owner (so spam can be removed by the owner).
drop policy if exists "comments_delete" on public.comments;
create policy "comments_delete" on public.comments for delete using (
  author_id = auth.uid()
  or exists (
    select 1 from public.mindmaps m
    where m.id = mindmap_id and m.owner_id = auth.uid()
  )
);
