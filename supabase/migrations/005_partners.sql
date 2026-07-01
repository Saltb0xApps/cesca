-- 005 — accountability partners. Pair with one person via an invite code; if
-- either misses their daily goal, the shared "team streak" resets (you both lose).

alter table profiles add column if not exists daily_goal int not null default 8;

create table if not exists partnerships (
  id uuid primary key default gen_random_uuid(),
  user_a uuid not null references profiles(id) on delete cascade,
  user_b uuid references profiles(id) on delete cascade,  -- null while the invite is pending
  invite_code text unique,                                -- set while pending, cleared on accept
  active boolean not null default false,
  team_streak int not null default 0,
  last_settled_date date,
  created_at timestamptz default now()
);

-- All access is through the security-definer RPCs below; block direct table reads.
alter table partnerships enable row level security;

-- Push the daily goal to the server (partner evaluation reads it).
create or replace function set_daily_goal(g int)
returns void language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'not authenticated'; end if;
  update profiles set daily_goal = greatest(1, least(16, g)) where id = auth.uid();
end; $$;

-- Create (or reuse) a pending invite code.
create or replace function create_partner_invite()
returns text language plpgsql security definer set search_path = public as $$
declare
  v_user uuid := auth.uid();
  v_existing text;
  v_code text;
begin
  if v_user is null then raise exception 'not authenticated'; end if;
  if exists (select 1 from partnerships where active and (user_a = v_user or user_b = v_user)) then
    raise exception 'already partnered';
  end if;
  select invite_code into v_existing from partnerships
    where user_a = v_user and not active and user_b is null and invite_code is not null limit 1;
  if v_existing is not null then return v_existing; end if;
  v_code := upper(substr(md5(random()::text), 1, 6));
  insert into partnerships (user_a, invite_code, active) values (v_user, v_code, false);
  return v_code;
end; $$;

-- Accept someone else's code → the two become active partners.
create or replace function accept_partner_invite(code text)
returns void language plpgsql security definer set search_path = public as $$
declare
  v_user uuid := auth.uid();
  v_pid uuid;
  v_inviter uuid;
begin
  if v_user is null then raise exception 'not authenticated'; end if;
  if exists (select 1 from partnerships where active and (user_a = v_user or user_b = v_user)) then
    raise exception 'already partnered';
  end if;
  select id, user_a into v_pid, v_inviter from partnerships
    where invite_code = upper(code) and not active and user_b is null limit 1;
  if v_pid is null then raise exception 'invalid code'; end if;
  if v_inviter = v_user then raise exception 'cannot partner with yourself'; end if;
  update partnerships
    set user_b = v_user, active = true, invite_code = null,
        last_settled_date = (now() at time zone 'UTC')::date
    where id = v_pid;
end; $$;

-- Snapshot for the Partner screen.
create or replace function partner_summary()
returns table(active boolean, invite_code text, partner_name text, partner_avatar text,
              partner_today int, partner_goal int, you_today int, you_goal int, team_streak int)
language plpgsql security definer set search_path = public as $$
declare
  v_user uuid := auth.uid();
  v_today date := (now() at time zone 'UTC')::date;
  p partnerships;
  v_partner uuid;
begin
  if v_user is null then raise exception 'not authenticated'; end if;
  select * into p from partnerships where active and (user_a = v_user or user_b = v_user) limit 1;
  if found then
    v_partner := case when p.user_a = v_user then p.user_b else p.user_a end;
    return query
      select true, null::text, pr.display_name, pr.avatar,
        (select count(*)::int from rounds where user_id = v_partner and status = 'completed'
           and (completed_at at time zone 'UTC')::date = v_today),
        pr.daily_goal,
        (select count(*)::int from rounds where user_id = v_user and status = 'completed'
           and (completed_at at time zone 'UTC')::date = v_today),
        (select daily_goal from profiles where id = v_user),
        p.team_streak
      from profiles pr where pr.id = v_partner;
    return;
  end if;
  return query
    select false,
      (select invite_code from partnerships where user_a = v_user and not active and user_b is null
         and invite_code is not null limit 1),
      null::text, null::text, null::int, null::int,
      (select count(*)::int from rounds where user_id = v_user and status = 'completed'
         and (completed_at at time zone 'UTC')::date = v_today),
      (select daily_goal from profiles where id = v_user),
      0;
end; $$;

-- Lazily settle each finished day: both hit goal → team streak +1, else reset (mutual loss).
-- Idempotent via last_settled_date. (A cron for reliable end-of-day eval is a follow-up.)
create or replace function settle_partner_days()
returns table(lost boolean, team_streak int)
language plpgsql security definer set search_path = public as $$
declare
  v_user uuid := auth.uid();
  v_yesterday date := ((now() at time zone 'UTC')::date - 1);
  p partnerships;
  a uuid; b uuid; a_goal int; b_goal int;
  cur date; both boolean; v_lost boolean := false; v_streak int;
begin
  if v_user is null then raise exception 'not authenticated'; end if;
  select * into p from partnerships where active and (user_a = v_user or user_b = v_user) limit 1;
  if not found then return query select false, 0; return; end if;

  a := p.user_a; b := p.user_b; v_streak := p.team_streak;
  select daily_goal into a_goal from profiles where id = a;
  select daily_goal into b_goal from profiles where id = b;

  if p.last_settled_date is null then
    update partnerships set last_settled_date = v_yesterday where id = p.id;
    return query select false, v_streak; return;
  end if;

  cur := p.last_settled_date + 1;
  while cur <= v_yesterday loop
    both := (select count(*) from rounds where user_id = a and status = 'completed'
               and (completed_at at time zone 'UTC')::date = cur) >= a_goal
        and (select count(*) from rounds where user_id = b and status = 'completed'
               and (completed_at at time zone 'UTC')::date = cur) >= b_goal;
    if both then v_streak := v_streak + 1;
    else v_streak := 0; v_lost := true;
    end if;
    cur := cur + 1;
  end loop;

  update partnerships set team_streak = v_streak, last_settled_date = v_yesterday where id = p.id;
  return query select v_lost, v_streak;
end; $$;

grant execute on function set_daily_goal(int) to authenticated;
grant execute on function create_partner_invite() to authenticated;
grant execute on function accept_partner_invite(text) to authenticated;
grant execute on function partner_summary() to authenticated;
grant execute on function settle_partner_days() to authenticated;
