# PomoLeague

A competitive focus app for students. The unit of score is the **pomo** — one
verified, uninterrupted 25-minute focus round. Weekly leagues, streaks, and
synchronized rounds turn studying into a ranked sport. *Duolingo leagues meets
Strava, for studying.*

> Full product spec, project context, and the phased build plan live in
> **[CLAUDE.md](./CLAUDE.md)**. Out-of-scope ideas go in **[ICEBOX.md](./ICEBOX.md)**.

## Stack
- **App:** Expo (managed) + React Native + TypeScript, expo-router
- **State:** Zustand + TanStack Query
- **Backend:** Supabase (Postgres, Auth, Realtime, Edge Functions)
- **Push:** expo-notifications · **Analytics:** PostHog

## Status: playable offline prototype ✅
The full single-player loop works with no backend (demo mode):
- Auth flow with a **demo mode** ("Explore the app, no account") + onboarding
  (name, avatar, exam tag) that persists.
- **Round session:** focus → 5-min break → chain another round or end; chains
  past 4 require a check-in tap; hold-to-give-up; dev "skip to end"; leaving the
  app fails the round.
- First-run **rules contract** before the first round.
- **Local pomo ledger** → streak, freezes, today/week, best day, longest chain.
- **League** standings against a deterministic demo cohort (promotion/relegation
  zones, tier badge, team-goal bar) — shaped to swap to Supabase Realtime later.
- **Profile** with tier, stats, 12-week activity heatmap, and a **weekly recap
  card** (shares as text now; image export is a later dev-build step).

What's **not** done yet (needs your accounts): a live Supabase project, real
server-validated rounds, real opponents, and weekly rollover. The Supabase
migrations `001`–`003` and edge-function stubs are in `supabase/`. See the
Phase checklist in CLAUDE.md.

## Get it running

You need Node 18+ and the Expo Go app on your phone (or an iOS/Android simulator).

### Quick look — no backend needed
```bash
npm install
npx expo start   # press i (iOS) / a (Android), or scan the QR in Expo Go
```
On the sign-in screen tap **"Explore the app (no account)"** to walk through
onboarding → Home → start a round → test the leave-and-lose mechanic. No
Supabase required. (In demo mode the round runs locally and nothing is saved.)

### Full setup — real accounts + persistence
```bash
# 1. configure Supabase
#    - create a project at https://supabase.com
#    - in Authentication > Providers, enable Email (OTP)
cp .env.example .env
#    fill EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY in .env

# 2. apply the database schema
npx supabase init      # first time only, links the /supabase folder
npx supabase db push   # applies migrations/001..003

# 3. run the app
npx expo start
```

## Useful commands
| Command | What |
|---|---|
| `npm run typecheck` | `tsc --noEmit` |
| `npm run lint` | eslint |
| `npm run gen:types` | regenerate `src/types/database.ts` from your DB |
| `npx supabase functions deploy complete-round` | deploy an edge function |

## Project structure
See CLAUDE.md → Part 2 → "Project structure". The short version:
`app/` = screens (expo-router), `src/` = hooks/stores/lib, `supabase/` =
migrations + edge functions.
