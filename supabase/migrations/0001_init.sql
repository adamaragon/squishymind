-- SquishyMind initial schema
-- Run this in: Supabase dashboard → SQL editor → New query → paste → Run.

-- ---------------------------------------------------------------
-- Profiles (one row per auth user, mirrors auth.users)
-- ---------------------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users on delete cascade,
  email text,
  display_name text,
  avatar_url text,
  created_at timestamptz default now()
);

-- Auto-create a profile row on signup.
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email)
  values (new.id, new.email)
  on conflict (id) do nothing;
  return new;
end; $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------
-- Mindmaps
-- ---------------------------------------------------------------
create table if not exists public.mindmaps (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users on delete cascade,
  title text not null default 'Untitled mind map',
  data jsonb not null default '{"nodes":{},"childIndex":{},"rootId":null}'::jsonb,
  visibility text not null default 'private'
    check (visibility in ('private', 'unlisted', 'public')),
  share_token text unique not null default encode(gen_random_bytes(16), 'hex'),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists mindmaps_owner_idx on public.mindmaps (owner_id);
create index if not exists mindmaps_share_token_idx on public.mindmaps (share_token);

-- Update updated_at automatically.
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end; $$;

drop trigger if exists mindmaps_touch on public.mindmaps;
create trigger mindmaps_touch
  before update on public.mindmaps
  for each row execute function public.touch_updated_at();

-- ---------------------------------------------------------------
-- Collaborators (signed-in users with edit or comment access)
-- ---------------------------------------------------------------
create table if not exists public.collaborators (
  mindmap_id uuid not null references public.mindmaps on delete cascade,
  user_id uuid not null references auth.users on delete cascade,
  role text not null default 'editor' check (role in ('editor', 'commenter')),
  invited_at timestamptz default now(),
  primary key (mindmap_id, user_id)
);

create index if not exists collab_user_idx on public.collaborators (user_id);

-- ---------------------------------------------------------------
-- Row-level security
-- ---------------------------------------------------------------
alter table public.profiles enable row level security;
alter table public.mindmaps enable row level security;
alter table public.collaborators enable row level security;

-- Profiles: anyone can read, only self can write.
drop policy if exists "profiles_read" on public.profiles;
create policy "profiles_read" on public.profiles for select using (true);
drop policy if exists "profiles_write_self" on public.profiles;
create policy "profiles_write_self" on public.profiles for all
  using (auth.uid() = id) with check (auth.uid() = id);

-- Mindmaps: read if public/unlisted OR owner OR collaborator.
drop policy if exists "mindmaps_read" on public.mindmaps;
create policy "mindmaps_read" on public.mindmaps for select using (
  visibility in ('public', 'unlisted')
  or auth.uid() = owner_id
  or exists (
    select 1 from public.collaborators c
    where c.mindmap_id = id and c.user_id = auth.uid()
  )
);

drop policy if exists "mindmaps_insert_self" on public.mindmaps;
create policy "mindmaps_insert_self" on public.mindmaps for insert
  with check (auth.uid() = owner_id);

drop policy if exists "mindmaps_update" on public.mindmaps;
create policy "mindmaps_update" on public.mindmaps for update using (
  auth.uid() = owner_id
  or exists (
    select 1 from public.collaborators c
    where c.mindmap_id = id and c.user_id = auth.uid() and c.role = 'editor'
  )
);

drop policy if exists "mindmaps_delete_owner" on public.mindmaps;
create policy "mindmaps_delete_owner" on public.mindmaps for delete
  using (auth.uid() = owner_id);

-- Collaborators: owner manages, members can see their own row.
drop policy if exists "collab_read" on public.collaborators;
create policy "collab_read" on public.collaborators for select using (
  auth.uid() = user_id
);

drop policy if exists "collab_owner_write" on public.collaborators;
create policy "collab_owner_write" on public.collaborators for all using (
  exists (select 1 from public.mindmaps m where m.id = mindmap_id and m.owner_id = auth.uid())
) with check (
  exists (select 1 from public.mindmaps m where m.id = mindmap_id and m.owner_id = auth.uid())
);
