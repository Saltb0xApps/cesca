-- Circle of Pomodoros — Supabase migration 001
-- Run this in the Supabase SQL Editor (Project → SQL Editor → New query → paste → Run)
-- ============================================================

-- ─── Tables ──────────────────────────────────────────────────

create table if not exists profiles (
  id            uuid primary key references auth.users on delete cascade,
  display_name  text    not null default '',
  avatar        text    not null default '🍅',
  exam_tag      text,
  timezone      text    not null default 'UTC',
  streak_count  int     not null default 0,
  streak_freezes int    not null default 0,
  last_pomo_date date,
  daily_goal    int     not null default 8,
  created_at    timestamptz not null default now()
);

create table if not exists rounds (
  id              uuid        primary key default gen_random_uuid(),
  user_id         uuid        not null references profiles(id) on delete cascade,
  started_at      timestamptz not null default now(),
  completed_at    timestamptz,
  status          text        not null default 'running'
                              check (status in ('running','completed','failed')),
  chain_index     int         not null default 0,
  fail_reason     text,
  counts_for_league boolean   not null default true,
  task            text
);
create index if not exists rounds_user_started on rounds (user_id, started_at);

create table if not exists leagues (
  id         uuid primary key default gen_random_uuid(),
  tier       int  not null default 1,
  week_start date not null,
  anchor_tz  text not null default 'UTC'
);

create table if not exists league_members (
  league_id uuid references leagues(id) on delete cascade,
  user_id   uuid references profiles(id) on delete cascade,
  pomos     int  not null default 0,
  primary key (league_id, user_id)
);

create table if not exists partner_pairs (
  id               uuid primary key default gen_random_uuid(),
  user_a           uuid references profiles(id) on delete cascade,
  user_b           uuid references profiles(id) on delete cascade,
  invite_code      text unique,
  active           boolean not null default false,
  team_streak      int     not null default 0,
  last_settled_date date,
  created_at       timestamptz not null default now()
);

-- ─── Row Level Security ───────────────────────────────────────

alter table profiles       enable row level security;
alter table rounds         enable row level security;
alter table leagues        enable row level security;
alter table league_members enable row level security;
alter table partner_pairs  enable row level security;

-- profiles: own row only
create policy "profiles_select_own" on profiles for select using (auth.uid() = id);
create policy "profiles_insert_own" on profiles for insert with check (auth.uid() = id);
create policy "profiles_update_own" on profiles for update using (auth.uid() = id);

-- rounds: read own; all writes go through RPCs (SECURITY DEFINER)
create policy "rounds_select_own"   on rounds for select using (auth.uid() = user_id);
create policy "rounds_no_direct_insert" on rounds for insert with check (false);
create policy "rounds_no_direct_update" on rounds for update using (false);

-- leagues: readable by everyone (just metadata)
create policy "leagues_readable" on leagues for select using (true);

-- league_members: readable within the same league
create policy "league_members_readable" on league_members for select
  using (exists (
    select 1 from league_members lm2
    where lm2.league_id = league_id and lm2.user_id = auth.uid()
  ));

-- partner_pairs: visible to both members
create policy "partner_pairs_visible" on partner_pairs for select
  using (auth.uid() = user_a or auth.uid() = user_b);

-- ─── RPC: bank_pomo ──────────────────────────────────────────
-- Called by the app when a 25-min round completes.
-- Inserts a completed round, updates streak, assigns/increments league.

create or replace function bank_pomo(p_task text default null, p_chain_index int default 0)
returns void language plpgsql security definer as $$
declare
  v_uid            uuid := auth.uid();
  v_tz             text;
  v_today          date;
  v_today_count    int;
  v_counts         boolean;
  v_last_date      date;
  v_streak         int;
  v_freezes        int;
  v_league_id      uuid;
  v_week_start     date;
