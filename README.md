# Margins

A personal writing studio for essays — built in the spirit of Wolfgang
Weingart's typography: typewriter prose on white paper, yellow highlighter,
black margin-note pills, and thin arrows pointing at the words that matter.

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
  - **Edit** — highlight (yellow / orange / peach), add margin notes connected
    by arrows, drag paragraphs to reorder, and draw move-arrows between blocks.
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

Open http://localhost:5173.

For a single-process production-style run:

```bash
npm run build    # builds the React app into dist/
npm start        # Express serves the API and the built app on :3001
```

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
