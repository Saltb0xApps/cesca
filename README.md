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

## Status: Phase 0 (scaffold) ✅
What's in place:
- Expo + expo-router app shell: auth flow, tabs (Home / League / Profile), and a
  full-screen round modal with a working countdown + foreground guard.
- Email-OTP sign-in and an onboarding screen (name, avatar, exam tag).
- Zustand round store + `useRound` / `useAppStateGuard` hooks (interfaces wired,
  server calls stubbed for Phase 1).
- Supabase migrations `001`–`003` (profiles/rounds, leagues, synced events) with
  RLS, plus `complete-round` and `league-rollover` edge-function stubs.

What's **not** done yet (needs your accounts): a live Supabase project and the
real server validation/scoring. See the Phase checklist in CLAUDE.md.

## Get it running

You need Node 18+ and the Expo Go app on your phone (or an iOS/Android simulator).

```bash
# 1. install dependencies
npm install
# align Expo package versions to the SDK (recommended once after install)
npx expo install --fix

# 2. configure Supabase
#    - create a project at https://supabase.com
#    - in Authentication > Providers, enable Email (OTP)
cp .env.example .env
#    fill EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY in .env

# 3. apply the database schema
npx supabase init      # first time only, links the /supabase folder
npx supabase db push   # applies migrations/001..003

# 4. run the app
npx expo start         # press i (iOS) / a (Android), or scan the QR in Expo Go
```

Without a configured `.env`, the app still launches to the sign-in screen and
shows a configuration warning — handy for eyeballing the UI before wiring the
backend.

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
