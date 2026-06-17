# Ikigai — project context for Claude Code

## What this is
A minimal iOS app: edit four ikigai domains, render a super-minimal generative
"mark" from that data, archive each version, and visualize how it changes over time.
Wallpaper delivery = export to Photos + a live WidgetKit widget (iOS forbids
programmatic wallpaper setting — do not attempt it).

## Stack
SwiftUI · SwiftData · ImageRenderer · WidgetKit · Swift Charts.
Deployment target iOS 18. No backend. All on-device.

## Architecture
See repo structure. One `WallpaperView` is the single source of truth for the mark —
reused by the in-app preview, the Photos export, and the widget.

## Data model
`IkigaiSnapshot` (@Model): id, createdAt, title, love[], goodAt[], worldNeeds[],
paidFor[], seed. Derived: per-domain `fullness` (0–1), `convergence` (0–1).
Editing = mutate a living draft; "Capture version" clones it into the archive.

Note: `seed` is stored as `Int64`, not `UInt64`. SwiftData crashes when persisting
`UInt64` values above `Int64.max`. Use `UInt64(bitPattern: seed)` when seeding a
random generator for the mark.

## Design tokens
Background #05060A. Four domain nodes in a diamond (love top, goodAt left,
worldNeeds right, paidFor bottom). Node size/opacity = fullness. Central glow =
convergence. Keep top 25% and bottom 15% empty (lock-screen safe). Deterministic
from `seed`. Flat, no skeuomorphism, fine-art minimalism.

## Conventions
- Swift 6 concurrency; @MainActor for rendering.
- Pure functions for metrics so marks are reproducible.
- New source files go in the synchronized group folder (auto-included by Xcode).
- Do NOT hand-edit project.pbxproj; ask me to add targets/capabilities in Xcode.

## Build & run
xcodebuild -scheme Ikigai -destination 'platform=iOS Simulator,name=iPhone 16 Pro' -quiet build
Screenshot to self-check: xcrun simctl io booted screenshot screen.png

## Done-when (per phase)
Builds clean, screenshot matches the design spec, committed to git.
