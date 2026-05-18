-- Founder Access flag for beta users
-- Default true during beta; flip the default to false when paid tiers launch
-- (will be handled by a follow-up migration in Phase 2).
alter table public.profiles
  add column if not exists is_founder boolean not null default true;

-- Defensive backfill in case any row somehow has NULL (shouldn't with NOT NULL DEFAULT)
update public.profiles set is_founder = true where is_founder is null;

-- Index for the queries that will gate Premium pricing on this flag
create index if not exists idx_profiles_is_founder
  on public.profiles(is_founder)
  where is_founder = true;

-- Helpful comment for future-you
comment on column public.profiles.is_founder is
  'Beta-era signups get Founder Access — permanent discount on Premium ($1.99/mo vs $3.99/mo) plus a more generous free tier (8 maps / 150 nodes / 40 voice mins vs 5 / 100 / 20). Default true during beta; flipped to false when paid tiers launch.';
