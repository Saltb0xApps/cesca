/**
 * App state: the recordings list + settings, persisted to AsyncStorage.
 * Secrets are NOT here — they live in the keychain (see `secrets.ts`).
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { deleteRecordingFile } from '@/lib/recordingFiles';
import {
  AppSettings,
  DEFAULT_SETTINGS,
  RecordingEntry,
  RecordingStatus,
} from '@/lib/types';

interface AppState {
  hydrated: boolean;
  recordings: RecordingEntry[];
  settings: AppSettings;

  addRecording: (entry: RecordingEntry) => void;
  updateRecording: (id: string, patch: Partial<RecordingEntry>) => void;
  /** Removes the entry AND its audio file on disk. The Notion copy is untouched. */
  deleteRecording: (id: string) => void;
  setArchived: (id: string, archived: boolean) => void;
  updateSettings: (patch: Partial<AppSettings>) => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      hydrated: false,
      recordings: [],
      settings: DEFAULT_SETTINGS,

      addRecording: (entry) =>
        set((s) => ({ recordings: [entry, ...s.recordings] })),

      updateRecording: (id, patch) =>
        set((s) => ({
          recordings: s.recordings.map((r) =>
            r.id === id ? { ...r, ...patch } : r,
          ),
        })),

      deleteRecording: (id) => {
        const entry = get().recordings.find((r) => r.id === id);
        if (entry) deleteRecordingFile(entry.audioFile);
        set((s) => ({ recordings: s.recordings.filter((r) => r.id !== id) }));
      },

      setArchived: (id, archived) =>
        set((s) => ({
          recordings: s.recordings.map((r) =>
            r.id === id ? { ...r, archived } : r,
          ),
        })),

      updateSettings: (patch) =>
        set((s) => ({ settings: { ...s.settings, ...patch } })),
    }),
    {
      name: 'cesca-store',
      version: 1,
      // AsyncStorage needs `window` on web; fall back to a no-op store when
      // rendered in Node (e.g. static export) so hydration can't crash.
      storage: createJSONStorage(() =>
        typeof window === 'undefined'
          ? {
              getItem: async () => null,
              setItem: async () => {},
              removeItem: async () => {},
            }
          : AsyncStorage,
      ),
      partialize: (s) => ({ recordings: s.recordings, settings: s.settings }),
      onRehydrateStorage: () => (state, error) => {
        // A kill mid-pipeline leaves stale in-flight statuses; make them
        // retryable again, then let the app boot resume them.
        useAppStore.setState((s) => ({
          hydrated: true,
          recordings: s.recordings.map((r) =>
            r.status === 'transcribing' || r.status === 'syncing'
              ? { ...r, status: 'pending' as RecordingStatus }
              : r,
          ),
          settings: { ...DEFAULT_SETTINGS, ...s.settings },
        }));
        if (error) console.warn('Store rehydration failed', error);
      },
    },
  ),
);

/** Entries that still need work (used on boot to resume the pipeline). */
export function pendingRecordingIds(): string[] {
  return useAppStore
    .getState()
    .recordings.filter((r) => r.status === 'pending' || r.status === 'error')
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
    .map((r) => r.id);
}
