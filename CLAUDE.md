# PomoLeague — Complete Spec, Project Context & Build Plan

Single-file version. Three parts: **Part 1 — Product Spec**, **Part 2 — Project Context (CLAUDE.md content)**, **Part 3 — Phased Build Plan**.

---

# PART 1 — PRODUCT SPEC

**Concept:** A competitive focus app for students. The unit of score is the **pomo** — one verified, uninterrupted 25-minute focus round. Weekly leagues, streaks, and synchronized rounds turn studying into a ranked sport.

**One-line pitch:** Duolingo leagues meets Strava, for studying — scored in pomodoros.

**Naming note:** Keep "Pomodoro" out of the app name (commodity App Store search term). Brand the tomato/round metaphor, not the technique.

---

## 1. Core Loop
1. **Start a round** — one pomo = 25 min focus + 5 min break. Phone locks into the app.
2. **Survive the round** — leaving the app for >10s kills it. A dead round banks nothing. All-or-nothing: no partial credit.
3. **Bank the pomo** — completed pomos are the universal score.
4. **Climb the weekly league** — cohort of ~20 students at your tier. Monday–Sunday, scored in pomos. Top 5 promote, bottom 5 relegate.
5. **Break = social moment** — during the 5-min break the league chat/feed opens: live standings, reactions, banter. Work is silent; breaks are social.
6. **Streaks build identity** — daily streak (≥1 pomo), tier badge, personal records, exam tag ("USMLE Step 1 · Gold III · 47-day streak").

## 2. Signature Feature: Synchronized Rounds
Because every round is identical, leagues can run **synced sessions**: scheduled events ("Power Hour at 8PM — 2 back-to-back pomos") where everyone in the league starts together. Joiners earn a bonus pomo multiplier or badge. Shared break chat between rounds.

This is the feature flexible-minute apps cannot copy cleanly, and it creates appointment-based engagement.

## 3. Flow-Worker Accommodation: Chained Rounds
Deep-work students can **chain pomos** — back-to-back rounds with skippable breaks. A 2-hour uninterrupted session banks as 4 pomos. Standardized unit preserved, no forced interruption.

## 4. Key Decisions (locked)
| Decision | Choice | Why |
|---|---|---|
| Score unit | Completed pomos (25 min, all-or-nothing) | Legible, game-like, comparable, cheat-resistant |
| Session format | One format: the pomo. Chaining for long sessions. | Simplicity; the standardized round IS the product |
| Platform v1 | Mobile only (Expo / React Native) | The phone is the distraction; controlling it is the verification |
| Verification v1 | Foreground detection (AppState). Backgrounded >10s → round fails | Ships now; Screen Time APIs need Apple entitlements — later |
| League | ~20 per cohort, tiered Bronze→Silver→Gold→Diamond→Tomato (top tier, lean into it), weekly promotion/relegation top-5/bottom-5 | Duolingo-proven mechanics |
| Cooperative valve | Weekly league team goal (e.g., league banks 300 pomos together → everyone gets badge) | Protects non-competitive users |
| Streak insurance | 1 freeze earned per 7-day streak, max 2 banked | Streaks retain; broken streaks churn |
| Monetization v1 | None | Earn the right to charge later |

## 5. Anti-Cheat v1
- Foreground enforcement with 10s grace (notification peeks OK)
- All-or-nothing rounds (the pomo unit itself is the main anti-cheat)
- Daily cap: 16 pomos count toward league (~6.5h focused — generous but kills overnight farming)
- Chains longer than 4 pomos require a check-in tap between rounds
- Server-side round start/end timestamps; client never reports duration
- Philosophy: make cheating boring and capped, not impossible

## 6. MVP Scope
**In:**
- Onboarding with exam/goal tag (identity + future club seeds)
- Pomo timer with foreground enforcement, chaining, skippable breaks
- Pomo ledger, daily streak + freezes, weekly/all-time stats, PRs
- Weekly league: auto-cohort, live standings, promotion/relegation, match-day style results screen (Sunday night — make it FEEL like results)
- 1 synced event per league per week (server-scheduled Power Hour)
- Break-time league feed: standings delta + emoji reactions (no full chat in v1 — moderation burden)
- Push: streak at risk, "X just passed you," synced round starting in 15 min, week ending
- Profile: avatar, tier, streak, total pomos, exam tag
- Shareable weekly recap card (Strava-style, sized for IG stories/WhatsApp)

