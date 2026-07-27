# Cesca — agent notes

Nightly voice-note app: record → transcribe via OpenAI → append to the end of a
Notion page. Recordings have a kind (`braindump` → braindump page, `knowledge` →
knowledge page, `local` → transcribed but never synced); kind is user-editable
until `syncedAt` is set. Expo SDK 57, React Native 0.86, TypeScript strict,
expo-router with `src/app` routes. No backend; Notion/OpenAI are called directly
from the device.

Expo's APIs change between SDK majors — check the installed typings in
`node_modules/<pkg>/build/*.d.ts` (or https://docs.expo.dev/versions/v57.0.0/)
before using an unfamiliar API, and don't trust memory of older SDKs.

## Commands

- `npm run typecheck` — tsc, strict; must stay clean
- `npm test` — jest (pure logic only: `src/lib/__tests__`)
- `npm run lint` — expo lint (React Compiler rules are enabled; e.g. no
  `useRef(...).current` during render)
- `npx expo start` — dev server

## Architecture rules

- `src/lib/notionBlocks.ts`, `questions.ts`, `format.ts` are **pure** (no RN
  imports) so they stay unit-testable — keep them that way.
- Secrets (Notion token, OpenAI key) only ever touch `expo-secure-store`
  (`src/lib/secrets.ts`); never put them in the zustand store, AsyncStorage, or
  the repo.
- Recordings persist only their **file name**; absolute URIs are resolved in
  `src/lib/recordingFiles.ts` (iOS container paths change between installs).
- All pipeline state changes go through `src/services/sync.ts` so statuses and
  retries stay consistent; append order to Notion must remain oldest-first.
- One dark theme, tokens in `src/lib/theme.ts`.
