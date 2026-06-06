-- Version history (Wave 2). Point-in-time snapshots of a mind map's `data`
-- jsonb so users can browse and restore previous states.
--
-- NOT YET WIRED to the app at the time of writing — this migration is safe to
-- apply ahead of the feature code. Once applied, the version-history API
-- routes + UI can be enabled (they degrade gracefully while the table is
-- absent). See docs / the night-run summary for the rollout note.

create table if not exists public.map_versions (
  id uuid primary key default gen_random_uuid(),
  mindmap_id uuid not null references public.mindmaps(id) on delete cascade,
  created_by uuid references auth.users(id) on delete set null,
  -- Full snapshot of mindmaps.data at capture time:
  -- { nodes, childIndex, rootId }.
  data jsonb not null,
  -- Optional human label ("before AI plan", "auto", a manual name).
  label text,
  -- 'manual' | 'auto' | 'pre-restore' — lets us prune autos differently later.
  kind text not null default 'manual',
  created_at timestamptz not null default now()
);

create index if not exists idx_map_versions_map_created
  on public.map_versions(mindmap_id, created_at desc);

alter table public.map_versions enable row level security;

-- Owner of the parent map can read/insert/delete its versions. This is a
-- one-directional reference (map_versions -> mindmaps), so there's no circular
-- RLS like the collaborators table had to avoid. Server routes may also use
-- the service role, which bypasses RLS.
drop policy if exists map_versions_owner_select on public.map_versions;
create policy map_versions_owner_select on public.map_versions
  for select using (
    mindmap_id in (select id from public.mindmaps where owner_id = auth.uid())
  );

drop policy if exists map_versions_owner_insert on public.map_versions;
create policy map_versions_owner_insert on public.map_versions
  for insert with check (
    mindmap_id in (select id from public.mindmaps where owner_id = auth.uid())
  );

drop policy if exists map_versions_owner_delete on public.map_versions;
create policy map_versions_owner_delete on public.map_versions
  for delete using (
    mindmap_id in (select id from public.mindmaps where owner_id = auth.uid())
  );

comment on table public.map_versions is
  'Wave 2 version history — snapshots of mindmaps.data. Owner-scoped RLS; server may write via service role.';
