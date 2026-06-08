-- v5.x — Dot-voting on mind-map nodes.
-- Depends on:
--   public.mindmaps      (0001_init.sql)
--   public.collaborators (0001_init.sql)
--
-- One row = one user's vote on one node. The tally for a node is the row
-- count; "voted by me" is whether my row exists. Toggling a vote is an
-- insert (vote) or delete (un-vote). Realtime is enabled at the bottom so
-- collaborators see tallies update live, mirroring the comments table.

create table if not exists public.node_votes (
  id uuid primary key default gen_random_uuid(),
  mindmap_id uuid not null references public.mindmaps on delete cascade,
  node_id text not null,
  user_id uuid not null references auth.users on delete cascade,
  created_at timestamptz default now(),
  unique (mindmap_id, node_id, user_id)
);

create index if not exists node_votes_mindmap_idx on public.node_votes (mindmap_id);
create index if not exists node_votes_node_idx on public.node_votes (mindmap_id, node_id);

alter table public.node_votes enable row level security;

-- READ: anyone who can read the parent mindmap can read its votes.
drop policy if exists "node_votes_read" on public.node_votes;
create policy "node_votes_read" on public.node_votes for select using (
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

-- INSERT: owner or any collaborator may add their own vote (and only their own).
drop policy if exists "node_votes_insert" on public.node_votes;
create policy "node_votes_insert" on public.node_votes for insert with check (
  user_id = auth.uid()
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

-- DELETE: a user can remove their own vote; the map owner can clear any.
drop policy if exists "node_votes_delete" on public.node_votes;
create policy "node_votes_delete" on public.node_votes for delete using (
  user_id = auth.uid()
  or exists (
    select 1 from public.mindmaps m
    where m.id = mindmap_id and m.owner_id = auth.uid()
  )
);

-- Enable Realtime (idempotent — guarded so re-running the migration is safe).
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'node_votes'
  ) then
    alter publication supabase_realtime add table public.node_votes;
  end if;
end $$;
