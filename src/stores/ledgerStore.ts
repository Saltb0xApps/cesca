import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Local pomo ledger. In demo / offline use this is the source of truth for
// stats. Once Supabase + the complete-round edge function are wired, banking
// becomes server-authoritative and this acts as a cache.

const KEY = 'pomoleague.pomos.v1';

export interface Pomo {
  id: string;
  completedAt: string; // ISO
  chainIndex: number;
  task?: string; // what you were working on
}

export const POMO_MINUTES = 25;

interface LedgerState {
  pomos: Pomo[];
  loaded: boolean;
  load: () => Promise<void>;
  bankLocal: (chainIndex: number, task?: string) => Promise<void>;
  clear: () => Promise<void>;
}

export const useLedgerStore = create<LedgerState>((set, get) => ({
  pomos: [],
  loaded: false,
  load: async () => {
    try {
      const raw = await AsyncStorage.getItem(KEY);
      const pomos = raw ? (JSON.parse(raw) as Pomo[]) : [];
      set({ pomos, loaded: true });
    } catch {
      set({ loaded: true });
    }
  },
  bankLocal: async (chainIndex, task) => {
    const trimmed = task?.trim();
    const pomo: Pomo = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      completedAt: new Date().toISOString(),
      chainIndex,
      ...(trimmed ? { task: trimmed } : {}),
    };
    const pomos = [pomo, ...get().pomos];
    set({ pomos });
    try {
      await AsyncStorage.setItem(KEY, JSON.stringify(pomos));
    } catch {
      // best-effort; in-memory state still reflects the bank
    }
  },
  clear: async () => {
    set({ pomos: [] });
    try {
      await AsyncStorage.removeItem(KEY);
    } catch {
      // ignore
    }
  },
}));

// ---- Derived stats ---------------------------------------------------------

export interface Stats {
  total: number;
  today: number;
  week: number;
  streak: number;
  freezes: number;
  bestDay: number;
  longestChain: number;
}

function dayKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(
    d.getDate(),
  ).padStart(2, '0')}`;
}

function startOfWeek(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  const mondayIndex = (x.getDay() + 6) % 7; // Mon=0 … Sun=6
  x.setDate(x.getDate() - mondayIndex);
  return x;
}

export function computeStats(pomos: Pomo[]): Stats {
  const now = new Date();
  const todayK = dayKey(now);
  const weekStartMs = startOfWeek(now).getTime();

  const byDay = new Map<string, number>();
  let bestDay = 0;
  let longestChain = 0;
  let week = 0;

  for (const p of pomos) {
    const d = new Date(p.completedAt);
    const k = dayKey(d);
    const c = (byDay.get(k) ?? 0) + 1;
    byDay.set(k, c);
    if (c > bestDay) bestDay = c;
    if (p.chainIndex + 1 > longestChain) longestChain = p.chainIndex + 1;
    if (d.getTime() >= weekStartMs) week += 1;
  }

  const today = byDay.get(todayK) ?? 0;

  // Streak = consecutive local days with >=1 pomo, ending today (or yesterday
  // if nothing yet today, so a live streak isn't shown broken before you study).
  let streak = 0;
  const cursor = new Date(now);
  cursor.setHours(0, 0, 0, 0);
  if (!byDay.has(dayKey(cursor))) {
    cursor.setDate(cursor.getDate() - 1);
  }
  while (byDay.has(dayKey(cursor))) {
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }

  const freezes = Math.min(2, Math.floor(streak / 7));

  return { total: pomos.length, today, week, streak, freezes, bestDay, longestChain };
}

export interface Subject {
  task: string;
  count: number;
  minutes: number;
}

/** Pomos grouped by task, most-focused first. Untagged pomos roll into "General". */
export function subjectBreakdown(pomos: Pomo[]): Subject[] {
  const byTask = new Map<string, number>();
  for (const p of pomos) {
    const key = p.task && p.task.length > 0 ? p.task : 'General';
    byTask.set(key, (byTask.get(key) ?? 0) + 1);
  }
  return [...byTask.entries()]
    .map(([task, count]) => ({ task, count, minutes: count * POMO_MINUTES }))
    .sort((a, b) => b.count - a.count);
}

export function formatMinutes(mins: number): string {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

/** Unique recent task names (most recent first), for quick re-selection. */
export function recentTasks(pomos: Pomo[], limit = 6): string[] {
  const seen: string[] = [];
  for (const p of pomos) {
    if (p.task && !seen.includes(p.task)) seen.push(p.task);
    if (seen.length >= limit) break;
  }
  return seen;
}
