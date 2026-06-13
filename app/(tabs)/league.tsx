import { useMemo } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { computeStats, useLedgerStore } from '@/stores/ledgerStore';
import { buildCohort, type Member } from '@/lib/demoLeague';
import { colors } from '@/theme';

const TIER_COLORS = ['#A97142', '#9AA3AD', '#E0B11A', '#5FC9D6', colors.tomato];

function fmtRange(a: Date, b: Date): string {
  const opts: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' };
  return `${a.toLocaleDateString(undefined, opts)} – ${b.toLocaleDateString(undefined, opts)}`;
}

export default function League() {
  const pomos = useLedgerStore((s) => s.pomos);
  const stats = useMemo(() => computeStats(pomos), [pomos]);
  const cohort = useMemo(
    () => buildCohort(pomos, stats.total),
    // rebuild when the player's banked pomos change
    [pomos, stats.total],
  );

  const goalPct = Math.min(1, cohort.teamTotal / cohort.teamGoal);
  const tierColor = TIER_COLORS[cohort.tierIndex] ?? colors.tomato;

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.headerRow}>
          <View>
            <View style={[styles.tierPill, { backgroundColor: tierColor }]}>
              <Text style={styles.tierText}>{cohort.tierName} League</Text>
            </View>
            <Text style={styles.range}>{fmtRange(cohort.weekStart, cohort.weekEnd)}</Text>
          </View>
          <View style={styles.rankBox}>
            <Text style={styles.rankNum}>#{cohort.yourRank}</Text>
            <Text style={styles.rankLabel}>your rank</Text>
          </View>
        </View>

        {/* team goal */}
        <View style={styles.goalCard}>
          <View style={styles.goalTop}>
            <Text style={styles.goalTitle}>League goal</Text>
            <Text style={styles.goalNums}>
              {cohort.teamTotal} / {cohort.teamGoal}
            </Text>
          </View>
          <View style={styles.barTrack}>
            <View style={[styles.barFill, { width: `${goalPct * 100}%` }]} />
          </View>
          <Text style={styles.goalHint}>
            Everyone earns a badge if the league banks {cohort.teamGoal} pomos together.
          </Text>
        </View>

        <View style={styles.zonesLegend}>
          <Text style={[styles.legend, { color: colors.good }]}>▲ Top {cohort.promoteCount} promote</Text>
          <Text style={[styles.legend, { color: colors.tomatoDark }]}>
            ▼ Bottom {cohort.relegateCount} relegate
          </Text>
        </View>

        {cohort.members.map((m, i) => (
          <Row key={m.id} member={m} rank={i + 1} cohort={cohort} total={cohort.members.length} />
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

function Row({
  member,
  rank,
  cohort,
  total,
}: {
  member: Member;
  rank: number;
  cohort: ReturnType<typeof buildCohort>;
  total: number;
}) {
  const promote = rank <= cohort.promoteCount;
  const relegate = rank > total - cohort.relegateCount;
  const zoneStyle = promote ? styles.promote : relegate ? styles.relegate : null;

  return (
    <View style={[styles.row, zoneStyle, member.isYou && styles.youRow]}>
      <Text style={styles.rank}>{rank}</Text>
      <Text style={styles.avatar}>{member.avatar}</Text>
      <Text style={[styles.name, member.isYou && styles.youName]} numberOfLines={1}>
        {member.name}
      </Text>
      <Text style={[styles.pomos, member.isYou && styles.youName]}>{member.pomos}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  content: { padding: 16, gap: 10 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  tierPill: { alignSelf: 'flex-start', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 6 },
  tierText: { color: '#fff', fontWeight: '800', fontSize: 16 },
  range: { color: colors.subtle, marginTop: 6, fontSize: 13 },
  rankBox: { alignItems: 'center' },
  rankNum: { fontSize: 28, fontWeight: '800', color: colors.ink },
  rankLabel: { fontSize: 11, color: colors.subtle },
  goalCard: {
    backgroundColor: colors.card,
    borderColor: colors.line,
    borderWidth: 1,
    borderRadius: 14,
    padding: 16,
    gap: 8,
  },
  goalTop: { flexDirection: 'row', justifyContent: 'space-between' },
  goalTitle: { fontWeight: '800', color: colors.ink },
  goalNums: { fontWeight: '800', color: colors.tomato },
  barTrack: { height: 12, borderRadius: 6, backgroundColor: colors.line, overflow: 'hidden' },
  barFill: { height: 12, borderRadius: 6, backgroundColor: colors.tomato },
  goalHint: { fontSize: 12, color: colors.subtle },
  zonesLegend: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 },
  legend: { fontSize: 12, fontWeight: '700' },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderColor: colors.line,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 12,
  },
  promote: { borderColor: colors.good, backgroundColor: '#EAF7EF' },
  relegate: { borderColor: '#F2C7C2', backgroundColor: '#FCEDEB' },
  youRow: { borderColor: colors.tomato, borderWidth: 2 },
  rank: { width: 24, textAlign: 'center', fontWeight: '800', color: colors.subtle },
  avatar: { fontSize: 22 },
  name: { flex: 1, fontSize: 15, fontWeight: '600', color: colors.ink },
  youName: { color: colors.tomato, fontWeight: '800' },
  pomos: { fontSize: 16, fontWeight: '800', color: colors.ink },
});
