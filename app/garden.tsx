import { useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { computeStats, useLedgerStore } from '@/stores/ledgerStore';
import { VegIcon } from '@/components/VegIcon';
import { VEGGIES, isUnlocked, nextVeg, unlockedCount } from '@/lib/veggies';
import { colors } from '@/theme';

export default function Garden() {
  const router = useRouter();
  const pomos = useLedgerStore((s) => s.pomos);
  const stats = useMemo(() => computeStats(pomos), [pomos]);

  const unlocked = unlockedCount(stats.total);
  const next = nextVeg(stats.total);

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <Text style={styles.title}>Your garden</Text>
        <Text style={styles.sub}>
          {unlocked} / {VEGGIES.length} grown
          {next ? ` · ${next.remaining} more pomos to grow a ${next.veg.name.toLowerCase()}` : ' · all grown 🎉'}
        </Text>
      </View>

      <ScrollView contentContainerStyle={styles.grid}>
        {VEGGIES.map((veg) => {
          const open = isUnlocked(veg, stats.total);
          return (
            <View key={veg.type} style={[styles.cell, !open && styles.cellLocked]}>
              <VegIcon
                type={veg.type}
                size={64}
                color={open ? colors.tomato : colors.line}
              />
              <Text style={[styles.name, !open && styles.nameLocked]}>
                {open ? veg.name : `🔒 ${veg.unlockAt}`}
              </Text>
            </View>
          );
        })}
      </ScrollView>

      <Pressable style={styles.close} onPress={() => router.back()}>
        <Text style={styles.closeText}>Done</Text>
      </Pressable>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  header: { padding: 20, gap: 4 },
  title: { fontSize: 28, fontWeight: '800', color: colors.ink },
  sub: { fontSize: 13, color: colors.subtle },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  cell: {
    width: '30%',
    flexGrow: 1,
    aspectRatio: 1,
    backgroundColor: colors.card,
    borderColor: colors.line,
    borderWidth: 1,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  cellLocked: { backgroundColor: colors.bg },
  name: { fontSize: 13, fontWeight: '700', color: colors.ink },
  nameLocked: { color: colors.subtle, fontWeight: '600' },
  close: { alignSelf: 'center', padding: 16 },
  closeText: { color: colors.tomato, fontSize: 16, fontWeight: '800' },
});
