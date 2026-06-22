import { useEffect, useState } from 'react';
import { FlatList, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Link, useRouter } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { SafeAreaView } from 'react-native-safe-area-context';

import { EmptyState } from '@/components/EmptyState';
import { SearchBar } from '@/components/SearchBar';
import { Chip } from '@/components/ui/Chip';
import { VideoCard } from '@/components/VideoCard';
import {
  searchItems,
  type ItemSort,
  type SearchFilters,
} from '@/repositories/items';
import type { ItemSource, SavedItem } from '@/types';
import { theme } from '@/theme';

const SOURCE_FILTERS: { key: ItemSource | 'all'; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'instagram', label: 'Instagram' },
  { key: 'tiktok', label: 'TikTok' },
  { key: 'upload', label: 'Uploads' },
  { key: 'link', label: 'Links' },
];

const SORTS: { key: ItemSort; label: string }[] = [
  { key: 'recent', label: 'Newest' },
  { key: 'oldest', label: 'Oldest' },
  { key: 'az', label: 'A–Z' },
];

export default function SearchScreen() {
  const db = useSQLiteContext();
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [source, setSource] = useState<ItemSource | 'all'>('all');
  const [hasMusic, setHasMusic] = useState(false);
  const [sort, setSort] = useState<ItemSort>('recent');
  const [results, setResults] = useState<SavedItem[]>([]);

  useEffect(() => {
    let active = true;
    const filters: SearchFilters = {
      sort,
      hasMusic: hasMusic || undefined,
      source: source === 'all' ? undefined : source,
    };
    const handle = setTimeout(() => {
      searchItems(db, query, filters).then((rows) => {
        if (active) setResults(rows);
      });
    }, 150);
    return () => {
      active = false;
      clearTimeout(handle);
    };
  }, [db, query, source, hasMusic, sort]);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <Text style={styles.title}>Search</Text>
          <Link href="/tags" asChild>
            <Pressable hitSlop={8}>
              <Text style={styles.tagsLink}># Tags</Text>
            </Pressable>
          </Link>
        </View>
        <SearchBar value={query} onChangeText={setQuery} />
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterRow}
        >
          {SOURCE_FILTERS.map((f) => (
            <Chip
              key={f.key}
              label={f.label}
              active={source === f.key}
              onPress={() => setSource(f.key)}
            />
          ))}
          <View style={styles.sep} />
          <Chip
            label="♪ Has music"
            active={hasMusic}
            onPress={() => setHasMusic((v) => !v)}
          />
        </ScrollView>
        <View style={styles.sortRow}>
          {SORTS.map((s) => (
            <Pressable key={s.key} onPress={() => setSort(s.key)}>
              <Text style={[styles.sort, sort === s.key && styles.sortActive]}>
                {s.label}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>
      <FlatList
        data={results}
        keyExtractor={(i) => i.id}
        numColumns={2}
        columnWrapperStyle={styles.row}
        contentContainerStyle={styles.list}
        keyboardShouldPersistTaps="handled"
        renderItem={({ item }) => (
          <VideoCard item={item} onPress={() => router.push(`/item/${item.id}`)} />
        )}
        ListEmptyComponent={
          <EmptyState
            icon="🔍"
            title={query ? 'No matches' : 'Search your library'}
            subtitle={
              query
                ? 'Try a different keyword, artist, or tag.'
                : 'Find videos by caption, song, artist, author, or tag.'
            }
          />
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: theme.colors.bg },
  header: { paddingHorizontal: 16, paddingVertical: 12, gap: 12 },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  title: { color: theme.colors.text, fontSize: 28, fontWeight: '800' },
  tagsLink: { color: theme.colors.accent, fontSize: 15, fontWeight: '700' },
  filterRow: { gap: 8, paddingRight: 8, alignItems: 'center' },
  sep: { width: 1, height: 24, backgroundColor: theme.colors.border, marginHorizontal: 2 },
  sortRow: { flexDirection: 'row', gap: 18 },
  sort: { color: theme.colors.textMuted, fontSize: 13, fontWeight: '600' },
  sortActive: { color: theme.colors.accent },
  list: { padding: 12, gap: 12, flexGrow: 1 },
  row: { gap: 12 },
});
