import { create } from 'zustand';

// Active-round state lives here (Zustand). Drives the round session UI; the
// server validation path (start_round RPC / complete-round fn) layers on in the
// Supabase phase without changing this shape.

export type RoundStatus = 'idle' | 'running' | 'break' | 'completed' | 'failed';

export type FailReason = 'backgrounded' | 'abandoned' | 'timeout' | null;

interface RoundState {
  status: RoundStatus;
  roundId: string | null;
  /** Server (or local) timestamp ms the round started — source of truth for elapsed time. */
  startedAtMs: number | null;
  /** Timestamp ms the current break started. */
  breakStartedAtMs: number | null;
  chainIndex: number;
  /** Pomos banked so far in this uninterrupted session (for the break UI). */
  sessionBanked: number;
  failReason: FailReason;
  /** Cumulative ms spent backgrounded during the current round. */
  backgroundedMs: number;

  reset: () => void;
  startLocal: (roundId: string, startedAtMs: number, chainIndex: number) => void;
  startBreak: () => void;
  bankIncrement: () => void;
  markFailed: (reason: Exclude<FailReason, null>) => void;
  addBackgroundedMs: (ms: number) => void;
  setStartedAtMs: (ms: number) => void;
}

const initial = {
  status: 'idle' as RoundStatus,
  roundId: null as string | null,
  startedAtMs: null as number | null,
  breakStartedAtMs: null as number | null,
  chainIndex: 0,
  sessionBanked: 0,
  failReason: null as FailReason,
  backgroundedMs: 0,
};

export const useRoundStore = create<RoundState>((set) => ({
  ...initial,
  reset: () => set({ ...initial }),
  startLocal: (roundId, startedAtMs, chainIndex) =>
    set({
      status: 'running',
      roundId,
      startedAtMs,
      breakStartedAtMs: null,
      chainIndex,
      failReason: null,
      backgroundedMs: 0,
    }),
  startBreak: () => set({ status: 'break', breakStartedAtMs: Date.now() }),
  bankIncrement: () => set((s) => ({ sessionBanked: s.sessionBanked + 1 })),
  markFailed: (reason) => set({ status: 'failed', failReason: reason }),
  addBackgroundedMs: (ms) => set((s) => ({ backgroundedMs: s.backgroundedMs + ms })),
  setStartedAtMs: (ms) => set({ startedAtMs: ms }),
}));

// Domain constants (mirror CLAUDE.md domain rules).
export const ROUND_SECONDS = 25 * 60;
export const BREAK_SECONDS = 5 * 60;
export const BACKGROUND_GRACE_MS = 10_000;
export const DAILY_LEAGUE_CAP = 16;
export const CHAIN_CHECKIN_AFTER = 4;
