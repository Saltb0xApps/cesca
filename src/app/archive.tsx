import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useMemo } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';

import { EmptyState } from '@/components/EmptyState';
import { RecordingRow } from '@/components/RecordingRow';
import { Screen } from '@/components/Screen';
import { useAppStore } from '@/lib/store';
import { colors, spacing, type } from '@/lib/theme';

export default function ArchiveScreen() {
  const router = useRouter();
  const recordings = useAppStore((s) => s.recordings);
  const setArchived = useAppStore((s) => s.setArchived);
  const deleteRecording = useAppStore((s) => s.deleteRecording);

  const archived = useMemo(
    () =>
      recordings
        .filter((r) => r.archived)
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    [recordings],
  );

  return (
    <Screen style={{ paddingBottom: 0 }}>
      <View style={styles.header}>
        <Pressable hitSlop={10} onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={24} color={colors.text} />
        </Pressable>
        <Text style={styles.title}>Archive</Text>
        <View style={{ width: 24 }} />
      </View>
      <FlatList
        data={archived}
        keyExtractor={(r) => r.id}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <EmptyState
            title="Archive is empty"
            body="Archived recordings move here — out of the way, still on your phone."
          />
        }
        renderItem={({ item }) => (
          <RecordingRow
            entry={item}
            onPress={() => router.push({ pathname: '/recording/[id]', params: { id: item.id } })}
            onArchiveToggle={() => setArchived(item.id, false)}
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
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
    marginTop: spacing.xs,
  },
  backBtn: { padding: 2 },
  title: { color: colors.text, fontSize: type.body, fontWeight: '700' },
});
