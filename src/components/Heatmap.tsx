import { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import type { Pomo } from '@/stores/ledgerStore';
import { colors } from '@/theme';

// Strava/GitHub-style activity grid: last `weeks` weeks of pomo counts.
// Columns = weeks (oldest → newest), rows = Mon…Sun.

const WEEKS = 12;
const CELL = 14;
const GAP = 3;

function dayKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(
    d.getDate(),
  ).padStart(2, '0')}`;
}

function shade(count: number): string {
  if (count <= 0) return colors.line;
  if (count === 1) return '#F5B7B1';
  if (count <= 3) return '#EC7063';
  if (count <= 5) return '#E63A2E';
  return colors.tomatoDark;
}

export function Heatmap({ pomos }: { pomos: Pomo[] }) {
  const { columns } = useMemo(() => {
    const counts = new Map<string, number>();
    for (const p of pomos) {
      const k = dayKey(new Date(p.completedAt));
      counts.set(k, (counts.get(k) ?? 0) + 1);
    }

    // Start from Monday of the week (WEEKS-1) weeks ago.
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    const mondayIndex = (start.getDay() + 6) % 7;
    start.setDate(start.getDate() - mondayIndex - (WEEKS - 1) * 7);

    const cols: number[][] = [];
    for (let w = 0; w < WEEKS; w += 1) {
      const col: number[] = [];
      for (let d = 0; d < 7; d += 1) {
        const day = new Date(start);
        day.setDate(start.getDate() + w * 7 + d);
        col.push(day > new Date() ? -1 : counts.get(dayKey(day)) ?? 0);
      }
      cols.push(col);
    }
    return { columns: cols };
  }, [pomos]);

  return (
    <View style={styles.wrap}>
      <Text style={styles.title}>Last {WEEKS} weeks</Text>
      <View style={styles.grid}>
        {columns.map((col, ci) => (
          <View key={ci} style={{ gap: GAP }}>
            {col.map((count, ri) => (
              <View
                key={ri}
                style={{
                  width: CELL,
                  height: CELL,
                  borderRadius: 3,
                  backgroundColor: count < 0 ? 'transparent' : shade(count),
                }}
              />
            ))}
          </View>
        ))}
      </View>
      <View style={styles.legend}>
        <Text style={styles.legendText}>less</Text>
        {[colors.line, '#F5B7B1', '#EC7063', '#E63A2E', colors.tomatoDark].map((c) => (
          <View key={c} style={{ width: 12, height: 12, borderRadius: 3, backgroundColor: c }} />
        ))}
        <Text style={styles.legendText}>more</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    backgroundColor: colors.card,
    borderColor: colors.line,
    borderWidth: 1,
    borderRadius: 14,
    padding: 16,
    marginHorizontal: 20,
    gap: 10,
  },
  title: { fontWeight: '800', color: colors.ink },
  grid: { flexDirection: 'row', gap: GAP },
  legend: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  legendText: { fontSize: 11, color: colors.subtle },
});
