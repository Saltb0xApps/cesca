import { useCallback, useEffect, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { Stack, useLocalSearchParams } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';

import { EmptyState } from '@/components/EmptyState';
import { SearchBar } from '@/components/SearchBar';
import {
  addItemToProject,
  listProjectItems,
  removeItemFromProject,
} from '@/repositories/projects';
import { searchItems } from '@/repositories/items';
import type { SavedItem } from '@/types';
import { theme } from '@/theme';

/** Toggles which saved clips belong to a project's shot list. */
export default function PickClipsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const db = useSQLiteContext();
  const [query, setQuery] = useState('');
  const [items, setItems] = useState<SavedItem[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const refreshSelected = useCallback(async () => {
    const inProject = await listProjectItems(db, id);
    setSelected(new Set(inProject.map((i) => i.id)));
  }, [db, id]);

  useEffect(() => {
    let active = true;
    searchItems(db, query).then((rows) => {
      if (active) setItems(rows);
    });
    return () => {
      active = false;
    };
  }, [db, query]);

  useEffect(() => {
    let active = true;
    (async () => {
      const inProject = await listProjectItems(db, id);
      if (active) setSelected(new Set(inProject.map((i) => i.id)));
    })();
    return () => {
      active = false;
    };
  }, [db, id]);

  const toggle = async (itemId: string) => {
    if (selected.has(itemId)) {
      await removeItemFromProject(db, id, itemId);
    } else {
      await addItemToProject(db, id, itemId);
    }
    refreshSelected();
  };

  return (
    <View style={styles.screen}>
      <Stack.Screen options={{ title: 'Add clips' }} />
      <View style={styles.header}>
        <SearchBar value={query} onChangeText={setQuery} />
      </View>
      <FlatList
        data={items}
        keyExtractor={(i) => i.id}
        contentContainerStyle={styles.list}
        keyboardShouldPersistTaps="handled"
        renderItem={({ item }) => {
          const isSelected = selected.has(item.id);
          return (
            <Pressable style={styles.row} onPress={() => toggle(item.id)}>
              {item.thumbnailUri ? (
                <Image source={{ uri: item.thumbnailUri }} style={styles.thumb} />
              ) : (
                <View style={[styles.thumb, styles.thumbFallback]}>
                  <Text>🎬</Text>
                </View>
              )}
              <Text style={styles.caption} numberOfLines={2}>
                {item.caption || item.title || 'Untitled clip'}
              </Text>
              <View style={[styles.check, isSelected && styles.checkOn]}>
                {isSelected ? <Text style={styles.checkMark}>✓</Text> : null}
              </View>
            </Pressable>
          );
        }}
        ListEmptyComponent={
          <EmptyState icon="🎬" title="No clips found" />
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: theme.colors.bg },
  header: { padding: 16 },
  list: { paddingHorizontal: 12, paddingBottom: 24, gap: 8, flexGrow: 1 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: 8,
  },
  thumb: {
    width: 44,
    height: 58,
    borderRadius: theme.radius.sm,
    backgroundColor: theme.colors.surfaceAlt,
  },
  thumbFallback: { alignItems: 'center', justifyContent: 'center' },
  caption: { flex: 1, color: theme.colors.text, fontSize: 14 },
  check: {
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 2,
    borderColor: theme.colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkOn: {
    backgroundColor: theme.colors.accent,
    borderColor: theme.colors.accent,
  },
  checkMark: { color: '#fff', fontSize: 15, fontWeight: '800' },
});
