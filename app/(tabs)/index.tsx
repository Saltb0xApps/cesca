import { useCallback, useState } from 'react';
import {
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Link, useFocusEffect, useRouter } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { SafeAreaView } from 'react-native-safe-area-context';

import { EmptyState } from '@/components/EmptyState';
import { VideoCard } from '@/components/VideoCard';
import { GallerySkeleton } from '@/components/ui/Skeleton';
import { listItems } from '@/repositories/items';
import type { SavedItem } from '@/types';
import { theme } from '@/theme';

export default function GalleryScreen() {
  const db = useSQLiteContext();
  const router = useRouter();
  const [items, setItems] = useState<SavedItem[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      listItems(db).then((rows) => {
        if (active) {
          setItems(rows);
          setLoaded(true);
        }
      });
      return () => {
        active = false;
      };
    }, [db])
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    setItems(await listItems(db));
    setRefreshing(false);
  }, [db]);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>Gallery</Text>
        <View style={styles.headerActions}>
          <Link href="/add" asChild>
            <Pressable style={styles.addBtn}>
              <Text style={styles.addBtnText}>+ Add</Text>
            </Pressable>
          </Link>
          <Link href="/settings" asChild>
            <Pressable style={styles.gearBtn} hitSlop={8}>
              <Text style={styles.gear}>⚙︎</Text>
            </Pressable>
          </Link>
        </View>
      </View>
      {!loaded ? (
        <GallerySkeleton />
      ) : (
        <FlatList
          data={items}
          keyExtractor={(i) => i.id}
          numColumns={2}
          columnWrapperStyle={styles.row}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={theme.colors.textMuted}
            />
          }
          renderItem={({ item }) => (
            <VideoCard
              item={item}
              onPress={() => router.push(`/item/${item.id}`)}
            />
          )}
          ListEmptyComponent={
            <EmptyState
              icon="🎬"
              title="No saved videos yet"
              subtitle="Share a reel from Instagram → Cesca, or tap + Add to paste a link."
            />
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: theme.colors.bg },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  title: { color: theme.colors.text, fontSize: 28, fontWeight: '800' },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  gearBtn: { padding: 4 },
  gear: { color: theme.colors.textMuted, fontSize: 22 },
  addBtn: {
    backgroundColor: theme.colors.accent,
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: theme.radius.pill,
  },
  addBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  list: { padding: 12, gap: 12, flexGrow: 1 },
  row: { gap: 12 },
});
