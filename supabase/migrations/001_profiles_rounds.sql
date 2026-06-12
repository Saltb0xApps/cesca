-- Phase 1 — profiles + rounds (CLAUDE.md "DB migration 001")

create table if not exists profiles (
  id uuid primary key references auth.users on delete cascade,
  display_name text not null,
  avatar text,
  exam_tag text,
  timezone text not null default 'UTC',
  streak_count int not null default 0,
  streak_freezes int not null default 0,
  last_pomo_date date,
  created_at timestamptz default now()
);

create table if not exists rounds (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  status text not null default 'running' check (status in ('running','completed','failed')),
  chain_index int not null default 0,        -- position within a chain
  fail_reason text,                          -- 'backgrounded' | 'abandoned' | 'timeout'
  counts_for_league boolean not null default true
);
create index if not exists rounds_user_started_idx on rounds (user_id, started_at);

-- Row Level Security ---------------------------------------------------------
alter table profiles enable row level security;
alter table rounds enable row level security;

-- Profiles: a user can read & write only their own row.
create policy "profiles_select_own" on profiles
  for select using (auth.uid() = id);
create policy "profiles_upsert_own" on profiles
  for insert with check (auth.uid() = id);
create policy "profiles_update_own" on profiles
  for update using (auth.uid() = id);

-- Rounds: a user can read & insert their own rounds. Status transitions to
-- 'completed' are owned by the complete-round edge function (service role),
-- so clients may only flip a running round to 'failed' (anti-cheat: you can
-- only ever hurt your own score, never inflate it).
create policy "rounds_select_own" on rounds
  for select using (auth.uid() = user_id);
create policy "rounds_insert_own" on rounds
  for insert with check (auth.uid() = user_id);
create policy "rounds_fail_own" on rounds
  for update using (auth.uid() = user_id)
  with check (auth.uid() = user_id and status = 'failed');

-- start_round RPC: server-stamped start time (clients never report duration).
create or replace function start_round(p_chain_index int default 0)
returns rounds
language plpgsql
security definer
set search_path = public
as $$
declare
  new_round rounds;
begin
  insert into rounds (user_id, chain_index)
  values (auth.uid(), p_chain_index)
  returning * into new_round;
  return new_round;
end;
$$;
