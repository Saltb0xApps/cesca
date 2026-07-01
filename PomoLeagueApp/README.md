# PomoLeague — native iOS (SwiftUI)

A full SwiftUI rewrite of the Expo app: verified focus rounds ("pomos"),
streaks, a vegetable garden you grow, time-by-subject tracking, and a weekly
league. Same Supabase backend as the web app (talked to over plain HTTPS — no
Swift package to add).

> The Expo/React Native version still lives at the repo root. This folder is the
> native app. They share the Supabase schema (`/supabase`).

## Run it

Needs a Mac with **Xcode 16+**.

```bash
open PomoLeagueApp/PomoLeague.xcodeproj
```
Pick a simulator (or your iPhone) and press ▶︎ (Cmd-R). Bundle id is
`com.cesca.pomoleague` — for a real device, set your team under Signing &
Capabilities.

It runs **fully offline out of the box** (tap "Explore the app"). To test the
core rule: start a round, swipe to the Home screen, come back → the round fails.

## Make the league real (optional)

1. Use the same Supabase project as the web app, with migrations `001`–`004`
   applied (`supabase db push` from the repo root).
2. Open `PomoLeague/Services/Secrets.swift` and fill in:
   ```swift
   static let supabaseURL = "https://YOUR-PROJECT.supabase.co"
   static let supabaseAnonKey = "YOUR-ANON-KEY"
   ```
3. Run, and **sign in with email** (not "Explore"). Completing a round calls the
   `bank_pomo` RPC; the League tab shows real standings via `league_standings`.

## Structure

| Folder | What |
|--------|------|
| `Models/` | Pomo + stats, tiers, veggies, league cohort |
| `Stores/` | Ledger, profile, task, round state machine (`ObservableObject`) |
| `Services/` | Supabase REST client, Auth, Banking, Secrets |
| `Components/` | `VegIcon` (line-art veggies via Canvas), `Heatmap` |
| `Views/` | SignIn, Onboarding, Rules, Home, Round, Stats, League, Profile, Recap, Garden |

## First-run flow

1. **PowerIntroView** — "you've been given the power to focus" (drop your art
   into the `PowerHero` image set; a tomato placeholder shows until then).
2. **Give me the power** → choose today's deep-focus goal (pomodoros).
3. Into the app. The **Home** screen is a field of tomatoes that fill in as you
   complete pomos (the in-app "background").

## Home-screen widget

Widget code lives in `PomoLeagueWidget/` and shows today's pomos vs goal. It's a
separate target — follow **WIDGET_SETUP.md** (~5 min in Xcode) to add it and the
shared App Group. The app updates it whenever you open Home or bank a pomo.

## Status

Native cut, written without a compiler available — expect a few build errors on
first open (quick fixes). The offline experience is complete; the Supabase
auth/RPC paths need a live project to verify end-to-end.

Not yet ported (follow-ups): push notifications, Live Activity / Dynamic Island
timer, and image-export of the recap card.
