import { useCallback, useState } from 'react';
import { FlatList, Pressable, Share, StyleSheet, Text } from 'react-native';
import {
  Stack,
  useFocusEffect,
  useLocalSearchParams,
  useRouter,
} from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';

import { EmptyState } from '@/components/EmptyState';
import { VideoCard } from '@/components/VideoCard';
import { getFolder } from '@/repositories/folders';
import { listItems } from '@/repositories/items';
import { buildFolderText } from '@/services/export';
import type { Folder, SavedItem } from '@/types';
import { theme } from '@/theme';

export default function FolderScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const db = useSQLiteContext();
  const router = useRouter();
  const [items, setItems] = useState<SavedItem[]>([]);
  const [folder, setFolder] = useState<Folder | null>(null);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      Promise.all([getFolder(db, id), listItems(db, { folderId: id })]).then(
        ([f, rows]) => {
          if (!active) return;
          setFolder(f);
          setItems(rows);
        }
      );
      return () => {
        active = false;
      };
    }, [db, id])
  );

  const exportFolder = async () => {
    if (!folder) return;
    await Share.share({
      message: buildFolderText(folder, items),
      title: folder.name,
    });
  };

  return (
    <>
      <Stack.Screen
        options={{
          title: folder?.name ?? 'Folder',
          headerRight: () =>
            items.length > 0 ? (
              <Pressable hitSlop={10} onPress={exportFolder}>
                <Text style={styles.export}>Export</Text>
              </Pressable>
            ) : null,
        }}
      />
      <FlatList
        style={styles.screen}
        data={items}
        keyExtractor={(i) => i.id}
        numColumns={2}
        columnWrapperStyle={styles.row}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <VideoCard item={item} onPress={() => router.push(`/item/${item.id}`)} />
        )}
        ListEmptyComponent={
          <EmptyState
            icon="🗂️"
            title="This folder is empty"
            subtitle="Open a saved video and assign it to this folder."
          />
        }
      />
    </>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: theme.colors.bg },
  list: { padding: 12, gap: 12, flexGrow: 1 },
  row: { gap: 12 },
  export: { color: theme.colors.accent, fontWeight: '700', fontSize: 16 },
});
