# Cesca 🎙🌙

**A phone app that does exactly one thing:** every night it nudges you with a question
("What happened with BlackSar today?"), you talk, and the transcript is appended to
the very end of one specific Notion page. That's it.

- **Record** — one big button. Talk through your day.
- **Transcribe** — audio goes to OpenAI (`gpt-4o-mini-transcribe`) and comes back as text.
- **Sync** — the transcript (with date, duration, and the night's question) is appended
  to the end of your chosen Notion page. Automatically, immediately.
- **Nightly reminder** — a local notification at your chosen time, rotating through
  your own list of questions. Tapping it drops you straight into recording.
- **List / archive / delete** — every recording shows its date, status, and transcript.
  Archive to tuck it away, delete to remove it from the phone (Notion keeps its copy).

Built with [Expo](https://expo.dev) (SDK 57) + React Native + TypeScript. No backend —
the phone talks to Notion and OpenAI directly, and your keys never leave the device
(they're stored in the iOS/Android keychain).

---

## 1. One-time setup

### Notion (≈2 minutes)

1. Go to [notion.so/my-integrations](https://www.notion.so/my-integrations) →
   **New integration** (Internal). Name it e.g. `Cesca`. Copy the **Internal
   Integration Secret** (`ntn_…`).
2. In Notion, open (or create) the page that should collect your transcripts —
   e.g. a page called **Brain Time**.
3. On that page: **⋯ menu → Connections → add your `Cesca` integration.**
   (Without this step the API returns "page not found".)
4. Copy the page link (**Share → Copy link**).

### OpenAI (≈1 minute)

Create an API key at [platform.openai.com/api-keys](https://platform.openai.com/api-keys).
Transcription with `gpt-4o-mini-transcribe` costs ≈ **$0.003/minute** of audio — a
5-minute nightly dump is about half a cent.

### In the app

Open **Settings** (gear icon) → paste the integration token, the page link, and the
OpenAI key → **Test connection** → set your reminder time and edit the nightly
questions (one per line) → **Save**.

## 2. Running it on your phone

```bash
npm install
npx expo start
```

- Quick look: scan the QR code with the **Expo Go** app. Recording, transcription and
  Notion sync all work; **scheduled notifications don't fire reliably in Expo Go**
  (Android especially), so use it only for a first look.
- Real daily use — install a development build on your phone:

  ```bash
  # iPhone (needs a Mac with Xcode, phone plugged in):
  npx expo run:ios --device --configuration Release

  # Android (needs Android Studio / SDK, phone plugged in):
  npx expo run:android --variant release --device
  ```

  Or build in the cloud with [EAS](https://docs.expo.dev/build/setup/) (no local
  Xcode/Android Studio needed):

  ```bash
  npm i -g eas-cli
  eas build --profile preview --platform ios     # or android
  ```

## 3. How it behaves

- A recording moves through `pending → transcribing → syncing → synced`; every step
  and failure is visible as a status pill on the list. Anything that fails (offline,
  bad key, rate limit) is retryable from the recording's screen, and the app also
  auto-retries unfinished work every time it launches or returns to the foreground.
- Entries are appended to Notion **oldest-first**, so the page stays chronological.
- Transcripts land as: `heading (🎙 date · duration)` → `quote (the question)` →
  paragraphs. Long dumps are chunked to respect Notion's API limits.
- The nightly reminder schedules the next 14 nights individually so each notification
  carries that night's question; the window re-arms whenever the app opens.
- The night's question is also passed to the transcriber as a spelling hint, so
  project names like "BlackSar" come out right.
- Audio files stay on the phone (`Documents/recordings/`, mono 64 kbps AAC ≈
  0.5 MB/min) until you delete them. Deleting/archiving in the app never touches
  what's already in Notion.

### Platform notes

- **iOS**: recording keeps going if the screen locks (`UIBackgroundModes: audio`).
- **Android**: keep the app in the foreground while recording; notifications need a
  development build, and on some devices you may need to exempt Cesca from battery
  optimization for the 9:30 PM reminder to be punctual.

## 4. Development

```bash
npm run typecheck   # tsc --noEmit
npm test            # jest — pure logic (Notion blocks, question rotation, formats)
npm run lint        # expo lint
```

Project layout:

```
src/
  app/            expo-router screens
    index.tsx       home: tonight's question, record button, recordings list
    record.tsx      recording in progress
    recording/[id]  transcript detail: play, retry, share, archive, delete
    archive.tsx     archived recordings
    settings.tsx    Notion/OpenAI keys, reminder time, questions
  components/     small UI kit (dark theme only)
  lib/            pure logic + storage (store, notionBlocks, questions, files, secrets)
  services/       transcription (OpenAI), notion (append/test), sync pipeline, reminders
```

The app icon is still the Expo template placeholder — swap the images in
`assets/images/` (and `assets/expo.icon/`) when you feel like branding it.
