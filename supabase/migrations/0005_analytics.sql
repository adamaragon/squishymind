-- Lightweight events table for beta analytics.
-- Insert-only by writers; admin-only reads. Service role bypasses RLS for
-- both, which is what every writer + the admin overview uses.

create table if not exists public.analytics_events (
  id uuid primary key default gen_random_uuid(),
  -- Nullable so we can also log anonymous events (e.g. visited /pricing
  -- without being signed in) keyed by anon_id from a localStorage cookie.
  user_id uuid references auth.users(id) on delete set null,
  anon_id text,
  event_name text not null,
  -- Free-form payload — view changed, template id applied, ai_expand
  -- count, etc. Keep it small (under 4KB) per row.
  properties jsonb not null default '{}'::jsonb,
  -- Page that fired the event, for funnel analysis without IP tracking.
  path text,
  created_at timestamptz not null default now()
);

-- Indexes for the queries the admin overview and Activity page run.
create index if not exists idx_analytics_events_created_at
  on public.analytics_events(created_at desc);
create index if not exists idx_analytics_events_name_created_at
  on public.analytics_events(event_name, created_at desc);
create index if not exists idx_analytics_events_user_id
  on public.analytics_events(user_id)
  where user_id is not null;

-- RLS: deny by default. Writers use the service role (server-side
-- helpers, /api/track after auth check); admins read via service role too,
-- so no positive policies needed.
alter table public.analytics_events enable row level security;

comment on table public.analytics_events is
  'Beta-era event log. Written by lib/analytics.ts (server) and /api/track (client). Read only by admin views via service role.';