begin
  select timezone into v_tz from profiles where id = v_uid;
  v_today      := (now() at time zone coalesce(v_tz, 'UTC'))::date;
  v_week_start := date_trunc('week', v_today)::date; -- Monday

  -- How many completed pomos today (before this one)?
  select count(*) into v_today_count
  from rounds
  where user_id = v_uid
    and status = 'completed'
    and (completed_at at time zone coalesce(v_tz, 'UTC'))::date = v_today;

  v_counts := v_today_count < 16; -- daily league cap

  -- Insert round
  insert into rounds (user_id, started_at, completed_at, status, chain_index, task, counts_for_league)
  values (v_uid, now() - interval '25 minutes', now(), 'completed', p_chain_index, p_task, v_counts);

  -- ── Streak update ──
  select last_pomo_date, streak_count, streak_freezes
  into v_last_date, v_streak, v_freezes
  from profiles where id = v_uid;

  if v_last_date is null then
    update profiles set streak_count = 1, last_pomo_date = v_today where id = v_uid;
  elsif v_last_date = v_today then
    null; -- already banked today, no streak change
  elsif v_last_date = v_today - 1 then
    -- consecutive day
    v_streak := v_streak + 1;
    if v_streak % 7 = 0 then
      v_freezes := least(2, v_freezes + 1);
    end if;
    update profiles
    set streak_count = v_streak, streak_freezes = v_freezes, last_pomo_date = v_today
    where id = v_uid;
  else
    -- gap: consume freeze or reset
    if v_freezes > 0 then
      v_freezes := v_freezes - 1;
      update profiles set streak_freezes = v_freezes, last_pomo_date = v_today where id = v_uid;
    else
      update profiles set streak_count = 1, streak_freezes = 0, last_pomo_date = v_today where id = v_uid;
    end if;
  end if;

  -- ── League assignment + increment ──
  if v_counts then
    -- Find existing membership this week
    select lm.league_id into v_league_id
    from league_members lm
    join leagues l on l.id = lm.league_id
    where lm.user_id = v_uid and l.week_start = v_week_start
    limit 1;

    if v_league_id is null then
      -- Join an open league (< 20 members)
      select l.id into v_league_id
      from leagues l
      where l.week_start = v_week_start
        and (select count(*) from league_members where league_id = l.id) < 20
      order by random()
      limit 1;

      -- No open league — create one
      if v_league_id is null then
        insert into leagues (tier, week_start) values (1, v_week_start)
        returning id into v_league_id;
      end if;

      insert into league_members (league_id, user_id, pomos)
      values (v_league_id, v_uid, 0)
      on conflict do nothing;
    end if;

    update league_members set pomos = pomos + 1
    where league_id = v_league_id and user_id = v_uid;
  end if;
end;
$$;

-- ─── RPC: apply_penalty ──────────────────────────────────────
-- Called when user backgrounds the app > 10s during a round.
-- Deletes today's rounds, resets streak, subtracts from league.

create or replace function apply_penalty()
returns void language plpgsql security definer as $$
declare
  v_uid             uuid := auth.uid();
  v_tz              text;
  v_today           date;
  v_today_league    int;
  v_league_id       uuid;
  v_week_start      date;
begin
  select timezone into v_tz from profiles where id = v_uid;
  v_today      := (now() at time zone coalesce(v_tz, 'UTC'))::date;
  v_week_start := date_trunc('week', v_today)::date;

  -- Count today's league-scoring pomos before deleting
  select count(*) into v_today_league
  from rounds
  where user_id = v_uid
    and status = 'completed'
    and counts_for_league = true
    and (completed_at at time zone coalesce(v_tz, 'UTC'))::date = v_today;

  -- Wipe today's rounds
  delete from rounds
  where user_id = v_uid
    and (completed_at at time zone coalesce(v_tz, 'UTC'))::date = v_today;

  -- Also wipe any running round
  delete from rounds where user_id = v_uid and status = 'running';

  -- Reset streak
  update profiles set streak_count = 0, last_pomo_date = null where id = v_uid;

  -- Subtract from league
  if v_today_league > 0 then
    select lm.league_id into v_league_id
    from league_members lm
    join leagues l on l.id = lm.league_id
    where lm.user_id = v_uid and l.week_start = v_week_start
    limit 1;

    if v_league_id is not null then
      update league_members
      set pomos = greatest(0, pomos - v_today_league)
      where league_id = v_league_id and user_id = v_uid;
    end if;
  end if;
