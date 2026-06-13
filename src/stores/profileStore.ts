import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Local player profile (name, avatar, exam tag) + first-run flag. Persists in
// demo mode so onboarding actually flows through to Profile and the recap card.
// When Supabase is wired, this mirrors the `profiles` row.

const KEY = 'pomoleague.profile.v1';

interface Profile {
  displayName: string;
  avatar: string;
  examTag: string;
  seenRules: boolean;
}

interface ProfileState extends Profile {
  loaded: boolean;
  load: () => Promise<void>;
  save: (patch: Partial<Profile>) => Promise<void>;
}

const DEFAULTS: Profile = {
  displayName: '',
  avatar: '🍅',
  examTag: '',
  seenRules: false,
};

export const useProfileStore = create<ProfileState>((set, get) => ({
  ...DEFAULTS,
  loaded: false,
  load: async () => {
    try {
      const raw = await AsyncStorage.getItem(KEY);
      const saved = raw ? (JSON.parse(raw) as Partial<Profile>) : {};
      set({ ...DEFAULTS, ...saved, loaded: true });
    } catch {
      set({ loaded: true });
    }
  },
  save: async (patch) => {
    const next = {
      displayName: get().displayName,
      avatar: get().avatar,
      examTag: get().examTag,
      seenRules: get().seenRules,
      ...patch,
    };
    set(next);
    try {
      await AsyncStorage.setItem(KEY, JSON.stringify(next));
    } catch {
      // best-effort
    }
  },
}));
