-- Ariadne — initial schema
-- Run with: supabase db push   (or paste in the SQL editor of your Supabase project)
--
-- Tables:
--   waitlist           — public sign-ups from index.html
--   brand_maps         — the user's full state.answers blob (one row per user)
--   checkins           — each weekly reflection (mirrors what's in localStorage)
--   platform_logs      — manually-entered per-platform numbers (followers, posts)
--   platform_snapshots — auto-pulled stats from connected APIs (YouTube etc.)
--   oauth_tokens       — encrypted-at-rest token storage for connected accounts
--
-- RLS is enabled on every user-owned table so a stolen anon key can't read
-- another user's data.

-- enable extensions used below
create extension if not exists "uuid-ossp";

-- ---------- waitlist (public, no auth) ----------
create table if not exists public.waitlist (
  id          uuid primary key default uuid_generate_v4(),
  name        text,
  email       text not null,
  doing       text,
  created_at  timestamptz not null default now(),
  unique (email)
);
alter table public.waitlist enable row level security;

-- Anyone can insert their own signup; nobody can read or modify.
drop policy if exists "waitlist_insert" on public.waitlist;
create policy "waitlist_insert" on public.waitlist
  for insert to anon, authenticated
  with check (true);

-- ---------- brand_maps ----------
create table if not exists public.brand_maps (
  user_id        uuid primary key references auth.users(id) on delete cascade,
  answers        jsonb not null default '{}'::jsonb,
  checkins       jsonb not null default '[]'::jsonb,
  platform_logs  jsonb not null default '[]'::jsonb,
  updated_at     timestamptz not null default now()
);
alter table public.brand_maps enable row level security;

drop policy if exists "brand_maps_owner" on public.brand_maps;
create policy "brand_maps_owner" on public.brand_maps
  for all to authenticated
  using  (user_id = auth.uid())
  with check (user_id = auth.uid());

-- ---------- platform_snapshots (auto-pulled from APIs) ----------
create table if not exists public.platform_snapshots (
  id          uuid primary key default uuid_generate_v4(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  platform    text not null,                    -- 'youtube' | 'instagram' | ...
  at          timestamptz not null default now(),
  followers   integer,
  views       bigint,
  posts       integer,
  source      text not null default 'manual',   -- 'manual' | 'youtube_api' | ...
  raw         jsonb
);
create index if not exists platform_snapshots_user_at on public.platform_snapshots(user_id, at desc);
alter table public.platform_snapshots enable row level security;

drop policy if exists "snapshots_owner" on public.platform_snapshots;
create policy "snapshots_owner" on public.platform_snapshots
  for all to authenticated
  using  (user_id = auth.uid())
  with check (user_id = auth.uid());

-- ---------- oauth_tokens ----------
-- access/refresh tokens for connected platforms. Encrypted-at-rest by Supabase.
create table if not exists public.oauth_tokens (
  user_id       uuid not null references auth.users(id) on delete cascade,
  platform      text not null,
  access_token  text not null,
  refresh_token text,
  expires_at    timestamptz,
  scopes        text,
  meta          jsonb default '{}'::jsonb,
  primary key (user_id, platform)
);
alter table public.oauth_tokens enable row level security;

drop policy if exists "tokens_owner" on public.oauth_tokens;
create policy "tokens_owner" on public.oauth_tokens
  for all to authenticated
  using  (user_id = auth.uid())
  with check (user_id = auth.uid());

-- ---------- web push subscriptions ----------
create table if not exists public.push_subscriptions (
  id          uuid primary key default uuid_generate_v4(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  endpoint    text not null,
  p256dh      text not null,
  auth        text not null,
  created_at  timestamptz not null default now(),
  unique (endpoint)
);
alter table public.push_subscriptions enable row level security;

drop policy if exists "push_owner" on public.push_subscriptions;
create policy "push_owner" on public.push_subscriptions
  for all to authenticated
  using  (user_id = auth.uid())
  with check (user_id = auth.uid());
