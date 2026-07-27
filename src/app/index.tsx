import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';

import { EmptyState } from '@/components/EmptyState';
import { RecordingRow } from '@/components/RecordingRow';
import { Screen } from '@/components/Screen';
import { questionForDate } from '@/lib/questions';
import { loadSecrets } from '@/lib/secrets';
import { useAppStore } from '@/lib/store';
import { colors, radius, spacing, type } from '@/lib/theme';

export default function HomeScreen() {
  const router = useRouter();
  const recordings = useAppStore((s) => s.recordings);
  const settings = useAppStore((s) => s.settings);
  const setArchived = useAppStore((s) => s.setArchived);
  const deleteRecording = useAppStore((s) => s.deleteRecording);

  const [missingSetup, setMissingSetup] = useState<string[]>([]);

  // Re-check what's configured every time this screen gains focus (the user
  // may have just come back from Settings).
  useFocusEffect(
    useCallback(() => {
      let alive = true;
      loadSecrets().then(({ notionToken, openaiKey }) => {
        if (!alive) return;
        const missing: string[] = [];
        if (!openaiKey) missing.push('OpenAI key');
        if (!notionToken) missing.push('Notion token');
        if (!settings.notionPageId) missing.push('Notion page');
        setMissingSetup(missing);
      });
      return () => {
        alive = false;
      };
    }, [settings.notionPageId]),
  );

  const active = useMemo(
    () =>
      recordings
        .filter((r) => !r.archived)
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    [recordings],
  );
  const archivedCount = recordings.length - active.length;
  const tonightsQuestion = questionForDate(new Date(), settings.questions);

  return (
    <Screen style={{ paddingBottom: 0 }}>
      <FlatList
        data={active}
        keyExtractor={(r) => r.id}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <>
            <View style={styles.header}>
              <View>
                <Text style={styles.title}>Cesca</Text>
                <Text style={styles.subtitle}>Nightly brain dump → Notion</Text>
              </View>
              <View style={styles.headerActions}>
                <Pressable
                  hitSlop={8}
                  onPress={() => router.push('/archive')}
                  style={styles.headerBtn}
                >
                  <Ionicons name="archive-outline" size={22} color={colors.textDim} />
                  {archivedCount > 0 && (
                    <View style={styles.badge}>
                      <Text style={styles.badgeText}>{archivedCount}</Text>
                    </View>
                  )}
                </Pressable>
                <Pressable
                  hitSlop={8}
                  onPress={() => router.push('/settings')}
                  style={styles.headerBtn}
                >
                  <Ionicons name="settings-outline" size={22} color={colors.textDim} />
                </Pressable>
              </View>
            </View>

            {missingSetup.length > 0 && (
              <Pressable style={styles.setupBanner} onPress={() => router.push('/settings')}>
                <Ionicons name="alert-circle" size={18} color={colors.accent} />
                <Text style={styles.setupText}>
                  Finish setup: {missingSetup.join(', ')} →
                </Text>
              </Pressable>
            )}

            <View style={styles.tonightCard}>
              <Text style={styles.tonightLabel}>Tonight’s question</Text>
              <Text style={styles.tonightQuestion}>{tonightsQuestion}</Text>
              <Pressable
                onPress={() => router.push('/record')}
                style={({ pressed }) => [styles.recordBtn, pressed && { opacity: 0.85 }]}
              >
                <View style={styles.recordDot} />
                <Text style={styles.recordBtnText}>Record</Text>
              </Pressable>
            </View>

            {active.length > 0 && <Text style={styles.sectionLabel}>Recordings</Text>}
          </>
        }
        ListEmptyComponent={
          <EmptyState
            title="Nothing recorded yet"
            body="Tap Record, talk through your day, and the transcript lands at the end of your Notion page on its own."
          />
        }
        renderItem={({ item }) => (
          <RecordingRow
            entry={item}
            onPress={() => router.push({ pathname: '/recording/[id]', params: { id: item.id } })}
            onArchiveToggle={() => setArchived(item.id, !item.archived)}
            onDelete={() => deleteRecording(item.id)}
          />
        )}
        contentContainerStyle={{ paddingBottom: spacing.xl }}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
    marginTop: spacing.sm,
  },
  title: { color: colors.text, fontSize: type.title, fontWeight: '700' },
  subtitle: { color: colors.textFaint, fontSize: type.small, marginTop: 2 },
  headerActions: { flexDirection: 'row', gap: spacing.md },
  headerBtn: { padding: 4 },
  badge: {
    position: 'absolute',
    top: -2,
    right: -4,
    backgroundColor: colors.accent,
    borderRadius: radius.full,
    minWidth: 15,
    height: 15,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
  },
  badgeText: { color: colors.accentText, fontSize: 9, fontWeight: '700' },
  setupBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: 'rgba(240, 179, 92, 0.12)',
    borderColor: colors.accent,
    borderWidth: 1,
    borderRadius: radius.md,
    padding: spacing.sm + 4,
    marginBottom: spacing.md,
  },
  setupText: { color: colors.accent, fontSize: type.small, fontWeight: '600', flex: 1 },
  tonightCard: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radius.lg,
    padding: spacing.lg,
    marginBottom: spacing.lg,
  },
  tonightLabel: {
    color: colors.textFaint,
    fontSize: type.tiny,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 6,
  },
  tonightQuestion: {
    color: colors.text,
    fontSize: type.heading,
    fontWeight: '600',
    lineHeight: 27,
    marginBottom: spacing.md + 4,
  },
  recordBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm + 2,
    backgroundColor: colors.record,
    borderRadius: radius.md,
    paddingVertical: 15,
  },
  recordDot: {
    width: 10,
    height: 10,
    borderRadius: radius.full,
    backgroundColor: '#FFFFFF',
  },
  recordBtnText: { color: '#FFFFFF', fontSize: type.body, fontWeight: '700' },
  sectionLabel: {
    color: colors.textFaint,
    fontSize: type.tiny,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: spacing.sm,
  },
});
