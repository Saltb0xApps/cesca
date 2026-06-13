import { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useKeepAwake } from 'expo-keep-awake';
import { useAppStateGuard } from '@/hooks/useAppStateGuard';
import {
  BREAK_SECONDS,
  CHAIN_CHECKIN_AFTER,
  ROUND_SECONDS,
  useRoundStore,
} from '@/stores/roundStore';
import { useLedgerStore } from '@/stores/ledgerStore';
import { colors } from '@/theme';

export default function RoundScreen() {
  const router = useRouter();
  useKeepAwake();
  useAppStateGuard();

  const store = useRoundStore();
  const bankLocal = useLedgerStore((s) => s.bankLocal);

  const [, force] = useState(0);
  const [confirmChain, setConfirmChain] = useState(false);
  const bankedRef = useRef<string | null>(null);

  const beginRound = (idx: number) => {
    bankedRef.current = null;
    setConfirmChain(false);
    useRoundStore.getState().startLocal(`local-${Date.now()}`, Date.now(), idx);
  };

  // Start the first round on mount; tick every 250ms and detect completion.
  useEffect(() => {
    beginRound(0);
    const id = setInterval(() => {
      const s = useRoundStore.getState();
      if (s.status === 'running' && s.startedAtMs != null) {
        const remaining = ROUND_SECONDS - (Date.now() - s.startedAtMs) / 1000;
        if (remaining <= 0 && bankedRef.current !== s.roundId) {
          bankedRef.current = s.roundId;
          void bankLocal(s.chainIndex); // TODO(supabase): call complete-round fn instead
          s.bankIncrement();
          s.startBreak();
        }
      }
      force((n) => n + 1);
    }, 250);
    return () => {
      clearInterval(id);
      useRoundStore.getState().reset();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const endSession = () => {
    useRoundStore.getState().reset();
    router.back();
  };

  // ---- Failed -------------------------------------------------------------
  if (store.status === 'failed') {
    const reason =
      store.failReason === 'abandoned'
        ? 'You ended the round early.'
        : 'Your phone left the app. A dead round banks nothing.';
    return (
      <View style={[styles.container, styles.fail]}>
        <Text style={styles.bigEmoji}>💔</Text>
        <Text style={styles.failTitle}>Round lost</Text>
        <Text style={styles.failBody}>{reason}</Text>
        {store.sessionBanked > 0 && (
          <Text style={styles.failBody}>
            You still keep {store.sessionBanked} pomo{store.sessionBanked === 1 ? '' : 's'} from
            this session.
          </Text>
        )}
        <Pressable style={styles.lightBtn} onPress={() => beginRound(0)}>
          <Text style={styles.lightBtnText}>Restart round</Text>
        </Pressable>
        <Pressable onPress={endSession}>
          <Text style={styles.exit}>Back to home</Text>
        </Pressable>
      </View>
    );
  }

  // ---- Break --------------------------------------------------------------
  if (store.status === 'break') {
    const breakRemaining = Math.max(
      0,
      Math.ceil(BREAK_SECONDS - (Date.now() - (store.breakStartedAtMs ?? Date.now())) / 1000),
    );
    const nextIndex = store.chainIndex + 1;
    const needsCheckin = nextIndex >= CHAIN_CHECKIN_AFTER;

    return (
      <View style={[styles.container, styles.break]}>
        <Text style={styles.label}>BREAK</Text>
        <Text style={styles.timer}>{format(breakRemaining)}</Text>
        <Text style={styles.banked}>
          🍅 {store.sessionBanked} banked this session
        </Text>

        {needsCheckin && confirmChain ? (
          <Pressable style={styles.primary} onPress={() => beginRound(nextIndex)}>
            <Text style={styles.primaryText}>I&apos;m still here — go</Text>
          </Pressable>
        ) : (
          <Pressable
            style={styles.primary}
            onPress={() => (needsCheckin ? setConfirmChain(true) : beginRound(nextIndex))}
          >
            <Text style={styles.primaryText}>
              {needsCheckin ? 'Chain again (check-in)' : 'Chain next round'}
            </Text>
          </Pressable>
        )}

        <Pressable style={styles.lightBtn} onPress={endSession}>
          <Text style={styles.lightBtnText}>End session</Text>
        </Pressable>
      </View>
    );
  }

  // ---- Running ------------------------------------------------------------
  const elapsed = store.startedAtMs != null ? (Date.now() - store.startedAtMs) / 1000 : 0;
  const remaining = Math.max(0, Math.ceil(ROUND_SECONDS - elapsed));

  return (
    <View style={styles.container}>
      <Text style={styles.label}>FOCUS{store.chainIndex > 0 ? ` · round ${store.chainIndex + 1}` : ''}</Text>
      <Text style={styles.timer}>{format(remaining)}</Text>
      <Text style={styles.warn}>Leave the app and you lose the round.</Text>

      <Pressable
        style={styles.give}
        delayLongPress={700}
        onLongPress={() => useRoundStore.getState().markFailed('abandoned')}
      >
        <Text style={styles.giveText}>Hold to give up</Text>
      </Pressable>

      {__DEV__ && (
        <Pressable
          style={styles.dev}
          onPress={() =>
            useRoundStore.getState().setStartedAtMs(Date.now() - (ROUND_SECONDS - 2) * 1000)
          }
        >
          <Text style={styles.devText}>⏩ dev: skip to end</Text>
        </Pressable>
      )}
    </View>
  );
}

function format(total: number): string {
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.ink,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
    padding: 24,
  },
  break: { backgroundColor: '#16432b' },
  fail: { backgroundColor: colors.tomatoDark },
  label: { color: '#ffffff99', fontSize: 16, fontWeight: '800', letterSpacing: 3 },
  timer: { color: '#fff', fontSize: 84, fontWeight: '200', fontVariant: ['tabular-nums'] },
  warn: { color: '#ffffff88', fontSize: 14 },
  banked: { color: '#ffffffcc', fontSize: 16, fontWeight: '700' },
  give: { marginTop: 30, padding: 14 },
  giveText: { color: '#ffffff88', fontSize: 15 },
  dev: { marginTop: 6, padding: 8 },
  devText: { color: '#ffffff55', fontSize: 13 },
  primary: {
    marginTop: 20,
    backgroundColor: '#fff',
    paddingHorizontal: 28,
    paddingVertical: 16,
    borderRadius: 14,
  },
  primaryText: { color: colors.ink, fontSize: 18, fontWeight: '800' },
  lightBtn: { marginTop: 12, padding: 14 },
  lightBtnText: { color: '#ffffffcc', fontSize: 16, fontWeight: '700' },
  bigEmoji: { fontSize: 64 },
  failTitle: { color: '#fff', fontSize: 28, fontWeight: '800' },
  failBody: { color: '#ffffffcc', fontSize: 15, textAlign: 'center' },
  exit: { color: '#ffffffcc', marginTop: 14 },
});
