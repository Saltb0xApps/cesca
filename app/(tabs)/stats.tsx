import { useMemo } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  computeStats,
  formatMinutes,
  subjectBreakdown,
  useLedgerStore,
} from '@/stores/ledgerStore';
import { Heatmap } from '@/components/Heatmap';
import { TIER_NAMES, pomosToNextTier, tierIndexFor } from '@/lib/tiers';
import { colors } from '@/theme';

const TIER_COLORS = ['#A97142', '#9AA3AD', '#E0B11A', '#5FC9D6', colors.tomato];

export default function Stats() {
  const pomos = useLedgerStore((s) => s.pomos);
  const stats = useMemo(() => computeStats(pomos), [pomos]);

  const tierIdx = tierIndexFor(stats.total);
  const tier = TIER_NAMES[tierIdx];
  const tierColor = TIER_COLORS[tierIdx] ?? colors.tomato;
  const next = pomosToNextTier(stats.total);
  const subjects = useMemo(() => subjectBreakdown(pomos), [pomos]);

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>Your stats</Text>

        {/* level / tier */}
        <View style={styles.levelCard}>
          <View style={[styles.tierPill, { backgroundColor: tierColor }]}>
            <Text style={styles.tierText}>{tier}</Text>
          </View>
          <Text style={styles.levelTotal}>{stats.total} pomos all-time</Text>
          {next ? (
            <Text style={styles.levelNext}>
              {next.remaining} more to reach {next.tier}
            </Text>
          ) : (
            <Text style={styles.levelNext}>Top tier reached 🍅</Text>
          )}
        </View>

        <View style={styles.row}>
          <Stat value={stats.today} label="today" big />
          <Stat value={stats.week} label="this week" big />
        </View>

        <View style={styles.row}>
          <Stat value={stats.streak} label="day streak 🔥" />
          <Stat value={stats.freezes} label="freezes ❄️" />
        </View>

        <View style={styles.row}>
          <Stat value={stats.bestDay} label="best day" />
          <Stat value={stats.longestChain} label="longest chain" />
        </View>

        {subjects.length > 0 && (
          <View style={styles.subjectCard}>
            <Text style={styles.subjectTitle}>Time by subject</Text>
            {subjects.map((s) => {
              const pct = subjects[0]!.count > 0 ? s.count / subjects[0]!.count : 0;
              return (
                <View key={s.task} style={styles.subjectRow}>
                  <View style={styles.subjectTop}>
                    <Text style={styles.subjectName} numberOfLines={1}>
                      {s.task}
                    </Text>
                    <Text style={styles.subjectTime}>
                      {formatMinutes(s.minutes)} · {s.count}🍅
                    </Text>
                  </View>
                  <View style={styles.subjectTrack}>
                    <View style={[styles.subjectFill, { width: `${Math.max(6, pct * 100)}%` }]} />
                  </View>
                </View>
              );
            })}
          </View>
        )}

        <Heatmap pomos={pomos} />
      </ScrollView>
    </SafeAreaView>
  );
}

function Stat({ value, label, big }: { value: number; label: string; big?: boolean }) {
  return (
    <View style={styles.stat}>
      <Text style={[styles.statValue, big && styles.statValueBig]}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  content: { padding: 16, gap: 12 },
  title: { fontSize: 28, fontWeight: '800', color: colors.ink, paddingHorizontal: 4, paddingTop: 4 },
  levelCard: {
    backgroundColor: colors.card,
    borderColor: colors.line,
    borderWidth: 1,
    borderRadius: 16,
    padding: 18,
    alignItems: 'center',
    gap: 6,
  },
  tierPill: { borderRadius: 10, paddingHorizontal: 14, paddingVertical: 6 },
  tierText: { color: '#fff', fontWeight: '800', fontSize: 16 },
  levelTotal: { fontSize: 18, fontWeight: '800', color: colors.ink, marginTop: 4 },
  levelNext: { fontSize: 13, color: colors.subtle },
  row: { flexDirection: 'row', gap: 12 },
  stat: {
    flex: 1,
    backgroundColor: colors.card,
    borderColor: colors.line,
    borderWidth: 1,
    borderRadius: 14,
    padding: 16,
    alignItems: 'center',
  },
  statValue: { fontSize: 26, fontWeight: '800', color: colors.ink },
  statValueBig: { fontSize: 38 },
  statLabel: { fontSize: 12, color: colors.subtle },
  subjectCard: {
    backgroundColor: colors.card,
    borderColor: colors.line,
    borderWidth: 1,
    borderRadius: 16,
    padding: 16,
    gap: 12,
  },
  subjectTitle: { fontWeight: '800', color: colors.ink, fontSize: 16 },
  subjectRow: { gap: 6 },
  subjectTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  subjectName: { flex: 1, fontSize: 14, fontWeight: '700', color: colors.ink, marginRight: 8 },
  subjectTime: { fontSize: 13, fontWeight: '700', color: colors.subtle },
  subjectTrack: { height: 8, borderRadius: 4, backgroundColor: colors.line, overflow: 'hidden' },
  subjectFill: { height: 8, borderRadius: 4, backgroundColor: colors.tomato },
});

