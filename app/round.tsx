import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useKeepAwake } from 'expo-keep-awake';
import { useRound } from '@/hooks/useRound';
import { useAppStateGuard } from '@/hooks/useAppStateGuard';
import { ROUND_SECONDS } from '@/stores/roundStore';
import { colors } from '@/theme';

// Phase 1 builds the full state machine (break/failed/chaining/server validation).
// This scaffold wires keep-awake, the foreground guard, and a working local
// countdown so the round shell is real and navigable.
export default function RoundScreen() {
  const router = useRouter();
  const round = useRound();
  useKeepAwake();
  useAppStateGuard();

  const [, force] = useState(0);

  useEffect(() => {
    round.startRound(0);
    const id = setInterval(() => force((n) => n + 1), 1000);
    return () => {
      clearInterval(id);
      round.reset();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const remaining = round.remainingSeconds();
  const failed = round.status === 'failed';

  const close = () => {
    round.reset();
    router.back();
  };

  if (failed) {
    return (
      <View style={[styles.container, styles.fail]}>
        <Text style={styles.failEmoji}>💔</Text>
        <Text style={styles.failTitle}>Round lost</Text>
        <Text style={styles.failBody}>Your phone left the app. A dead round banks nothing.</Text>
        <Pressable style={styles.restart} onPress={() => round.startRound(0)}>
          <Text style={styles.restartText}>Restart round</Text>
        </Pressable>
        <Pressable onPress={close}>
          <Text style={styles.exit}>Back to home</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.label}>FOCUS</Text>
      <Text style={styles.timer}>{format(remaining)}</Text>
      <Text style={styles.warn}>Leave the app and you lose the round.</Text>

      {remaining === 0 ? (
        <Pressable style={styles.done} onPress={() => round.completeRound().then(close)}>
          <Text style={styles.doneText}>Bank this pomo 🍅</Text>
        </Pressable>
      ) : (
        <Pressable style={styles.give} onPress={close}>
          <Text style={styles.giveText}>Give up</Text>
        </Pressable>
      )}
    </View>
  );
}

function format(total: number) {
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
  label: { color: '#ffffff99', fontSize: 16, fontWeight: '800', letterSpacing: 4 },
  timer: { color: '#fff', fontSize: 88, fontWeight: '200', fontVariant: ['tabular-nums'] },
  warn: { color: '#ffffff88', fontSize: 14 },
  give: { marginTop: 30, padding: 12 },
  giveText: { color: '#ffffff88', fontSize: 15 },
  done: {
    marginTop: 30,
    backgroundColor: colors.tomato,
    paddingHorizontal: 28,
    paddingVertical: 16,
    borderRadius: 14,
  },
  doneText: { color: '#fff', fontSize: 18, fontWeight: '800' },
  fail: { backgroundColor: colors.tomatoDark },
  failEmoji: { fontSize: 64 },
  failTitle: { color: '#fff', fontSize: 28, fontWeight: '800' },
  failBody: { color: '#ffffffcc', fontSize: 15, textAlign: 'center' },
  restart: {
    marginTop: 20,
    backgroundColor: '#fff',
    paddingHorizontal: 28,
    paddingVertical: 16,
    borderRadius: 14,
  },
  restartText: { color: colors.tomatoDark, fontSize: 17, fontWeight: '800' },
  exit: { color: '#ffffffcc', marginTop: 14 },
});

// Keep ROUND_SECONDS referenced for the real Phase 1 wiring.
void ROUND_SECONDS;
