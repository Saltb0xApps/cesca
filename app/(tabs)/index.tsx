import { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { computeStats, useLedgerStore } from '@/stores/ledgerStore';
import { useProfileStore } from '@/stores/profileStore';
import { colors } from '@/theme';

export default function Home() {
  const router = useRouter();
  const pomos = useLedgerStore((s) => s.pomos);
  const stats = useMemo(() => computeStats(pomos), [pomos]);
  const seenRules = useProfileStore((s) => s.seenRules);

  const startRound = () => router.push(seenRules ? '/round' : '/rules');

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <View>
          <Text style={styles.hi}>Today</Text>
          <Text style={styles.streak}>🔥 {stats.streak} day streak</Text>
        </View>
        <View style={styles.freezes}>
          <Text style={styles.freezeText}>❄️ {stats.freezes}</Text>
        </View>
      </View>

      <View style={styles.statsRow}>
        <Stat value={stats.today} label="pomos today" />
        <Stat value={stats.week} label="this week" />
      </View>

      <View style={styles.center}>
        <Pressable style={styles.start} onPress={startRound}>
          <Text style={styles.startTomato}>🍅</Text>
          <Text style={styles.startText}>START A ROUND</Text>
          <Text style={styles.startSub}>25 min · stay in the app</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

function Stat({ value, label }: { value: number; label: string }) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
  },
  hi: { fontSize: 14, color: colors.subtle, fontWeight: '700' },
  streak: { fontSize: 22, color: colors.ink, fontWeight: '800' },
  freezes: {
    backgroundColor: colors.card,
    borderColor: colors.line,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  freezeText: { fontSize: 16, fontWeight: '700', color: colors.ink },
  statsRow: { flexDirection: 'row', gap: 12, paddingHorizontal: 20 },
  stat: {
    flex: 1,
    backgroundColor: colors.card,
    borderColor: colors.line,
    borderWidth: 1,
    borderRadius: 14,
    padding: 16,
    alignItems: 'center',
  },
  statValue: { fontSize: 28, fontWeight: '800', color: colors.ink },
  statLabel: { fontSize: 12, color: colors.subtle },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  start: {
    backgroundColor: colors.tomato,
    width: 240,
    height: 240,
    borderRadius: 120,
    alignItems: 'center',
    justifyContent: 'center',
  },
  startTomato: { fontSize: 52 },
  startText: { color: '#fff', fontSize: 20, fontWeight: '800', marginTop: 6 },
  startSub: { color: '#ffffffcc', fontSize: 13, marginTop: 4 },
});
