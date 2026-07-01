-- 006 — phone penalty. Leaving the app during a round wipes today's tomatoes
-- and breaks the streak, server-side.

create or replace function apply_penalty()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_today date := (now() at time zone 'UTC')::date;
  v_week date := (date_trunc('week', now() at time zone 'UTC'))::date;
  v_lost int;
begin
  if v_user is null then
    raise exception 'not authenticated';
  end if;

  -- how many of today's completed pomos counted for the league
  select count(*) into v_lost
  from rounds
  where user_id = v_user and status = 'completed' and counts_for_league = true
    and (completed_at at time zone 'UTC')::date = v_today;

  -- delete today's completed rounds
  delete from rounds
  where user_id = v_user and status = 'completed'
    and (completed_at at time zone 'UTC')::date = v_today;

  -- roll back this week's league score for those pomos
  if v_lost > 0 then
    update league_members m
    set pomos = greatest(0, m.pomos - v_lost)
    from leagues l
    where m.league_id = l.id and l.week_start = v_week and m.user_id = v_user;
  end if;

  -- break the streak
  update profiles set streak_count = 0, streak_freezes = 0, last_pomo_date = null
  where id = v_user;
end;
$$;

grant execute on function apply_penalty() to authenticated;
