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
  const dailyGoal = useProfileStore((s) => s.dailyGoal);

  const startRound = () => router.push(seenRules ? '/round' : '/rules');

  const goalPct = dailyGoal > 0 ? Math.min(1, stats.today / dailyGoal) : 0;
  const hitGoal = stats.today >= dailyGoal;

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

      {/* daily goal */}
      <View style={styles.goalCard}>
        <View style={styles.goalTop}>
          <Text style={styles.goalTitle}>{hitGoal ? 'Goal smashed 🎉' : "Today's goal"}</Text>
          <Text style={styles.goalNums}>
            {stats.today} / {dailyGoal}
          </Text>
        </View>
        <View style={styles.barTrack}>
          <View style={[styles.barFill, { width: `${goalPct * 100}%` }]} />
        </View>
        <Text style={styles.goalHint}>
          {hitGoal
            ? 'Keep going — every pomo still counts.'
            : `${dailyGoal - stats.today} more to hit your goal. Change it in Profile.`}
        </Text>
      </View>

      <View style={styles.statsRow}>
        <Stat value={stats.week} label="this week" />
        <Stat value={stats.total} label="all-time" />
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
  goalCard: {
    marginHorizontal: 20,
    backgroundColor: colors.card,
    borderColor: colors.line,
    borderWidth: 1,
    borderRadius: 16,
    padding: 16,
    gap: 8,
  },
  goalTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  goalTitle: { fontWeight: '800', color: colors.ink, fontSize: 16 },
  goalNums: { fontWeight: '800', color: colors.tomato, fontSize: 16 },
  barTrack: { height: 12, borderRadius: 6, backgroundColor: colors.line, overflow: 'hidden' },
  barFill: { height: 12, borderRadius: 6, backgroundColor: colors.tomato },
  goalHint: { fontSize: 12, color: colors.subtle },
  statsRow: { flexDirection: 'row', gap: 12, paddingHorizontal: 20, marginTop: 12 },
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
    width: 220,
    height: 220,
    borderRadius: 110,
    alignItems: 'center',
    justifyContent: 'center',
  },
  startTomato: { fontSize: 48 },
  startText: { color: '#fff', fontSize: 20, fontWeight: '800', marginTop: 6 },
  startSub: { color: '#ffffffcc', fontSize: 13, marginTop: 4 },
});
