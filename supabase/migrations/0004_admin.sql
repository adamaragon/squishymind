-- Admin flag on profiles. Manually flipped by SQL for owner accounts.
-- The /admin section gates every server render + mutation on this column.
alter table public.profiles
  add column if not exists is_admin boolean not null default false;

-- Partial index so the admin check (rare positive case) is cheap.
create index if not exists idx_profiles_is_admin
  on public.profiles(is_admin)
  where is_admin = true;

comment on column public.profiles.is_admin is
  'Grants /admin access. Default false; flip to true via SQL for owner accounts. Server-side check on every admin route, no client trust.';
