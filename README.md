# PomoLeague

A focus app for students, scored in **pomos** — verified, uninterrupted
25-minute deep-focus rounds. Build streaks, grow a garden of vegetables, track
time by subject, and climb a weekly league. *Duolingo meets Strava, for your
brain.*

## This repo

- **[`PomoLeagueApp/`](./PomoLeagueApp)** — the app: **native iOS, SwiftUI**
  (Xcode 16+). Start here → see its [README](./PomoLeagueApp/README.md).
- **[`supabase/`](./supabase)** — the backend: Postgres schema + server-owned
  RPCs (migrations `001`–`004`). Applied with `supabase db push`.
- **`CLAUDE.md`** — the original product spec & build plan. **`ICEBOX.md`** —
  parked ideas.

> The app runs **fully offline** out of the box. Supabase is optional and only
> needed for real accounts + the real league.

## Run it

```bash
open PomoLeagueApp/PomoLeague.xcodeproj
```
Pick a simulator (or your iPhone) and press ▶︎ (Cmd-R).

- To make the league real: fill in `PomoLeagueApp/PomoLeague/Services/Secrets.swift`
  and apply the migrations (`supabase db push`).
- To add the home-screen widget: see `PomoLeagueApp/WIDGET_SETUP.md`.

> A previous Expo / React Native version lived here; it was retired in favor of
> the native app and remains in git history if ever needed.
