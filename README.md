# Margins

A personal writing studio for essays — built in the spirit of Wolfgang
Weingart's typography: typewriter prose on white paper, grey highlighter,
black margin-note pills, and thin arrows pointing at the words that matter.
The whole interface is strictly black-and-white.

Write your drafts, then switch to **Edit mode** to mark them up the way a
teacher marks up homework: highlight passages, pin notes in the margin with
arrows to the exact phrase, drag paragraphs into a better order, and draw
"move this" arrows. Every essay is stored as a plain, portable **`.md` file**,
and you can snapshot **versions** over time and restore any of them.

## Features

- **Library landing page** — folders, plus *gallery* and *list* views, sortable
  by **latest edited** or **date added**.
- **Two modes per essay**
  - **Write** — a clean, distraction-free typewriter editor.
  - **Edit** — highlight (light / mid / invert greys), add margin notes
    connected by arrows, drag paragraphs to reorder, and draw move-arrows.
- **Markdown storage** — each document is one `.md` file. The essay body stays
  clean, readable markdown; app metadata (annotations, block order, dates)
  lives in a leading HTML comment so any markdown reader can open the file.
- **Version history** — snapshot the current draft any time, preview old
  snapshots, and restore.
- **Autosave** — changes save as you type.

## Run it

```bash
npm install
npm run dev      # Vite on :5173, API on :3001 (Vite proxies /api)
```

Open http://localhost:5173 on your Mac.

For a single-process production-style run:

```bash
npm run build    # builds the React app into dist/
npm start        # Express serves the API and the built app on :3001
```

## Use it from your phone and iPad

Both the dev server and the production server listen on your whole network, so
any device on the **same Wi-Fi** can connect to your Mac.

1. Find your Mac's IP: System Settings → Wi-Fi → Details (e.g. `192.168.1.42`),
   or just read the **Network:** address printed in the terminal when the
   server starts.
2. On the phone / iPad, open:
   - `http://<your-mac-ip>:5173` if you're running `npm run dev`, or
   - `http://<your-mac-ip>:3001` if you ran `npm run build && npm start`.

The data lives on your Mac, so every device edits the same essays. (Add it to
your iPad home screen via Share → *Add to Home Screen* for an app-like window.)

## Formatting & preferences (the `Aa` button)

Tune how the page looks — saved per device:

- **Typeface** — Typewriter / Serif / Sans
- **Text size** and **Line spacing**
- **Page width** — Narrow / A4 / Letter / Wide
- **Full page** — let the paper fill the screen

## Keyboard shortcuts (press `⌘/`)

| Keys | Action |
| --- | --- |
| `⌘E` | switch Write / Edit mode |
| `⌘S` | save a version |
| `⌘,` | open formatting settings |
| `⌘/` | show this shortcut sheet |
| `⌘B` / `⌘I` / `⌘K` | bold / italic / link (Write mode) |
| `⌘1` `⌘2` `⌘3` | heading level (Write mode) |
| `1` `2` `3` | highlight tone, light → invert (Edit mode, text selected) |
| `N` | add a margin note (Edit mode, text selected) |

The interface is monochrome — black, white, and greys throughout, including the
highlighter tones.

## Where your writing lives

```
data/
  <docId>.md                 # one essay = one markdown file
  folders.json               # your folders
  versions/<docId>/<ts>.md   # saved snapshots
```

These files are git-ignored by default so your private writing isn't committed.
Delete the relevant lines in `.gitignore` if you'd rather version your essays
in the repo too.

## How the markup is anchored

Highlights and notes are anchored to a paragraph's id and a character range in
the *visible* text, so reordering paragraphs keeps their marks attached. Editing
a paragraph's text in Write mode reconciles ids by matching unchanged
paragraphs; marks on heavily rewritten paragraphs are dropped.
