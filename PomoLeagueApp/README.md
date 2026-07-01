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

1. **OnboardingCarouselView** — swipeable illustrated intro (drop your art into
   the `Intro1/Intro2/Intro3` image sets; a tomato placeholder shows until then).
2. **Create your account** — email OTP sign-in is **required** (no demo in
   release builds; a DEBUG-only "Explore" bypass exists for testing).
3. Set your **name/avatar**, then pick today's **deep-focus goal**.
4. Into the app. **Home** is a field of tomatoes that fill in as you complete pomos.

## Accountability (the core)

- **Phone penalty:** leaving the app during a round loses **today's tomatoes AND
  breaks your streak** — locally (`Ledger.applyPenaltyLocal`) and server-side
  (`apply_penalty` RPC, migration `006`).
- **Partner:** the **Partner** tab links you to one person via an invite code
  (`create_partner_invite` / `accept_partner_invite`). You share a **team streak**;
  if either of you misses your daily goal, it resets for both. Settlement is lazy
  (evaluated on open via `settle_partner_days`); backend is migration `005`.
  A reliable end-of-day cron is a follow-up.

## Home-screen widget

Widget code lives in `PomoLeagueWidget/` and shows today's pomos vs goal. It's a
separate target — follow **WIDGET_SETUP.md** to add it + the shared App Group.

## Status

Requires **Supabase** (accounts are mandatory): fill `Services/Secrets.swift` and
run `supabase db push` (applies `001`–`006`). Written without a compiler
available — expect a few build errors on first open (quick fixes).

Follow-ups: push notifications, Live Activity timer, image-export recap card, and
a cron for reliable partner day-settlement.
