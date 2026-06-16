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

## Status

First native cut. It was written without a compiler available, so expect a few
build errors on first open — they'll be quick fixes. The offline experience is
complete; the Supabase auth/RPC paths need a live project to verify end-to-end.

Not yet ported (deliberate, follow-ups): push notifications, Live Activity /
Dynamic Island timer, widgets, and image-export of the recap card.
