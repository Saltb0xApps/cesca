# Ikigai — iOS app build plan

A minimal iOS app that turns your ikigai into a generative, super-minimal **wallpaper**,
**archives every version**, and lets you **watch how it changes over the long term**.

Build it incrementally — each phase ships something real.

---

## 1. What it is (and the one constraint that shapes everything)

**Core loop:** edit your four ikigai domains → the app renders a minimal mark from that
data → you *capture* it as a dated snapshot → over months you see the mark (and the
underlying balance) drift.

**The hard constraint:** iOS gives apps **no public API to set the wallpaper**. Don't
fight it. Instead the app delivers the wallpaper two ways:

1. **Export → Photos.** Render a high-res image, save it to the photo library, and the
   user sets it manually. Two taps.
2. **A live widget.** A WidgetKit Lock Screen + Home Screen widget that draws your
   *current* ikigai mark and refreshes over time — a self-updating wallpaper that needs
   zero user action.

---

## 2. Feature scope, by phase

| Phase | Ships |
|---|---|
| **0 — Setup** | Empty SwiftUI + SwiftData app that builds & runs on simulator |
| **1 — Editor + archive** | Edit 4 domains; "Capture version"; list of past versions |
| **2 — Wallpaper render + export** | Minimal generative mark from a snapshot; save to Photos / share |
| **3 — Evolution view** | Timeline of snapshots, gallery of past marks, balance chart over time |
| **4 — Widget** | Lock/Home-screen widget showing current mark, auto-refresh |
| **5 — Polish & ship** | Onboarding, iCloud sync, TestFlight, App Store |

**MVP = Phases 1–2.**

---

## 3. Architecture

Single SwiftUI app, no server, all on-device.

```
Ikigai/                         # app target
├─ App/
│  └─ IkigaiApp.swift           # @main, ModelContainer setup
│  └─ ContentView.swift         # root TabView (Editor / Archive)
├─ Models/
│  └─ IkigaiSnapshot.swift      # @Model (SwiftData) — the archived version
│  └─ Metrics.swift             # fullness + convergence derived from a snapshot
├─ Editor/
│  └─ EditorView.swift          # edit the 4 domains, "Capture version"
│  └─ DomainCard.swift
│  └─ Draft.swift               # the living draft (persisted to UserDefaults)
├─ Wallpaper/                    # Phase 2
│  └─ WallpaperView.swift
│  └─ WallpaperRenderer.swift
│  └─ PhotoSaver.swift
├─ Archive/
│  └─ ArchiveListView.swift     # all snapshots, newest first
│  └─ EvolutionView.swift       # Phase 3
├─ Shared/
│  └─ DesignTokens.swift        # colors, the minimal-mark spec, layout constants
│  └─ MiniMark.swift            # tiny preview mark (placeholder until Phase 2)
│  └─ FlowLayout.swift          # wrapping chip layout
└─ Assets.xcassets
IkigaiWidget/                   # widget extension target (Phase 4)
```

**Key technical choices**
- **SwiftData** for persistence + versioning. Each captured version is one `@Model` row.
- **ImageRenderer** to turn the SwiftUI `WallpaperView` into a `UIImage` at any
  resolution. One source of truth for the mark.
- **WidgetKit** with an **App Group** so the widget reads the same SwiftData store.
- **Swift Charts** for the evolution trend line.
- Deployment target **iOS 18**.

---

## 4. Data model

`IkigaiSnapshot` (@Model): id, createdAt, title, love[], goodAt[], worldNeeds[],
paidFor[], seed.

- `fullness` per domain → normalized item count (cap at ~5), 0…1. Controls each node's
  size/opacity.
- `convergence` → how evenly all four are developed (`min / max` of the four counts).
  Controls the central glow — only bright when all four have substance.

Editing model: you edit a **living draft**; **"Capture version"** clones it into the
immutable archive with a fresh `createdAt`.

> Implementation note: `seed` is stored as `Int64`, not `UInt64`. SwiftData crashes when
> persisting `UInt64` values above `Int64.max`. Derive a `UInt64` with
> `UInt64(bitPattern: seed)` when seeding the generative mark.

---

## 5. The minimal wallpaper — design spec (Phase 2)

- Pure near-black background (`#05060A`).
- Four luminous nodes in a diamond: love (top), good-at (left), world-needs (right),
  paid-for (bottom).
- Each node's **radius + opacity = that domain's fullness**.
- A **central node** whose brightness = `convergence`.
- A subtle seeded scatter of star specks for uniqueness (seeded by `snapshot.seed`).
- **Lock-screen-safe:** keep the top ~25% and bottom ~15% calm and empty.
- Render at device resolution with `ImageRenderer`; save to Photos with add-only
  authorization (`NSPhotoLibraryAddUsageDescription`).

---

## 6. Evolution-over-time view (Phase 3)
Balance trend (Swift Charts), mark gallery (LazyVGrid of thumbnails), optional scrubber.

## 7. The widget (Phase 4)
Widget Extension target + App Group; reuse `WallpaperView`; reload timelines on capture.

## 8–12
See git history / commit messages. Build phase by phase, commit when green.

---

## Status

- [x] Phase 0 — SwiftUI + SwiftData app scaffold
- [x] Phase 1 — Editor + archive
- [ ] Phase 2 — Wallpaper render + export
- [ ] Phase 3 — Evolution view
- [ ] Phase 4 — Widget
- [ ] Phase 5 — Polish & ship
