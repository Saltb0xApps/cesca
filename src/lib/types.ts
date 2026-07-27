/**
 * Core data model.
 *
 * A recording moves through a small pipeline:
 *
 *   pending → transcribing → syncing → synced
 *                    ↘︎ error (retryable at any step)
 *
 * The transcript is kept locally forever (even after syncing) so the app
 * remains useful offline and entries can be re-synced if needed.
 */

export type RecordingStatus =
  | 'pending' // saved on disk, waiting to be processed
  | 'transcribing' // uploading audio to OpenAI
  | 'syncing' // appending transcript to the Notion page
  | 'synced' // done — transcript is at the end of the Notion page
  | 'error'; // something failed; entry keeps the error message

export interface RecordingEntry {
  id: string;
  /** ISO timestamp of when the recording was made. */
  createdAt: string;
  durationMillis: number;
  /**
   * File name inside the app's `recordings/` directory (not an absolute URI —
   * on iOS the app container path changes between installs, so we resolve the
   * full path at read time).
   */
  audioFile: string;
  /** The nightly question that was shown while recording, if any. */
  question: string | null;
  transcript: string | null;
  status: RecordingStatus;
  /** Human-readable error for the `error` status. */
  error: string | null;
  archived: boolean;
  syncedAt: string | null;
}

export interface AppSettings {
  /** Raw value the user pasted (URL or ID) — kept for display/editing. */
  notionPageInput: string;
  /** Parsed + normalized page ID (dashed UUID), or null if not set/invalid. */
  notionPageId: string | null;
  reminderEnabled: boolean;
  /** Local time of the nightly reminder. */
  reminderHour: number;
  reminderMinute: number;
  /** Rotating nightly questions, one used per day. */
  questions: string[];
}

export const DEFAULT_QUESTIONS: string[] = [
  'What happened with BlackSar today?',
  'What moved forward today — and what got stuck?',
  'What decision are you chewing on tonight?',
  'What did you learn today that you don’t want to forget?',
  'What are you avoiding right now?',
];

export const DEFAULT_SETTINGS: AppSettings = {
  notionPageInput: '',
  notionPageId: null,
  reminderEnabled: true,
  reminderHour: 21,
  reminderMinute: 30,
  questions: DEFAULT_QUESTIONS,
};
