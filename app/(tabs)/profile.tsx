import { useMemo } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useAuth } from '@/hooks/useAuth';
import { computeStats, useLedgerStore } from '@/stores/ledgerStore';
import { useProfileStore } from '@/stores/profileStore';
import { Heatmap } from '@/components/Heatmap';
import { TIER_NAMES, tierIndexFor } from '@/lib/demoLeague';
import { colors } from '@/theme';

export default function Profile() {
  const router = useRouter();
  const { session, signOut } = useAuth();
  const pomos = useLedgerStore((s) => s.pomos);
  const clear = useLedgerStore((s) => s.clear);
  const { displayName, avatar, examTag } = useProfileStore();
  const stats = useMemo(() => computeStats(pomos), [pomos]);
  const tier = TIER_NAMES[tierIndexFor(stats.total)];

  const who = displayName || session?.user.email || 'Demo player';

  const confirmClear = () => {
    Alert.alert('Reset pomo history?', 'This clears your local stats on this device.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Reset', style: 'destructive', onPress: () => void clear() },
    ]);
  };

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.title}>Profile</Text>

        <View style={styles.card}>
          <Text style={styles.avatar}>{avatar}</Text>
          <Text style={styles.name}>{who}</Text>
          <Text style={styles.tag}>
            {examTag ? `${examTag} · ` : ''}
            {tier} · {stats.total} pomos · {stats.streak}-day streak
          </Text>
        </View>

        <View style={styles.grid}>
          <Cell value={stats.total} label="all-time pomos" />
          <Cell value={stats.week} label="this week" />
          <Cell value={stats.bestDay} label="best day" />
          <Cell value={stats.longestChain} label="longest chain" />
        </View>

        <Pressable style={styles.recap} onPress={() => router.push('/recap')}>
          <Text style={styles.recapText}>📸  Share weekly recap</Text>
        </Pressable>

        <Heatmap pomos={pomos} />

        <Pressable style={styles.link} onPress={confirmClear}>
          <Text style={styles.linkText}>Reset pomo history</Text>
        </Pressable>
        <Pressable style={styles.link} onPress={signOut}>
          <Text style={styles.signOutText}>Sign out</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

function Cell({ value, label }: { value: number; label: string }) {
  return (
    <View style={styles.cell}>
      <Text style={styles.cellValue}>{value}</Text>
      <Text style={styles.cellLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  scroll: { paddingBottom: 32, gap: 4 },
  title: { fontSize: 28, fontWeight: '800', color: colors.ink, padding: 20 },
  card: {
    marginHorizontal: 20,
    backgroundColor: colors.card,
    borderColor: colors.line,
    borderWidth: 1,
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    gap: 6,
  },
  avatar: { fontSize: 48 },
  name: { fontSize: 18, fontWeight: '800', color: colors.ink },
  tag: { fontSize: 14, color: colors.subtle },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    padding: 20,
  },
  cell: {
    flexGrow: 1,
    flexBasis: '45%',
    backgroundColor: colors.card,
    borderColor: colors.line,
    borderWidth: 1,
    borderRadius: 14,
    padding: 16,
    alignItems: 'center',
  },
  cellValue: { fontSize: 26, fontWeight: '800', color: colors.ink },
  cellLabel: { fontSize: 12, color: colors.subtle },
  recap: {
    marginHorizontal: 20,
    marginBottom: 12,
    backgroundColor: colors.tomato,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
  },
  recapText: { color: '#fff', fontSize: 16, fontWeight: '800' },
  link: { alignSelf: 'center', padding: 12 },
  linkText: { color: colors.subtle, fontWeight: '700' },
  signOutText: { color: colors.tomatoDark, fontWeight: '700' },
});