**Out (v2+, write down to prevent scope creep):**
- Clubs, friends, 1v1 duels, full chat
- Video/body doubling
- OS-level app blocking
- Desktop/web
- Payments, real rewards
- AI features

## 7. Cold Start
1. Launch into ONE dense student community (your med school cohort is ideal: dense, exam-driven, hours-hungry).
2. Until ≥15 users can fill a league: global leaderboard fallback so the app never feels empty.
3. Growth mechanic #1 = the weekly recap share card. That's the marketing budget.

## 8. Success Metrics
- Activation: % of new users completing ≥3 pomos in week 1
- D7 retention ≥25% in seed community = keep going
- Addiction signal: users opening the app to check standings *between* rounds
- Synced event attendance rate (validates the signature feature)

---

# PART 2 — PROJECT CONTEXT

Project context for Claude Code. Product rationale is in Part 1; the phased task list is in Part 3.

## What this is
A mobile app (Expo / React Native + Supabase) where students compete in weekly leagues scored in "pomos" — verified, uninterrupted 25-minute focus rounds. Duolingo leagues meets Strava.

## Stack
- **App:** Expo (managed workflow) + React Native + TypeScript, expo-router for navigation
- **State:** Zustand (app state) + TanStack Query (server state)
- **Backend:** Supabase — Postgres, Auth, Realtime (league standings), Edge Functions (league rollover, synced events)
- **Push:** expo-notifications
- **Analytics:** PostHog

## Commands
- `npx expo start` — dev server
- `npx expo start --ios` / `--android` — run on simulator
- `npm run typecheck` — `tsc --noEmit`
- `npm run lint` — eslint
- `npx supabase db push` — apply migrations (in /supabase)
- `npx supabase functions deploy <name>` — deploy edge function

## Project structure
```
app/                    # expo-router screens
  (auth)/               # sign-in, onboarding
  (tabs)/
    index.tsx           # Home: start round, streak, today
    league.tsx          # League standings + weekly results
    profile.tsx         # Stats, tier, recap card
  round.tsx             # Active round screen (full-screen, modal)
src/
  components/
  hooks/
    useRound.ts         # round state machine — THE critical file
    useAppStateGuard.ts # foreground enforcement
  lib/
    supabase.ts
    notifications.ts
  stores/
    roundStore.ts       # Zustand: active round state
supabase/
  migrations/
  functions/
    league-rollover/    # Sunday 23:59 cron: score, promote/relegate, re-cohort
    complete-round/     # server-validated round completion
```

## Domain rules (do not violate)
1. **A pomo is all-or-nothing.** 25:00 of foreground time or it banks nothing. No partial credit, ever.
2. **Foreground enforcement:** AppState leaves `active` for >10s cumulative during a round → round fails. Track via `useAppStateGuard`.
3. **Server is the source of truth for time.** Client calls `start_round` (server timestamps), then `complete-round` edge function validates `now() - started_at >= 25min - tolerance(15s)` and that no `fail` event was logged. Client NEVER reports its own duration.
4. **Daily league cap: 16 pomos.** Pomos beyond that still bank to lifetime stats but don't count for league score.
5. **Chains:** rounds may be chained back-to-back (break skipped). Chains >4 require a check-in tap to start the next round.
6. **Streak = ≥1 completed pomo per local calendar day.** Freezes: earn 1 per 7-day streak, max 2 banked, auto-consumed.
7. **League week = Monday 00:00 → Sunday 23:59 in cohort's anchor timezone.** Top 5 promote, bottom 5 relegate, handled solely by the `league-rollover` edge function.

## Round state machine (useRound.ts)
idle → running → (break | failed | completed)
- running + AppState background >10s → failed (log fail event to server immediately on return)
- running + 25:00 elapsed → completed → call complete-round → break
- break → (start next chained round | idle)
- App killed mid-round: on relaunch, compare server started_at vs now; if round window passed without completion event → failed. Be honest in UI ("Round lost — your phone left the app").

