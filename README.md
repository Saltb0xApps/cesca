# WhatsApp Scheduler

Schedule WhatsApp messages in plain English. When someone says *"yeah, let's
catch up Friday"*, type:

```
send "hey! still on for today?" to John next Friday at 6pm
```

…and the message is sent to that contact at exactly that date and time.

## How it works

- Links to your personal WhatsApp via QR code (like WhatsApp Web), using
  [whatsapp-web.js](https://wwebjs.dev/).
- Natural-language dates ("tomorrow 9am", "next Friday at 6pm", "June 20 at
  noon") are parsed with [chrono-node](https://github.com/wanasit/chrono).
- Contacts are matched by name against your real WhatsApp contacts.
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
3. Type a command like `send "running late, sorry!" to Maria tomorrow 9am`
   and hit Schedule.

If no time is given (just "Friday"), it defaults to 9am. Pending messages can
be cancelled from the list in the UI.

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
