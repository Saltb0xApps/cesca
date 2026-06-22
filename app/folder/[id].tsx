import { useCallback, useState } from 'react';
import { FlatList, StyleSheet } from 'react-native';
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
import type { SavedItem } from '@/types';
import { theme } from '@/theme';

export default function FolderScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const db = useSQLiteContext();
  const router = useRouter();
  const [items, setItems] = useState<SavedItem[]>([]);
  const [title, setTitle] = useState('Folder');

  useFocusEffect(
    useCallback(() => {
      let active = true;
      Promise.all([getFolder(db, id), listItems(db, { folderId: id })]).then(
        ([folder, rows]) => {
          if (!active) return;
          if (folder) setTitle(folder.name);
          setItems(rows);
        }
      );
      return () => {
        active = false;
      };
    }, [db, id])
  );

  return (
    <>
      <Stack.Screen options={{ title }} />
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
});
