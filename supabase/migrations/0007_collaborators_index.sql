-- 0007_collaborators_index.sql
-- The collaborators table already has an index on (user_id) but RLS
-- subselects on mindmaps_read filter by mindmap_id, and the
-- /api/mindmaps/[id]/members endpoint does the same. Without an index
-- on mindmap_id those become seq scans as collaborator counts grow.

create index if not exists collab_mindmap_idx
  on public.collaborators (mindmap_id);
