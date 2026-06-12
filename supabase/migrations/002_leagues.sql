-- Phase 3 — leagues (CLAUDE.md "DB migration 002")

create table if not exists leagues (
  id uuid primary key default gen_random_uuid(),
  tier int not null default 1,              -- 1=Bronze ... 5=Tomato
  week_start date not null,
  anchor_tz text not null default 'UTC'
);

create table if not exists league_members (
  league_id uuid references leagues(id) on delete cascade,
  user_id uuid references profiles(id) on delete cascade,
  pomos int not null default 0,             -- denormalized weekly score, maintained by complete-round fn
  primary key (league_id, user_id)
);

create table if not exists league_results (  -- written by rollover, powers results screen
  league_id uuid,
  user_id uuid,
  week_start date,
  final_rank int,
  pomos int,
  movement text check (movement in ('promoted','stayed','relegated')),
  primary key (league_id, user_id, week_start)
);

-- RLS: members may read standings of leagues they belong to, but never write
-- scores (edge functions own all scoring mutations).
alter table leagues enable row level security;
alter table league_members enable row level security;
alter table league_results enable row level security;

create policy "leagues_select_member" on leagues
  for select using (
    exists (
      select 1 from league_members m
      where m.league_id = leagues.id and m.user_id = auth.uid()
    )
  );

create policy "league_members_select_same_league" on league_members
  for select using (
    exists (
      select 1 from league_members me
      where me.league_id = league_members.league_id and me.user_id = auth.uid()
    )
  );

create policy "league_results_select_own" on league_results
  for select using (auth.uid() = user_id);
