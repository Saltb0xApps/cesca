import { useCallback } from 'react';
import { ROUND_SECONDS, useRoundStore } from '@/stores/roundStore';
// import { supabase } from '@/lib/supabase';

/**
 * THE critical file (CLAUDE.md). Round state machine:
 *   idle → running → (break | failed | completed)
 *
 * Driven by the server `started_at`, never a local stopwatch, so it survives
 * app suspension. Phase 0 ships the interface + store wiring; Phase 1 fills in
 * the `start_round` RPC and `complete-round` edge function calls.
 */
export function useRound() {
  const store = useRoundStore();

  const startRound = useCallback(async (chainIndex = 0) => {
    // TODO(Phase 1): const { data } = await supabase.rpc('start_round', { chain_index: chainIndex });
    // Use the server timestamp it returns as startedAtMs.
    const now = Date.now();
    const fakeId = `local-${now}`;
    store.startLocal(fakeId, now, chainIndex);
  }, [store]);

  const elapsedSeconds = useCallback(() => {
    if (store.startedAtMs == null) return 0;
    return Math.floor((Date.now() - store.startedAtMs) / 1000);
  }, [store.startedAtMs]);

  const remainingSeconds = useCallback(
    () => Math.max(0, ROUND_SECONDS - elapsedSeconds()),
    [elapsedSeconds],
  );

  const completeRound = useCallback(async () => {
    // TODO(Phase 1): await supabase.functions.invoke('complete-round', { body: { roundId } });
    store.setStatus('break');
  }, [store]);

  const abandon = useCallback(async () => {
    store.markFailed('abandoned');
  }, [store]);

  return {
    status: store.status,
    chainIndex: store.chainIndex,
    failReason: store.failReason,
    startRound,
    completeRound,
    abandon,
    elapsedSeconds,
    remainingSeconds,
    reset: store.reset,
  };
}
