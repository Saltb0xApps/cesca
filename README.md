# Message Scheduler

Schedule WhatsApp, LinkedIn, and Instagram messages to send at a specific
date and time. When someone says *"yeah, let's catch up tomorrow"*, pick the
platform and contact, write the message, tap **Tomorrow 9am** (or open the
calendar picker), and it sends itself.

## How it works

- **WhatsApp** — links to your personal account via QR code (like WhatsApp
  Web), using [whatsapp-web.js](https://wwebjs.dev/). Contacts are searched
  by name.
- **LinkedIn** — connects with your `li_at` browser cookie and sends via
  LinkedIn's internal (Voyager) API. Contacts are resolved from a profile URL
  (`linkedin.com/in/whoever`).
- **Instagram** — logs in with your username/password using
  [instagram-private-api](https://github.com/dilame/instagram-private-api) and
  sends DMs. Contacts are found by @username.
- The web UI has a platform picker, contact search, a message box, and a
  calendar/time picker with one-tap shortcuts (Tomorrow 9am, Tonight 7pm,
  In 1 hour, …).
- There's also a one-line mode for natural language ("send \"congrats!\" to
  John on linkedin next Friday at 6pm"), parsed with
  [chrono-node](https://github.com/wanasit/chrono). It defaults to WhatsApp;
  add "on linkedin" / "on instagram" to switch.
- Scheduled messages are stored in `data/messages.json`, so they survive
  restarts. A background loop checks every 15 seconds and sends anything due.
  If a platform is disconnected when a message comes due, it stays pending
  and goes out once the connection is back.

## Setup

Requires Node.js 18+ (whatsapp-web.js downloads a headless Chromium on
install).

```bash
npm install
npm start
```

1. Open http://localhost:3000
2. Connect the platforms you want (Connections card at the bottom):
   - **WhatsApp**: scan the QR code (Settings → Linked Devices).
   - **LinkedIn**: open linkedin.com logged in → DevTools (F12) →
     Application → Cookies → copy the `li_at` value and paste it in.
   - **Instagram**: enter your username and password. If Instagram flags the
     login, approve it from the app and retry. (2FA accounts aren't
     supported yet.)
   Each session is saved locally in `data/`, so this is a one-time step.
3. Pick the platform, search a contact, write the message, pick the date/time
   (or tap a shortcut like **Tomorrow 9am**), and hit Schedule.

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

| Method | Path                              | Body / query                              |
|--------|-----------------------------------|-------------------------------------------|
| GET    | `/api/status`                     | per-platform connection status + WhatsApp QR |
| POST   | `/api/connect/linkedin`           | `{ "liAt": "<cookie value>" }`            |
| POST   | `/api/connect/instagram`          | `{ "username", "password" }`              |
| GET    | `/api/contacts?provider=whatsapp&q=jo` | search contacts on a platform        |
| POST   | `/api/schedule`                   | `{ "command": "send \"hi\" to Jo on linkedin friday 6pm" }` |
| POST   | `/api/schedule/direct`            | `{ "provider", "chatId", "contactName", "text", "sendAt" }` |
| GET    | `/api/messages`                   | all scheduled/sent messages               |
| DELETE | `/api/messages/:id`               | cancel a pending message                  |

## Caveats

- The app must be running at send time — run it on a machine that stays on
  (a Raspberry Pi, home server, or cheap VPS works well).
- **All three platforms use unofficial APIs.** None of WhatsApp, LinkedIn, or
  Instagram offers an official API for personal messaging, so this app
  automates them the way third-party clients do. They can break when the
  platforms change things, and heavy or bot-like usage can get an account
  rate-limited or restricted — LinkedIn and Instagram are notably stricter
  than WhatsApp. Use your own account, at human volumes (a few scheduled
  messages a day is the intended use, not bulk outreach).
- Credentials are stored locally in `data/` (LinkedIn cookie, Instagram
  session, WhatsApp session) in plain files. Keep that directory private and
  don't run the app on a shared/public machine.
- Instagram accounts with two-factor auth aren't supported yet.
