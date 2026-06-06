-- Scalability retrofit (forward-looking). The schema is already well-indexed;
-- this adds the one composite that maps directly to a hot query path the
-- existing single-column index doesn't fully cover.
--
-- The dashboard runs: select ... from mindmaps order by updated_at desc, which
-- RLS scopes to the current owner — i.e. "my maps, most recent first". A
-- composite on (owner_id, updated_at desc) serves both the filter and the sort
-- from one index, which matters once a user accumulates many maps.

create index if not exists idx_mindmaps_owner_updated
  on public.mindmaps(owner_id, updated_at desc);

comment on index public.idx_mindmaps_owner_updated is
  'Dashboard list: owner_id filter + updated_at desc sort in one index.';
