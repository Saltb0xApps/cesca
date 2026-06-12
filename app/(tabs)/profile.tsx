import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '@/hooks/useAuth';
import { colors } from '@/theme';

// Phase 5 finalizes this (tier badges + recap card). Scaffold shows identity +
// sign out so the auth loop is testable end-to-end.
export default function Profile() {
  const { session, signOut } = useAuth();

  return (
    <SafeAreaView style={styles.safe}>
      <Text style={styles.title}>Profile</Text>

      <View style={styles.card}>
        <Text style={styles.avatar}>🍅</Text>
        <Text style={styles.name}>{session?.user.email ?? 'Signed in'}</Text>
        <Text style={styles.tag}>Bronze · 0 pomos · 0-day streak</Text>
      </View>

      <Pressable style={styles.signOut} onPress={signOut}>
        <Text style={styles.signOutText}>Sign out</Text>
      </Pressable>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  title: { fontSize: 28, fontWeight: '800', color: colors.ink, padding: 20 },
  card: {
    margin: 20,
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
  signOut: { alignSelf: 'center', marginTop: 8, padding: 12 },
  signOutText: { color: colors.tomatoDark, fontWeight: '700' },
});
