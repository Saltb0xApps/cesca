import { create } from 'zustand';

// Active-round state lives here (Zustand). The real state machine is wired in
// Phase 1 via useRound.ts; this is the shared shape it drives.

export type RoundStatus = 'idle' | 'running' | 'break' | 'completed' | 'failed';

export type FailReason = 'backgrounded' | 'abandoned' | 'timeout' | null;

interface RoundState {
  status: RoundStatus;
  roundId: string | null;
  /** Server timestamp (ms since epoch) the round started — source of truth for elapsed time. */
  startedAtMs: number | null;
  chainIndex: number;
  failReason: FailReason;
  /** Cumulative ms spent backgrounded during the current round. */
  backgroundedMs: number;

  reset: () => void;
  setStatus: (status: RoundStatus) => void;
  startLocal: (roundId: string, startedAtMs: number, chainIndex: number) => void;
  markFailed: (reason: Exclude<FailReason, null>) => void;
  addBackgroundedMs: (ms: number) => void;
}

const initial = {
  status: 'idle' as RoundStatus,
  roundId: null,
  startedAtMs: null,
  chainIndex: 0,
  failReason: null as FailReason,
  backgroundedMs: 0,
};

export const useRoundStore = create<RoundState>((set) => ({
  ...initial,
  reset: () => set({ ...initial }),
  setStatus: (status) => set({ status }),
  startLocal: (roundId, startedAtMs, chainIndex) =>
    set({ status: 'running', roundId, startedAtMs, chainIndex, failReason: null, backgroundedMs: 0 }),
  markFailed: (reason) => set({ status: 'failed', failReason: reason }),
  addBackgroundedMs: (ms) => set((s) => ({ backgroundedMs: s.backgroundedMs + ms })),
}));

// Domain constants (mirror CLAUDE.md domain rules).
export const ROUND_SECONDS = 25 * 60;
export const BREAK_SECONDS = 5 * 60;
export const BACKGROUND_GRACE_MS = 10_000;
export const DAILY_LEAGUE_CAP = 16;
export const CHAIN_CHECKIN_AFTER = 4;
