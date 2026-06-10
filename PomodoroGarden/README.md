# 🍅 Pixel Garden — a Pomodoro you grow

A pixel-art focus game for iPhone. Plant a "pomodoro" (a tomato, strawberry,
carrot, eggplant, corn, or sunflower), start the timer, and **stay in the app**
while it grows. Finish the session and the plant matures and joins your garden.
Leave the app to go mess with your phone and it **rots and dies** — nothing gets
planted. Build a whole pixel garden out of the focus sessions you actually
finished.

Inspired by the "plant a tree" focus apps, but you grow a whole veggie/fruit
patch in a chunky, retro pixel style.

## How it works (the game rule)

- Tap **Plant a Pomodoro**, pick a seed and a length (15 / 25 / 50 min).
- A seed sprouts and grows on screen as the timer counts down.
- If you **background the app** (home screen, app switcher, another app) while
  it's still growing, the plant rots — 💥 game over for that one.
- If you make it to the end, it ripens and is added to your garden grid.
- Today / all-time counts track your productivity.

> Note: the "you left" detection fires when iOS sends the app to the background
> (`scenePhase == .background`). Locking the screen also backgrounds the app, so
> a strict-by-design session counts a screen lock as leaving. This is easy to
> relax later if you'd rather allow screen-off.

## Tech

- **SwiftUI**, iOS 17+. No third-party dependencies.
- All pixel art is drawn **programmatically** (`PixelSprite` grids rendered with
  `Canvas`), so there are no binary image assets — sprites live in `Plants.swift`
  as editable text.
- Garden is persisted locally with `UserDefaults` (`GardenStore`).

### Files

| File | Purpose |
|------|---------|
| `PomodoroGardenApp.swift` | App entry; watches scene phase to detect leaving |
| `AppModel.swift` | Session state machine, timer, garden persistence, game rule |
| `Plants.swift` | Plant types, growth stages, storage, sprite library |
| `PixelArt.swift` | Color palette, sprite renderer, pixel styling |
| `ContentView.swift` | Home screen: garden + stats + plant button |
| `GardenView.swift` | Sky background + grid of grown plants |
| `PlantPickerView.swift` | Seed + duration picker |
| `SessionView.swift` | Growing / grew / died full-screen session |

## Run it

You need a Mac with **Xcode 16+**.

```bash
open PomodoroGarden/PomodoroGarden.xcodeproj
```

1. Select an iPhone simulator (or your device) in the top bar.
2. Press ▶︎ (Cmd-R).
3. To run on a real iPhone: select your device, then in **Signing &
   Capabilities** pick your Apple ID team (the bundle id is
   `com.cesca.PomodoroGarden` — change it if it's taken).

To really feel the game rule on a device/simulator: start a session, then press
the Home button / swipe up — come back and your plant is dead.

## Roadmap: Notion sync

The long-term goal is to log each finished session to a Notion database so you
can see how long real tasks took.

Each grown plant is already stored as a record that maps cleanly onto Notion:

```swift
PlantedPlant(id: UUID, typeID: "tomato", plantedAt: Date)
```

Planned approach:

1. Add an optional **task name** field to a session (what you're focusing on).
2. Create a Notion integration + database with `Task` (title), `Plant` (select),
   `Minutes` (number), and `Completed At` (date).
3. Add a tiny backend / serverless function that holds the Notion API token and
   exposes a "create page" endpoint — the token can't ship inside the app safely.
4. On a successful session, POST the record and mark it synced locally.

The data model is intentionally small so this can be bolted on without a rewrite.
