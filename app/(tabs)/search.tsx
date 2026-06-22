import { useEffect, useState } from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { SafeAreaView } from 'react-native-safe-area-context';

import { EmptyState } from '@/components/EmptyState';
import { SearchBar } from '@/components/SearchBar';
import { VideoCard } from '@/components/VideoCard';
import { searchItems } from '@/repositories/items';
import type { SavedItem } from '@/types';
import { theme } from '@/theme';

export default function SearchScreen() {
  const db = useSQLiteContext();
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SavedItem[]>([]);

  useEffect(() => {
    let active = true;
    const handle = setTimeout(() => {
      searchItems(db, query).then((rows) => {
        if (active) setResults(rows);
      });
    }, 150);
    return () => {
      active = false;
      clearTimeout(handle);
    };
  }, [db, query]);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>Search</Text>
        <SearchBar value={query} onChangeText={setQuery} />
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
  title: { color: theme.colors.text, fontSize: 28, fontWeight: '800' },
  list: { padding: 12, gap: 12, flexGrow: 1 },
  row: { gap: 12 },
});
