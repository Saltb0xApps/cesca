import { useEffect, useRef } from 'react';
import { AppState, type AppStateStatus } from 'react-native';
import { BACKGROUND_GRACE_MS, useRoundStore } from '@/stores/roundStore';

/**
 * Foreground enforcement (CLAUDE.md domain rule #2).
 *
 * While a round is `running`, accumulate time spent outside `active`. If the
 * cumulative backgrounded time exceeds the 10s grace, the round fails.
 *
 * NOTE: Phase 0 scaffold — this wires the AppState subscription and local
 * accounting. Phase 1 adds the server `fail` event log on return and the
 * `useRound` integration.
 */
export function useAppStateGuard() {
  const leftAt = useRef<number | null>(null);

  useEffect(() => {
    const sub = AppState.addEventListener('change', (next: AppStateStatus) => {
      const { status, addBackgroundedMs, backgroundedMs, markFailed } = useRoundStore.getState();
      if (status !== 'running') return;

      if (next === 'active') {
        if (leftAt.current != null) {
          const away = Date.now() - leftAt.current;
          leftAt.current = null;
          addBackgroundedMs(away);
          if (backgroundedMs + away > BACKGROUND_GRACE_MS) {
            // TODO(Phase 1): log fail event to server immediately on return.
            markFailed('backgrounded');
          }
        }
      } else {
        // 'background' | 'inactive'
        if (leftAt.current == null) leftAt.current = Date.now();
      }
    });

    return () => sub.remove();
  }, []);
}
