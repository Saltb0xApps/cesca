-- Phase 4 — synced rounds (CLAUDE.md "DB migration 003")

create table if not exists synced_events (
  id uuid primary key default gen_random_uuid(),
  league_id uuid references leagues(id) on delete cascade,
  starts_at timestamptz not null,
  rounds int not null default 2,
  bonus_badge text
);

create table if not exists synced_participants (
  event_id uuid references synced_events(id) on delete cascade,
  user_id uuid references profiles(id) on delete cascade,
  completed_rounds int default 0,
  primary key (event_id, user_id)
);

alter table synced_events enable row level security;
alter table synced_participants enable row level security;

-- Members of the event's league can see the event.
create policy "synced_events_select_member" on synced_events
  for select using (
    exists (
      select 1 from league_members m
      where m.league_id = synced_events.league_id and m.user_id = auth.uid()
    )
  );

-- A user can RSVP themselves (insert) and see participants of events they can see.
create policy "synced_participants_insert_own" on synced_participants
  for insert with check (auth.uid() = user_id);
create policy "synced_participants_select_event" on synced_participants
  for select using (
    exists (
      select 1 from synced_events e
      join league_members m on m.league_id = e.league_id
      where e.id = synced_participants.event_id and m.user_id = auth.uid()
    )
  );
