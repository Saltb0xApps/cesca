import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';

// The task you're about to focus on. Persisted so the app reopens to your last
// subject. Banked pomos copy this label (see ledgerStore.bankLocal).

const KEY = 'pomoleague.currentTask.v1';

interface TaskState {
  currentTask: string;
  load: () => Promise<void>;
  setCurrentTask: (task: string) => void;
}

export const useTaskStore = create<TaskState>((set) => ({
  currentTask: '',
  load: async () => {
    try {
      const saved = await AsyncStorage.getItem(KEY);
      if (saved != null) set({ currentTask: saved });
    } catch {
      // ignore
    }
  },
  setCurrentTask: (task) => {
    set({ currentTask: task });
    void AsyncStorage.setItem(KEY, task).catch(() => {});
  },
}));