## Conventions
- TypeScript strict; no `any`
- All Supabase access through typed client in src/lib/supabase.ts (generate types: `npx supabase gen types typescript`)
- RLS on every table; users can only read their own rounds, read (not write) their league's standings
- Edge functions own all scoring/league mutations — the client never writes scores
- Keep components dumb; logic lives in hooks/stores
- Instrument with PostHog: round_start, round_complete, round_failed, league_viewed, synced_event_joined, recap_shared

## Current phase
See Part 3 — work through phases in order; do not start a phase before the previous one's acceptance checks pass.

---

# PART 3 — BUILD PLAN

Phased implementation plan. Each phase has concrete tasks and acceptance checks. Complete phases in order. Estimated total: ~2 weeks of focused building.

---

## Phase 0 — Scaffold (half day)
- [x] Expo (managed) + expo-router + TypeScript structure per Part 2
- [x] Install deps: zustand, @tanstack/react-query, @supabase/supabase-js, expo-notifications, posthog-react-native
- [ ] `npx supabase init`; create project; wire env (EXPO_PUBLIC_SUPABASE_URL / ANON_KEY)
- [x] Supabase email/OTP auth + minimal sign-in screen
- [x] Onboarding screen: display name, avatar pick, exam/goal tag (free text + suggestions: "USMLE", "Bar Exam", "A-Levels", "Finals", "Thesis")

**Accept:** App runs on simulator; new user can sign up and land on Home.

---

## Phase 1 — The Round (days 1–3) ← the heart of the product

### DB migration 001
```sql
create table profiles (
  id uuid primary key references auth.users,
  display_name text not null,
  avatar text,
  exam_tag text,
  timezone text not null default 'UTC',
  streak_count int not null default 0,
  streak_freezes int not null default 0,
  last_pomo_date date,
  created_at timestamptz default now()
);
create table rounds (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id),
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  status text not null default 'running' check (status in ('running','completed','failed')),
  chain_index int not null default 0,        -- position within a chain
  fail_reason text,                          -- 'backgrounded' | 'abandoned' | 'timeout'
  counts_for_league boolean not null default true
);
create index on rounds (user_id, started_at);
```
RLS: users select/insert own rounds; status transitions only via RPC/edge function.

### Tasks
- [x] `useAppStateGuard`: subscribe to AppState; accumulate background time during a running round; >10s → mark failed locally + log to server on return *(local enforcement done; server fail-log pending Supabase)*
- [x] `useRound` state machine per Part 2 (idle/running/break/failed/completed), driven by `started_at`, not a local stopwatch (survives app suspend) *(orchestrated in round.tsx + roundStore; reads server time once wired)*
- [ ] `start_round` RPC (inserts row, returns server timestamp) — needs Supabase
- [ ] `complete-round` edge function: validates elapsed ≥ 24:45, no fail event, applies daily league cap (16), updates streak (+ freeze consumption logic), returns new totals — needs Supabase
- [x] Round screen: full-screen timer, calm, keep-awake, big "give up" friction (hold to abandon)
- [x] Break screen: 5:00 countdown, "chain next round" button (check-in tap required when chain_index ≥ 4)
- [x] Failed screen: honest, non-punishing copy + instant "restart round"
- [ ] App-kill recovery: on launch, reconcile any `running` round against server time → mark failed if window passed — needs Supabase

> Offline-first note: pomos bank to a local ledger (`src/stores/ledgerStore.ts`)
> so the full round/break/chain/stats loop works in demo mode without a backend.
> The Supabase phase makes the server authoritative (start_round + complete-round)
> and adds app-kill reconciliation.

**Accept:** Complete a real pomo on device; background the app 15s mid-round → round fails; chain 2 rounds; kill app mid-round → reconciles as failed; streak increments once per day.

---

## Phase 2 — Streaks, Stats, Home (days 4–5)
- [ ] Home screen: streak flame + freezes, today's pomos, week total, big Start button
- [ ] Stats: this week / all-time pomos, best day, longest chain, calendar heatmap (simple grid)
- [ ] Local notifications: streak-at-risk at 20:00 local if no pomo today
- [ ] PostHog events wired (see Part 2 list)

**Accept:** Streak/freeze math correct across day boundaries and timezones (test by changing device date); heatmap renders.

---

