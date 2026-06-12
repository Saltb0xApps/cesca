import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors } from '@/theme';

// Phase 3 builds live standings, promotion/relegation zones, and the team-goal
// bar. Scaffold renders the empty/cold-start state.
export default function League() {
  return (
    <SafeAreaView style={styles.safe}>
      <Text style={styles.title}>League</Text>
      <View style={styles.empty}>
        <Text style={styles.emoji}>🏆</Text>
        <Text style={styles.emptyTitle}>No league yet</Text>
        <Text style={styles.emptyBody}>
          Complete your first pomo of the week to get placed into a cohort of ~20 students at your
          tier. Top 5 promote, bottom 5 relegate.
        </Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  title: { fontSize: 28, fontWeight: '800', color: colors.ink, padding: 20 },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32, gap: 10 },
  emoji: { fontSize: 56 },
  emptyTitle: { fontSize: 20, fontWeight: '800', color: colors.ink },
  emptyBody: { fontSize: 15, color: colors.subtle, textAlign: 'center', lineHeight: 22 },
});
