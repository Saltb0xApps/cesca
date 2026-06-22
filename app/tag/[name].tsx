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
import { listItemsByTag } from '@/repositories/items';
import type { SavedItem } from '@/types';
import { theme } from '@/theme';

export default function TagResultsScreen() {
  const { name } = useLocalSearchParams<{ name: string }>();
  const db = useSQLiteContext();
  const router = useRouter();
  const [items, setItems] = useState<SavedItem[]>([]);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      listItemsByTag(db, name).then((rows) => {
        if (active) setItems(rows);
      });
      return () => {
        active = false;
      };
    }, [db, name])
  );

  return (
    <>
      <Stack.Screen options={{ title: `#${name}` }} />
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
        ListEmptyComponent={<EmptyState icon="#️⃣" title="No videos with this tag" />}
      />
    </>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: theme.colors.bg },
  list: { padding: 12, gap: 12, flexGrow: 1 },
  row: { gap: 12 },
});
