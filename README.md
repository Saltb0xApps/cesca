# WhatsApp Scheduler

Schedule WhatsApp messages to send at a specific date and time. When someone
says *"yeah, let's catch up tomorrow"*, pick the contact, write the message,
tap **Tomorrow 9am** (or open the calendar picker), and it sends itself.

## How it works

- Links to your personal WhatsApp via QR code (like WhatsApp Web), using
  [whatsapp-web.js](https://wwebjs.dev/).
- The web UI has a contact search (against your real WhatsApp contacts), a
  message box, and a calendar/time picker with one-tap shortcuts (Tomorrow
  9am, Tonight 7pm, In 1 hour, …).
- There's also a one-line mode for natural language ("send \"hey!\" to John
  next Friday at 6pm"), parsed with
  [chrono-node](https://github.com/wanasit/chrono).
- Scheduled messages are stored in `data/messages.json`, so they survive
  restarts. A background loop checks every 15 seconds and sends anything due.

## Setup

Requires Node.js 18+ (whatsapp-web.js downloads a headless Chromium on
install).

```bash
npm install
npm start
```

1. Open http://localhost:3000
2. Scan the QR code with WhatsApp (Settings → Linked Devices). The session is
   saved locally, so you only do this once.
3. Search a contact, write the message, pick the date/time (or tap a shortcut
   like **Tomorrow 9am**), and hit Schedule.

Pending messages can be cancelled from the list in the UI.

## Keeping it running 24/7

Messages are only sent while the app is running, so it needs to live on a
machine that stays on: a Raspberry Pi, an old laptop, a home server, or a
small VPS (a $5/month instance is plenty). Your own laptop works too, as long
as it isn't asleep when a message is due — anything still pending when the app
comes back up is sent on the next check.

The easiest way to keep it alive (auto-restart on crash, start on boot) is
[pm2](https://pm2.keymetrics.io/):

```bash
npm install -g pm2
pm2 start ecosystem.config.cjs   # starts the app, restarts it if it crashes
pm2 save                         # remember the process list
pm2 startup                      # prints one command to run so pm2 starts on boot
```

Useful pm2 commands: `pm2 logs whatsapp-scheduler` (see the QR code on first
run / watch sends), `pm2 status`, `pm2 restart whatsapp-scheduler`.

On Linux you can use systemd instead — create
`/etc/systemd/system/whatsapp-scheduler.service`:

```ini
[Unit]
Description=WhatsApp Scheduler
After=network-online.target

[Service]
WorkingDirectory=/path/to/cesca
ExecStart=/usr/bin/node src/index.js
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
```

then `sudo systemctl enable --now whatsapp-scheduler`.

Tip: the first time you run it under pm2/systemd, open http://localhost:3000
to scan the QR code from the browser — after that the saved session
reconnects automatically on every restart.

## API

Everything the UI does is also available over HTTP:

| Method | Path                   | Body / query                              |
|--------|------------------------|-------------------------------------------|
| GET    | `/api/status`          | connection status + QR code               |
| GET    | `/api/contacts?q=jo`   | search your WhatsApp contacts             |
| POST   | `/api/schedule`        | `{ "command": "send \"hi\" to Jo friday 6pm" }` |
| POST   | `/api/schedule/direct` | `{ "chatId", "contactName", "text", "sendAt" }` |
| GET    | `/api/messages`        | all scheduled/sent messages               |
| DELETE | `/api/messages/:id`    | cancel a pending message                  |

## Caveats

- The app must be running at send time — run it on a machine that stays on
  (a Raspberry Pi, home server, or cheap VPS works well).
- whatsapp-web.js is an unofficial library that automates WhatsApp Web.
  WhatsApp doesn't officially support this; use it with your own account and
  reasonable volumes.
