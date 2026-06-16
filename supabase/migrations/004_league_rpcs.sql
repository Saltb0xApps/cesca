-- 004 — real league banking via server-owned RPCs.
--
-- Replaces the edge-function approach with security-definer functions so the
-- whole backend deploys with `supabase db push` (no Deno deploy step). Clients
-- can never write scores directly (RLS); they can only call these functions.

alter table rounds add column if not exists task text;

-- Find (or create) the caller's league for the current week. Weeks are
-- Monday-based in UTC for v1. Cohorts hold up to 20; a new one is created when
-- all current leagues for the week are full. Tier is ignored for now (1) so the
-- first users all share a board — exactly what you want at launch.
create or replace function ensure_current_league(p_user uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_week date := (date_trunc('week', now() at time zone 'UTC'))::date;
  v_league uuid;
begin
  -- already a member for this week?
  select l.id into v_league
  from leagues l
  join league_members m on m.league_id = l.id
  where l.week_start = v_week and m.user_id = p_user
  limit 1;
  if v_league is not null then
    return v_league;
  end if;

  -- an open league this week (<20 members), fullest first to pack cohorts
  select l.id into v_league
  from leagues l
  where l.week_start = v_week
    and (select count(*) from league_members m where m.league_id = l.id) < 20
  order by (select count(*) from league_members m where m.league_id = l.id) desc
  limit 1;

  if v_league is null then
    insert into leagues (tier, week_start, anchor_tz)
    values (1, v_week, 'UTC')
    returning id into v_league;
  end if;

  insert into league_members (league_id, user_id, pomos)
  values (v_league, p_user, 0)
  on conflict (league_id, user_id) do nothing;

  return v_league;
end;
$$;

-- Bank one completed pomo: record the round, update the weekly league score
-- (respecting the 16/day league cap), and advance the streak. Returns the
-- caller's new weekly total and rank.
create or replace function bank_pomo(p_task text default null, p_chain_index int default 0)
returns table (weekly_pomos int, league_rank int)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_league uuid;
  v_today date := (now() at time zone 'UTC')::date;
  v_today_count int;
  v_counts boolean := true;
  v_last date;
begin
  if v_user is null then
    raise exception 'not authenticated';
  end if;
  if not exists (select 1 from profiles where id = v_user) then
    raise exception 'no profile';
  end if;

  -- daily league cap of 16 (extra pomos still record to history)
  select count(*) into v_today_count
  from rounds
  where user_id = v_user and status = 'completed' and counts_for_league = true
    and (completed_at at time zone 'UTC')::date = v_today;
  if v_today_count >= 16 then
    v_counts := false;
  end if;

  insert into rounds (user_id, started_at, completed_at, status, chain_index, task, counts_for_league)
  values (v_user, now() - interval '25 minutes', now(), 'completed', coalesce(p_chain_index, 0), p_task, v_counts);

  v_league := ensure_current_league(v_user);

  if v_counts then
    update league_members set pomos = pomos + 1
    where league_id = v_league and user_id = v_user;
  end if;

  -- streak: advance once per local-day (UTC for v1)
  select last_pomo_date into v_last from profiles where id = v_user;
  if v_last is null or v_last < v_today then
    if v_last = v_today - 1 then
      update profiles set streak_count = streak_count + 1, last_pomo_date = v_today where id = v_user;
    else
      update profiles set streak_count = 1, last_pomo_date = v_today where id = v_user;
    end if;
    update profiles set streak_freezes = least(2, streak_count / 7) where id = v_user;
  end if;

  return query
  select m.pomos,
    (select count(*) + 1 from league_members m2 where m2.league_id = v_league and m2.pomos > m.pomos)::int
  from league_members m
  where m.league_id = v_league and m.user_id = v_user;
end;
$$;

-- Standings for the caller's current-week league, ranked.
create or replace function league_standings()
returns table (user_id uuid, display_name text, avatar text, pomos int, is_you boolean)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_league uuid;
begin
  if v_user is null then
    raise exception 'not authenticated';
  end if;
  v_league := ensure_current_league(v_user);
  return query
  select p.id, p.display_name, p.avatar, m.pomos, (p.id = v_user)
  from league_members m
  join profiles p on p.id = m.user_id
  where m.league_id = v_league
  order by m.pomos desc, p.display_name asc;
end;
$$;

grant execute on function ensure_current_league(uuid) to authenticated;
grant execute on function bank_pomo(text, int) to authenticated;
grant execute on function league_standings() to authenticated;
