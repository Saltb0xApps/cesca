# PomoLeague

A competitive focus app for students. The unit of score is the **pomo** — one
verified, uninterrupted 25-minute focus round. Weekly leagues, streaks, and
synchronized rounds turn studying into a ranked sport. *Duolingo leagues meets
Strava, for studying.*

> **Two clients, one backend.** This repo root is the **Expo / React Native**
> app. A native **SwiftUI** rewrite lives in **[`PomoLeagueApp/`](./PomoLeagueApp)**
> — both talk to the same Supabase schema in `/supabase`. The Swift app is the
> direction going forward; the Expo app remains until parity.

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

### Full setup — real accounts + a real league
```bash
# 1. create a project at https://supabase.com
#    - Authentication > Providers: enable Email (OTP)
#    - Project Settings > API: copy the Project URL and anon public key

cp .env.example .env
#    fill EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY in .env

# 2. apply the schema + server functions (migrations 001..004)
npx supabase login
npx supabase link --project-ref <your-project-ref>
npx supabase db push

# 3. run the app and sign in (not "Explore" — real auth)
npx expo start
```

Once signed in with a configured project, completing a round calls the
`bank_pomo` RPC: it records the pomo, drops you into an open weekly cohort
(≤20), updates the league score (16/day cap), and advances your streak. The
**League** tab then shows real standings (`league_standings` RPC, refreshed live).
The first signed-in users all share one cohort — exactly what you want at launch.

To see a real league fill up, sign in on two devices/simulators with different
emails and complete rounds on each.

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
