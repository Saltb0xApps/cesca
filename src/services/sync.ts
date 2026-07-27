/**
 * The pipeline: recording → transcript → Notion, updating store status along
 * the way. Runs fire-and-forget from the UI; every failure is stored on the
 * entry and retryable.
 */
import { formatDayTime, formatDuration } from '@/lib/format';
import { loadSecrets } from '@/lib/secrets';
import { pendingRecordingIds, useAppStore } from '@/lib/store';
import { recordingExists, uriForRecording } from '@/lib/recordingFiles';
import { KIND_META } from '@/lib/types';
import { appendTranscriptToNotion } from '@/services/notion';
import { transcribeAudio } from '@/services/transcription';

const inFlight = new Set<string>();

function messageOf(e: unknown): string {
  return e instanceof Error ? e.message : String(e);
}

/**
 * Run whatever steps an entry still needs. Safe to call repeatedly — entries
 * already being processed or already synced are skipped.
 */
export async function processRecording(id: string): Promise<void> {
  if (inFlight.has(id)) return;
  inFlight.add(id);
  try {
    await runPipeline(id);
  } finally {
    inFlight.delete(id);
  }
}

async function runPipeline(id: string): Promise<void> {
  const { updateRecording } = useAppStore.getState();
  const entry = useAppStore.getState().recordings.find((r) => r.id === id);
  if (!entry || entry.status === 'synced') return;

  const secrets = await loadSecrets();

  try {
    // Step 1 — transcribe (skipped if we already have a transcript).
    let transcript = entry.transcript;
    if (!transcript) {
      if (!secrets.openaiKey) {
        throw new Error('Add your OpenAI API key in Settings to transcribe.');
      }
      if (!recordingExists(entry.audioFile)) {
        throw new Error('Audio file is missing from this device.');
      }
      updateRecording(id, { status: 'transcribing', error: null });
      transcript = await transcribeAudio({
        fileUri: uriForRecording(entry.audioFile),
        apiKey: secrets.openaiKey,
        prompt: entry.question,
      });
      updateRecording(id, { transcript });
    }

    // "Just for me" recordings stop here — transcribed, never synced.
    if (entry.kind === 'local') {
      updateRecording(id, { status: 'synced', error: null });
      return;
    }

    // Step 2 — append to the very end of the right Notion page.
    const { settings } = useAppStore.getState();
    if (!secrets.notionToken) {
      throw new Error('Connect Notion in Settings to sync this transcript.');
    }
    const pageId =
      entry.kind === 'knowledge' ? settings.knowledgePageId : settings.notionPageId;
    if (!pageId) {
      throw new Error(
        entry.kind === 'knowledge'
          ? 'Add a Knowledge page link in Settings to sync knowledge notes.'
          : 'Add your Braindump page link in Settings to sync this transcript.',
      );
    }
    updateRecording(id, { status: 'syncing', error: null });
    await appendTranscriptToNotion({
      token: secrets.notionToken,
      pageId,
      input: {
        dateLine: formatDayTime(entry.createdAt),
        durationLine:
          entry.durationMillis > 0 ? formatDuration(entry.durationMillis) : null,
        question: entry.question,
        transcript,
        icon: KIND_META[entry.kind].notionIcon,
      },
    });
    updateRecording(id, {
      status: 'synced',
      error: null,
      syncedAt: new Date().toISOString(),
    });
  } catch (e) {
    updateRecording(id, { status: 'error', error: messageOf(e) });
  }
}

/**
 * Resume unfinished work (called on app launch / foreground). Sequential and
 * oldest-first so entries land on the Notion page in chronological order.
 */
export async function processPending(): Promise<void> {
  for (const id of pendingRecordingIds()) {
    await processRecording(id);
  }
}
