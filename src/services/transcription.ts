/**
 * Speech-to-text via OpenAI's transcription endpoint.
 * The audio file is uploaded as multipart form data straight from disk.
 */
import { fetchWithTimeout } from '@/lib/http';

export const TRANSCRIPTION_MODEL = 'gpt-4o-mini-transcribe';
const ENDPOINT = 'https://api.openai.com/v1/audio/transcriptions';
/** Long recordings on slow uplinks need generous room. */
const TIMEOUT_MS = 3 * 60 * 1000;

export async function transcribeAudio(options: {
  fileUri: string;
  apiKey: string;
  /**
   * Optional context to bias spelling (we pass the night's question so
   * project names like "BlackSar" come out right).
   */
  prompt?: string | null;
}): Promise<string> {
  const form = new FormData();
  // React Native's FormData takes a { uri, name, type } descriptor for files.
  form.append('file', {
    uri: options.fileUri,
    name: 'recording.m4a',
    type: 'audio/m4a',
  } as unknown as Blob);
  form.append('model', TRANSCRIPTION_MODEL);
  form.append('response_format', 'json');
  if (options.prompt) form.append('prompt', options.prompt);

  const res = await fetchWithTimeout(
    ENDPOINT,
    {
      method: 'POST',
      headers: { Authorization: `Bearer ${options.apiKey}` },
      body: form,
    },
    TIMEOUT_MS,
  );

  if (!res.ok) {
    throw new Error(await describeOpenAiError(res));
  }

  const data = (await res.json()) as { text?: string };
  const text = (data.text ?? '').trim();
  if (!text) {
    throw new Error('Transcription came back empty — was the recording silent?');
  }
  return text;
}

async function describeOpenAiError(res: Response): Promise<string> {
  let detail = '';
  try {
    const body = (await res.json()) as { error?: { message?: string } };
    detail = body.error?.message ?? '';
  } catch {
    // Non-JSON error body; fall through to status-based messages.
  }
  if (res.status === 401) {
    return 'OpenAI rejected the API key — double-check it in Settings.';
  }
  if (res.status === 413) {
    return 'Recording is too large for transcription (25 MB limit).';
  }
  if (res.status === 429) {
    return `OpenAI rate limit/quota hit${detail ? `: ${detail}` : ''} — try again in a bit.`;
  }
  return `Transcription failed (HTTP ${res.status})${detail ? `: ${detail}` : ''}`;
}
