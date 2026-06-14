import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useProfileStore } from '@/stores/profileStore';
import { colors } from '@/theme';

// First-run contract: set the pomo rule clearly BEFORE the first round.
export default function Rules() {
  const router = useRouter();
  const markSeen = useProfileStore((s) => s.save);

  const start = async () => {
    await markSeen({ seenRules: true });
    router.replace('/round');
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.body}>
        <Text style={styles.tomato}>🍅</Text>
        <Text style={styles.title}>One pomo = one focused round</Text>

        <Rule emoji="⏱️" text="25 minutes of focus, then a 5-minute break." />
        <Rule emoji="📵" text="Leave the app and the round dies. No partial credit — ever." />
        <Rule emoji="🏆" text="Completed pomos are your score. Bank as many as you can." />

        <Text style={styles.fine}>
          Notification peeks are fine. Switching apps for more than ~10 seconds is not.
        </Text>
      </View>

      <Pressable style={styles.button} onPress={start}>
        <Text style={styles.buttonText}>I&apos;m ready — start my first round</Text>
      </Pressable>
    </SafeAreaView>
  );
}

function Rule({ emoji, text }: { emoji: string; text: string }) {
  return (
    <View style={styles.rule}>
      <Text style={styles.ruleEmoji}>{emoji}</Text>
      <Text style={styles.ruleText}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg, padding: 24, justifyContent: 'space-between' },
  body: { flex: 1, justifyContent: 'center', gap: 18 },
  tomato: { fontSize: 64, textAlign: 'center' },
  title: { fontSize: 26, fontWeight: '800', color: colors.ink, textAlign: 'center', marginBottom: 8 },
  rule: {
    flexDirection: 'row',
    gap: 14,
    alignItems: 'center',
    backgroundColor: colors.card,
    borderColor: colors.line,
    borderWidth: 1,
    borderRadius: 14,
    padding: 16,
  },
  ruleEmoji: { fontSize: 26 },
  ruleText: { flex: 1, fontSize: 15, color: colors.ink, lineHeight: 21 },
  fine: { fontSize: 13, color: colors.subtle, textAlign: 'center', marginTop: 6 },
  button: { backgroundColor: colors.tomato, borderRadius: 14, padding: 18, alignItems: 'center' },
  buttonText: { color: '#fff', fontSize: 17, fontWeight: '800' },
});
