import { useCallback, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';

import { EmptyState } from '@/components/EmptyState';
import { useToast } from '@/components/ui/Toast';
import { listTags, renameTag, type TagWithCount } from '@/repositories/tags';
import { theme } from '@/theme';

export default function TagsScreen() {
  const db = useSQLiteContext();
  const router = useRouter();
  const toast = useToast();
  const [tags, setTags] = useState<TagWithCount[]>([]);
  const [editing, setEditing] = useState<string | null>(null);
  const [draft, setDraft] = useState('');

  const reload = useCallback(() => {
    listTags(db).then(setTags);
  }, [db]);

  useFocusEffect(
    useCallback(() => {
      reload();
    }, [reload])
  );

  const commitRename = async (id: string) => {
    if (draft.trim()) {
      await renameTag(db, id, draft.trim());
      toast.show('Tag updated');
    }
    setEditing(null);
    setDraft('');
    reload();
  };

  return (
    <View style={styles.screen}>
      <Text style={styles.hint}>
        Tap a tag to see its videos. Rename to an existing tag&apos;s name to
        merge them.
      </Text>
      <FlatList
        data={tags}
        keyExtractor={(t) => t.id}
        contentContainerStyle={styles.list}
        renderItem={({ item }) =>
          editing === item.id ? (
            <View style={styles.row}>
              <TextInput
                value={draft}
                onChangeText={setDraft}
                autoFocus
                autoCapitalize="none"
                style={styles.input}
                onSubmitEditing={() => commitRename(item.id)}
                returnKeyType="done"
              />
              <Pressable hitSlop={8} onPress={() => commitRename(item.id)}>
                <Text style={styles.save}>Save</Text>
              </Pressable>
            </View>
          ) : (
            <Pressable
              style={styles.row}
              onPress={() => router.push(`/tag/${encodeURIComponent(item.name)}`)}
            >
              <Text style={styles.name}>#{item.name}</Text>
              <Text style={styles.count}>{item.count}</Text>
              <Pressable
                hitSlop={8}
                onPress={() => {
                  setEditing(item.id);
                  setDraft(item.name);
                }}
              >
                <Text style={styles.edit}>✎</Text>
              </Pressable>
            </Pressable>
          )
        }
        ListEmptyComponent={
          <EmptyState
            icon="#️⃣"
            title="No tags yet"
            subtitle="Add tags to your saved videos to organise and find them fast."
          />
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: theme.colors.bg },
  hint: {
    color: theme.colors.textMuted,
    fontSize: 13,
    lineHeight: 18,
    padding: 16,
    paddingBottom: 4,
  },
  list: { padding: 12, gap: 8, flexGrow: 1 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  name: { flex: 1, color: theme.colors.text, fontSize: 16, fontWeight: '600' },
  count: { color: theme.colors.textMuted, fontSize: 14, fontWeight: '600' },
  edit: { color: theme.colors.textMuted, fontSize: 16 },
  input: {
    flex: 1,
    color: theme.colors.text,
    fontSize: 16,
    backgroundColor: theme.colors.surfaceAlt,
    borderRadius: theme.radius.sm,
    paddingHorizontal: 12,
    height: 40,
  },
  save: { color: theme.colors.accent, fontSize: 15, fontWeight: '700' },
});