## Phase 3 — Leagues (days 6–9) ← second heart

### DB migration 002
```sql
create table leagues (
  id uuid primary key default gen_random_uuid(),
  tier int not null default 1,              -- 1=Bronze ... 5=Tomato
  week_start date not null,
  anchor_tz text not null default 'UTC'
);
create table league_members (
  league_id uuid references leagues(id),
  user_id uuid references profiles(id),
  pomos int not null default 0,             -- denormalized weekly score, maintained by complete-round fn
  primary key (league_id, user_id)
);
create table league_results (               -- written by rollover, powers results screen
  league_id uuid, user_id uuid, week_start date,
  final_rank int, pomos int, movement text check (movement in ('promoted','stayed','relegated')),
  primary key (league_id, user_id, week_start)
);
```

### Tasks
- [ ] Cohort assignment: on first completed pomo of the week, place user into an open league at their tier (<20 members) or create one; if total active users <15, show global leaderboard instead (cold-start fallback)
- [ ] `complete-round` fn also increments `league_members.pomos` (respecting daily cap)
- [~] League screen: standings UI with promotion/relegation zones shaded + team-goal progress bar — DONE against an offline demo cohort (`src/lib/demoLeague.ts`); swap data source to Supabase Realtime when wired
- [ ] `league-rollover` edge function on cron (Sun 23:59 anchor tz): write league_results, promote top 5 / relegate bottom 5, form next week's cohorts
- [ ] Results screen (Sunday night → Monday): animated rank reveal, movement banner, share button. Spend real design effort here — this is match day.
- [ ] Push: "X just passed you" (debounced, max 2/day), "week ends in 24h and you're 2 pomos from promotion"

**Accept:** Two test accounts in one league see each other's scores update live; rollover cron promotes/relegates correctly on a forced run; results screen renders from league_results.

---

## Phase 4 — Synced Rounds (days 10–11) ← signature feature

### DB migration 003
```sql
create table synced_events (
  id uuid primary key default gen_random_uuid(),
  league_id uuid references leagues(id),
  starts_at timestamptz not null,
  rounds int not null default 2,
  bonus_badge text
);
create table synced_participants (
  event_id uuid references synced_events(id),
  user_id uuid references profiles(id),
  completed_rounds int default 0,
  primary key (event_id, user_id)
);
```
- [ ] Server schedules 1 event per league per week (rollover fn picks a slot, e.g., Wed 20:00 anchor tz)
- [ ] Event card on league screen: countdown, "I'm in" RSVP, push at T-15min
- [ ] Lobby screen at T-0: shows avatars of everyone joining → rounds start simultaneously (server timestamp)
- [ ] Between synced rounds: shared break screen with live emoji reactions (Realtime broadcast — no persistent chat in v1)
- [ ] Completion badge + highlight on results screen

**Accept:** Two accounts join the same event, start simultaneously, see each other's reactions on break, both earn badge.

---

## Phase 5 — Recap Card + Polish + Ship (days 12–14)
- [ ] Weekly recap share card: react-native-view-shot → image (pomos, rank, tier, streak, exam tag; 9:16 for IG stories) + native share sheet
- [ ] Profile screen final pass; tier badges art (placeholder OK, consistent style)
- [ ] Empty states everywhere (no league yet, no pomos yet)
- [ ] Onboarding polish: explain the pomo rule ("leave the app, lose the round") BEFORE first round — set the contract clearly
- [ ] EAS build → TestFlight + Android internal track
- [ ] Seed launch: post in chosen student community with recap-card screenshots

**Accept:** A stranger can install, understand the rules, complete a pomo, and find their league without help.

---

## Deliberately NOT in this plan
Clubs, friends, duels, full chat, video, OS-level blocking, desktop, payments, AI. See Part 1 §6 and ICEBOX.md. If tempted, write it in ICEBOX.md instead.

## Risks to watch
- **iOS backgrounding edge cases** (calls, notification center pulls, control center) — tune the 10s grace with real-device testing; err lenient at launch, tighten later
- **Timezone math** for streaks and league weeks — write unit tests for day-boundary cases early (Phase 2)
- **Empty leagues** — never show a league with <8 people; fall back to global board
- **Push permission denial** — app must still work; standings-checking is the fallback engagement loop
