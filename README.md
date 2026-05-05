# Cesca

A handwriting-first notebook for iPad with Apple Pencil, designed to:

1. Let you write freely in notebooks (PencilKit canvas, infinite pages).
2. Track *when* you wrote — total pages per day plus the actual minutes during the day you were writing.
3. Recognize the handwriting (Apple Vision) and push the resulting text to a target page in Notion.

This repo is a small monorepo:

| Path | What it is |
|---|---|
| `apps/Cesca/` | SwiftUI iPad app (PencilKit + SwiftData + Vision + Notion HTTP client) |
| `packages/notion-sync/` | Tiny TypeScript helper to validate your Notion integration token and target page from your laptop |

## Getting started — iPad app

The Xcode project is generated from `apps/Cesca/project.yml` using
[XcodeGen](https://github.com/yonaskolb/XcodeGen) so we don't have to keep a
huge `project.pbxproj` in git.

```bash
brew install xcodegen
cd apps/Cesca
xcodegen generate
open Cesca.xcodeproj
```

Then in Xcode:

1. Pick your team in *Signing & Capabilities* (the bundle id `com.cesca.app` in `project.yml` is just a placeholder — change it).
2. Run on an iPad (real device for Apple Pencil; the simulator works for everything else).
3. Open *Settings* in the app and paste:
   - **Notion integration token** — create one at <https://www.notion.so/my-integrations> and share your target page with it.
   - **Notion page id** — the 32-char id from the page URL.

## Getting started — Notion helper

Use this from a laptop to confirm your token and page id work before pasting them into the iPad app.

```bash
cd packages/notion-sync
npm install
NOTION_TOKEN=secret_xxx NOTION_PAGE_ID=xxxxxxxxxxxx npm run check
```

It will print the page title and append a tiny "hello from cesca" block so you can see it land in Notion.

## How the data model works

- **Notebook** — a named binder. Has many pages.
- **Page** — has a `PKDrawing` blob plus an ordered list of **Stroke** entries that record `{startedAt, endedAt}`. Per-stroke timestamps are what powers the per-day-minute timeline.
- **DayActivity** is a derived view: group strokes by `startOfDay` to get pages touched + active minutes per day.

## Roadmap (not built yet)

- iCloud sync of `PKDrawing` blobs (CloudKit container is wired up but disabled by default)
- Smarter Notion mapping (one Notion page per notebook page vs. one per day)
- Live OCR preview while writing
