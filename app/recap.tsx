import { useMemo } from 'react';
import { Pressable, Share, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { computeStats, useLedgerStore } from '@/stores/ledgerStore';
import { useProfileStore } from '@/stores/profileStore';
import { buildCohort, TIER_NAMES, tierIndexFor } from '@/lib/demoLeague';
import { colors } from '@/theme';

// Weekly recap / share card — the growth loop. (Image export via view-shot is a
// follow-up that needs a dev build; for now the card renders in-app and shares
// as text through the native sheet, which works in Expo Go.)
export default function Recap() {
  const router = useRouter();
  const pomos = useLedgerStore((s) => s.pomos);
  const { displayName, avatar, examTag } = useProfileStore();
  const stats = useMemo(() => computeStats(pomos), [pomos]);
  const cohort = useMemo(() => buildCohort(pomos, stats.total), [pomos, stats.total]);
  const tier = TIER_NAMES[tierIndexFor(stats.total)];

  const shareText =
    `My week on PomoLeague 🍅\n` +
    (examTag ? `${examTag} · ${tier}\n` : `${tier}\n`) +
    `${stats.week} pomos · #${cohort.yourRank} in my league · ${stats.streak}-day streak 🔥`;

  const onShare = () => {
    void Share.share({ message: shareText });
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.card}>
        <Text style={styles.brand}>POMOLEAGUE</Text>
        <Text style={styles.avatar}>{avatar}</Text>
        <Text style={styles.name}>{displayName || 'You'}</Text>
        {!!examTag && <Text style={styles.exam}>{examTag}</Text>}

        <View style={styles.big}>
          <Text style={styles.bigNum}>{stats.week}</Text>
          <Text style={styles.bigLabel}>pomos this week</Text>
        </View>

        <View style={styles.row}>
          <Mini value={`#${cohort.yourRank}`} label={`${tier} league`} />
          <Mini value={`${stats.streak}🔥`} label="day streak" />
          <Mini value={`${stats.bestDay}`} label="best day" />
        </View>

        <Text style={styles.foot}>Study, scored as a sport.</Text>
      </View>

      <Pressable style={styles.share} onPress={onShare}>
        <Text style={styles.shareText}>Share my week</Text>
      </Pressable>
      <Pressable onPress={() => router.back()}>
        <Text style={styles.close}>Close</Text>
      </Pressable>
    </SafeAreaView>
  );
}

function Mini({ value, label }: { value: string; label: string }) {
  return (
    <View style={styles.mini}>
      <Text style={styles.miniValue}>{value}</Text>
      <Text style={styles.miniLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.ink, padding: 20, alignItems: 'center', gap: 16 },
  card: {
    flex: 1,
    width: '100%',
    backgroundColor: colors.tomato,
    borderRadius: 24,
    padding: 28,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  brand: { color: '#ffffffcc', fontWeight: '900', letterSpacing: 3, fontSize: 14 },
  avatar: { fontSize: 64, marginTop: 8 },
  name: { color: '#fff', fontSize: 26, fontWeight: '900' },
  exam: { color: '#ffffffdd', fontSize: 15, fontWeight: '700' },
  big: { alignItems: 'center', marginVertical: 18 },
  bigNum: { color: '#fff', fontSize: 88, fontWeight: '900', lineHeight: 92 },
  bigLabel: { color: '#ffffffdd', fontSize: 16, fontWeight: '700' },
  row: { flexDirection: 'row', gap: 10 },
  mini: {
    backgroundColor: '#ffffff22',
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 14,
    alignItems: 'center',
    minWidth: 92,
  },
  miniValue: { color: '#fff', fontSize: 22, fontWeight: '900' },
  miniLabel: { color: '#ffffffcc', fontSize: 11 },
  foot: { color: '#ffffffcc', fontSize: 13, marginTop: 20, fontWeight: '600' },
  share: { backgroundColor: '#fff', borderRadius: 14, paddingVertical: 16, paddingHorizontal: 40 },
  shareText: { color: colors.tomato, fontSize: 17, fontWeight: '800' },
  close: { color: '#ffffffaa', fontSize: 15, paddingVertical: 4 },
});