end;
$$;

-- ─── RPC: set_daily_goal ─────────────────────────────────────

create or replace function set_daily_goal(g int)
returns void language plpgsql security definer as $$
begin
  update profiles
  set daily_goal = greatest(1, least(16, g))
  where id = auth.uid();
end;
$$;

-- ─── RPC: league_standings ───────────────────────────────────
-- Returns the caller's league this week.
-- Falls back to a global top-20 when fewer than 15 total users exist (cold start).

create or replace function league_standings()
returns table(
  user_id      uuid,
  display_name text,
  avatar       text,
  pomos        int,
  is_you       boolean
)
language plpgsql security definer as $$
declare
  v_uid        uuid := auth.uid();
  v_league_id  uuid;
  v_week_start date;
  v_total      int;
begin
  v_week_start := date_trunc('week', current_date)::date;

  select count(*) into v_total from profiles;

  select lm.league_id into v_league_id
  from league_members lm
  join leagues l on l.id = lm.league_id
  where lm.user_id = v_uid and l.week_start = v_week_start
  limit 1;

  if v_league_id is null or v_total < 15 then
    -- Cold-start: global board
    return query
      select
        p.id,
        p.display_name,
        p.avatar,
        coalesce((
          select sum(lm2.pomos)
          from league_members lm2
          join leagues l2 on l2.id = lm2.league_id
          where lm2.user_id = p.id and l2.week_start = v_week_start
        ), 0)::int,
        (p.id = v_uid)
      from profiles p
      order by 4 desc, p.created_at asc
      limit 20;
  else
    return query
      select
        p.id,
        p.display_name,
        p.avatar,
        lm.pomos,
        (p.id = v_uid)
      from league_members lm
      join profiles p on p.id = lm.user_id
      where lm.league_id = v_league_id
      order by lm.pomos desc;
  end if;
end;
$$;

-- ─── RPC: create_partner_invite ──────────────────────────────

create or replace function create_partner_invite()
returns text language plpgsql security definer as $$
declare
  v_uid  uuid := auth.uid();
  v_code text;
begin
  if exists (
    select 1 from partner_pairs
    where (user_a = v_uid or user_b = v_uid) and active = true
  ) then
    raise exception 'already_partnered';
  end if;

  -- Revoke any old pending invite
  delete from partner_pairs where user_a = v_uid and active = false;

  v_code := upper(substr(md5(random()::text || clock_timestamp()::text), 1, 6));

  insert into partner_pairs (user_a, invite_code, active)
  values (v_uid, v_code, false);

  return v_code;
end;
$$;

-- ─── RPC: accept_partner_invite ──────────────────────────────

create or replace function accept_partner_invite(code text)
returns void language plpgsql security definer as $$
declare
  v_uid     uuid := auth.uid();
  v_pair_id uuid;
  v_creator uuid;
begin
  select id, user_a into v_pair_id, v_creator
  from partner_pairs
  where invite_code = code and active = false and user_b is null;

  if v_pair_id is null then
    raise exception 'invalid_code';
  end if;
  if v_creator = v_uid then
    raise exception 'own_code';
  end if;

  update partner_pairs
  set user_b = v_uid, active = true, invite_code = null
  where id = v_pair_id;
end;
$$;

-- ─── RPC: partner_summary ────────────────────────────────────

