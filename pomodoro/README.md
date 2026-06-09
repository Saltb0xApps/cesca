# 🍅 Pomodoro

A super simple Pomodoro timer to count your focus sessions for productivity.

No build step, no dependencies — just open it in a browser.

## Run it

Double-click `index.html`, or serve the folder:

```bash
cd pomodoro
python3 -m http.server 8000
# then open http://localhost:8000
```

## Features

- Type what you're working on, then run a focus timer (default 25 min).
- Auto-switches between Focus and Break. Adjustable lengths.
- Start / Pause / Reset / Skip.
- Counts pomodoros completed today and all-time.
- History of completed sessions (task, length, when).
- Everything is saved locally in your browser (`localStorage`) — no account, no server.
- Desktop notification when a session ends.

## Data shape

Each completed focus session is stored as a record, designed to map cleanly
onto a future Notion database:

```json
{
  "id": 1718000000000,
  "task": "Write report",
  "minutes": 25,
  "completedAt": "2026-06-09T15:00:00.000Z"
}
```

## Roadmap: Notion sync

The goal is to push each session to a Notion database so you can track how long
tasks take. Planned approach:

1. Create a Notion integration and a database with `Task` (title),
   `Minutes` (number), and `Completed At` (date) properties.
2. Add a small backend (or serverless function) that holds the Notion API token
   and exposes an endpoint to create a page — the token can't live in the
   browser safely.
3. On session completion, POST the session record to that endpoint and mark it
   `syncedToNotion: true` locally.

The session record above is already shaped for that mapping.
