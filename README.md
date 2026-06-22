# Cesca

A personal library for saving short-form videos (Instagram Reels, TikToks, your
own clips) for video editing — with searchable music, tags, and folders.

Built with **Expo + React Native + TypeScript**, fully offline-first using a
local **SQLite** database. Nothing leaves your phone.

## What it does

- **Save from the Share Sheet** — see a reel you like? Tap **Share → Cesca**.
  The app ingests the link, pulls the thumbnail/caption/author, and auto-detects
  the music. (One tap instead of zero, but reliable and within platform rules —
  see the note below.)
- **Add by link** — paste any Instagram/TikTok/video URL to save it.
- **Gallery** — a grid of every video you've saved.
- **Search** — find videos by caption, song, artist, author, or tag.
- **Music library** — songs detected from reels land here automatically; you can
  also add your own audio files or Spotify/YouTube/SoundCloud links, all
  searchable in one place.
- **Folders** — organise saves into folders like _Transitions_, _Hooks_,
  _Travel edits_.
- **Tags** — tag any video and search across tags.

## Why not "auto-sync everything I tap Save on in Instagram"?

Instagram has **no public API** that lets a third-party app read your private
"Saved" collection. The only way to get it would be to scrape your logged-in
account, which violates Instagram's Terms of Service and risks your account
being banned — so Cesca deliberately doesn't do that.

The robust, allowed alternative is the **Share Sheet**: `Share → Cesca` on any
reel. It's one extra tap, but it's reliable and won't get your account flagged.
This is the same approach used by every legitimate "save for later" app.

## Project structure

```
app/                         Expo Router screens (file-based routing)
  _layout.tsx                Root: DB provider + Share Sheet handler
  (tabs)/                    Gallery · Search · Music · Folders
  item/[id].tsx              Video detail: tags, folder, music, open original
  folder/[id].tsx            Contents of one folder
  add.tsx                    Paste-a-link modal
src/
  db/                        SQLite schema, migrations, row mappers
  repositories/              Data access (items, folders, tracks)
  services/
    metadata.ts              Open Graph fetch + music heuristics
    ingest.ts                Turns a share/link/file into a saved item
  components/                VideoCard, SearchBar, EmptyState
  theme.ts, types.ts
```

## Getting started

Requires Node 18+ and the Expo tooling.

```bash
npm install
npx expo start          # then press i / a, or scan the QR in Expo Go
```

The Share Sheet extension uses native code (`expo-share-intent`), so to test the
**Share → Cesca** flow you need a development build rather than Expo Go:

```bash
npx expo prebuild
npx expo run:ios        # or: npx expo run:android
```

Type-check the project at any time with:

```bash
npm run typecheck
```

## Roadmap ideas

- In-app playback for uploaded clips and downloaded reel videos.
- Smart auto-tagging of music genre / mood.
- iCloud / Google Drive backup of the library.
- Bulk export of a folder's music as an editing shot list.