create or replace function partner_summary()
returns table(
  active         boolean,
  invite_code    text,
  partner_name   text,
  partner_avatar text,
  partner_today  int,
  partner_goal   int,
  you_today      int,
  you_goal       int,
  team_streak    int
)
language plpgsql security definer as $$
declare
  v_uid          uuid := auth.uid();
  v_tz           text;
  v_you_goal     int;
  v_today        date;
  v_you_today    int;
  v_pair         record;
  v_partner_id   uuid;
  v_p_name       text;
  v_p_avatar     text;
  v_p_goal       int;
  v_p_today      int;
begin
  select timezone, daily_goal into v_tz, v_you_goal from profiles where id = v_uid;
  v_today := (now() at time zone coalesce(v_tz, 'UTC'))::date;

  select count(*) into v_you_today from rounds
  where user_id = v_uid and status = 'completed'
    and (completed_at at time zone coalesce(v_tz, 'UTC'))::date = v_today;

  select * into v_pair from partner_pairs
  where (user_a = v_uid or user_b = v_uid)
  order by active desc, created_at desc
  limit 1;

  if v_pair is null then
    return query select false, null::text, null::text, null::text,
                        null::int, null::int, v_you_today, v_you_goal, 0;
    return;
  end if;

  if not v_pair.active then
    return query select false, v_pair.invite_code, null::text, null::text,
                        null::int, null::int, v_you_today, v_you_goal, 0;
    return;
  end if;

  v_partner_id := case when v_pair.user_a = v_uid then v_pair.user_b else v_pair.user_a end;

  select display_name, avatar, daily_goal
  into v_p_name, v_p_avatar, v_p_goal
  from profiles where id = v_partner_id;

  select count(*) into v_p_today from rounds
  where user_id = v_partner_id and status = 'completed'
    and (completed_at at time zone coalesce(v_tz, 'UTC'))::date = v_today;

  return query select true, null::text, v_p_name, v_p_avatar,
                      v_p_today, v_p_goal, v_you_today, v_you_goal, v_pair.team_streak;
end;
$$;

-- ─── RPC: settle_partner_days ────────────────────────────────

create or replace function settle_partner_days()
returns table(lost boolean, team_streak int)
language plpgsql security definer as $$
declare
  v_uid        uuid := auth.uid();
  v_tz         text;
  v_you_goal   int;
  v_yesterday  date;
  v_pair       record;
  v_partner_id uuid;
  v_p_goal     int;
  v_you_ct     int;
  v_p_ct       int;
  v_lost       boolean;
begin
  select timezone, daily_goal into v_tz, v_you_goal from profiles where id = v_uid;
  v_yesterday := (now() at time zone coalesce(v_tz, 'UTC'))::date - 1;

  select * into v_pair from partner_pairs
  where (user_a = v_uid or user_b = v_uid) and active = true
  limit 1;

  if v_pair is null or v_pair.last_settled_date = v_yesterday then
    return query select false, coalesce(v_pair.team_streak, 0);
    return;
  end if;

  v_partner_id := case when v_pair.user_a = v_uid then v_pair.user_b else v_pair.user_a end;
  select daily_goal into v_p_goal from profiles where id = v_partner_id;

  select count(*) into v_you_ct from rounds
  where user_id = v_uid and status = 'completed'
    and (completed_at at time zone coalesce(v_tz, 'UTC'))::date = v_yesterday;

  select count(*) into v_p_ct from rounds
  where user_id = v_partner_id and status = 'completed'
    and (completed_at at time zone coalesce(v_tz, 'UTC'))::date = v_yesterday;

  v_lost := v_you_ct < v_you_goal or v_p_ct < v_p_goal;

  if v_lost then
    update partner_pairs set team_streak = 0, last_settled_date = v_yesterday where id = v_pair.id;
  else
    update partner_pairs set team_streak = team_streak + 1, last_settled_date = v_yesterday where id = v_pair.id;
  end if;

  return query
    select v_lost, (select pp.team_streak from partner_pairs pp where pp.id = v_pair.id);
end;
$$;
