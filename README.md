# Cesca

A personal library for saving short-form videos (Instagram Reels, TikToks, your
own clips) for video editing — with searchable music, tags, folders, and
project shot-lists.

Built with **Expo + React Native + TypeScript**, fully offline-first using a
local **SQLite** database. Nothing leaves your phone unless you export it.

## What it does

- **Save from the Share Sheet** — see a reel you like? Tap **Share → Cesca**.
  It saves the link, thumbnail, caption, author, and auto-detects the music.
  Optionally downloads the actual video so it plays in-app and survives the
  post being deleted.
- **Add by link or import** — paste any reel/video URL, or import a clip from
  your device.
- **Gallery** — a grid of every video you've saved, with pull-to-refresh.
- **Search** — by caption, song, artist, author, or tag; filter by source or
  “has music”, and sort newest / oldest / A–Z.
- **Music library** — songs detected from reels land here automatically; add
  your own audio files or Spotify/YouTube/SoundCloud links. Play uploaded audio
  in-app, see every video using a track, and merge duplicates.
- **Folders & tags** — organise saves; tag videos with autocomplete; browse a
  tag browser and rename/merge tags. Export a folder as a text list.
- **Projects** — assemble a video you're making: an ordered shot list of clips
  plus chosen music, notes, and status. Export the shot list to share.
- **Backup & restore** — export the whole library to JSON (save to Files/Drive)
  and restore it on any device.

## Why not "auto-sync everything I tap Save on in Instagram"?

Instagram has **no public API** for your private "Saved" collection. The only
way to read it would be to scrape your logged-in account, which violates
Instagram's Terms of Service and risks a ban — so Cesca deliberately doesn't.

The robust, allowed alternative is the **Share Sheet**: `Share → Cesca` on any
reel. One extra tap, fully reliable. Reel metadata is best-effort (Instagram
gates some data behind login), so every field is editable by hand.

> Downloading reel videos is for personal use and sits in a gray area under
> Instagram's terms. It's controlled by a toggle in Settings.

## Project structure

```
app/                         Expo Router screens (file-based routing)
  _layout.tsx                Root: DB provider, Share Sheet + onboarding gates
  (tabs)/                    Gallery · Search · Music · Folders · Projects
  item/[id].tsx              Video detail: playback, tags, folder, music, notes
  edit/[id].tsx              Edit caption/author/notes/music
  track/[id].tsx             Track detail: play, usage, merge
  folder/[id].tsx            Folder contents + export
  project/[id].tsx           Project shot list + music + export
  pick-clips/[id].tsx        Add clips to a project
  pick-project.tsx           Add an item/track to a project
  tags.tsx, tag/[name].tsx   Tag browser + tag results
  settings.tsx, onboarding.tsx, add.tsx
src/
  db/                        SQLite schema, migrations, row mappers
  repositories/              Data access (items, folders, tracks, tags,
                             projects, settings)
  services/                  metadata, ingest, media (download/thumbnail),
                             export, backup
  components/                Cards, players, and a small UI kit (ui/)
  lib/, theme.ts, types.ts
```

## Getting started

Requires Node 18+ and the Expo tooling.

```bash
npm install
npx expo start          # Expo Go for the UI
```

The Share Sheet, video download, and playback use native code, so to test the
full **Share → Cesca** flow you need a development build:

```bash
npx expo prebuild
npx expo run:ios        # or: npx expo run:android
```

## Scripts

```bash
npm run typecheck       # tsc --noEmit
npm run lint            # eslint (expo config)
npm test                # jest unit tests
```

CI runs all three on every PR (`.github/workflows/ci.yml`).

## Roadmap ideas

- App icon + custom splash artwork.
- Smart auto-tagging of music genre / mood.
- Drag-to-reorder shot lists.
- Cloud sync across devices.
