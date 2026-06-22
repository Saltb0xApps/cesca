import { useCallback, useState } from 'react';
import {
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { SafeAreaView } from 'react-native-safe-area-context';

import { EmptyState } from '@/components/EmptyState';
import { createFolder, listFolders } from '@/repositories/folders';
import type { Folder } from '@/types';
import { folderColors, theme } from '@/theme';

export default function FoldersScreen() {
  const db = useSQLiteContext();
  const router = useRouter();
  const [folders, setFolders] = useState<Folder[]>([]);
  const [name, setName] = useState('');

  const reload = useCallback(() => {
    listFolders(db).then(setFolders);
  }, [db]);

  useFocusEffect(
    useCallback(() => {
      reload();
    }, [reload])
  );

  const addFolder = async () => {
    if (!name.trim()) return;
    const color = folderColors[folders.length % folderColors.length];
    await createFolder(db, name.trim(), color);
    setName('');
    reload();
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>Folders</Text>
        <View style={styles.addRow}>
          <TextInput
            value={name}
            onChangeText={setName}
            placeholder="New folder name…"
            placeholderTextColor={theme.colors.textMuted}
            style={styles.input}
            onSubmitEditing={addFolder}
            returnKeyType="done"
          />
          <Pressable style={styles.addBtn} onPress={addFolder}>
            <Text style={styles.addBtnText}>Create</Text>
          </Pressable>
        </View>
      </View>

      <FlatList
        data={folders}
        keyExtractor={(f) => f.id}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <Pressable
            style={styles.folderRow}
            onPress={() => router.push(`/folder/${item.id}`)}
          >
            <View
              style={[
                styles.swatch,
                { backgroundColor: item.color ?? theme.colors.accent },
              ]}
            />
            <Text style={styles.folderName}>{item.name}</Text>
            <Text style={styles.count}>{item.itemCount ?? 0}</Text>
          </Pressable>
        )}
        ListEmptyComponent={
          <EmptyState
            icon="🗂️"
            title="No folders yet"
            subtitle="Create folders like 'Travel edits', 'Hooks', or 'Transitions' to organise your saves."
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
  addRow: { flexDirection: 'row', gap: 10 },
  input: {
    flex: 1,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.md,
    paddingHorizontal: 14,
    height: 46,
    color: theme.colors.text,
  },
  addBtn: {
    backgroundColor: theme.colors.accent,
    paddingHorizontal: 18,
    borderRadius: theme.radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addBtnText: { color: '#fff', fontWeight: '700' },
  list: { padding: 12, gap: 8, flexGrow: 1 },
  folderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  swatch: { width: 14, height: 14, borderRadius: 4 },
  folderName: { flex: 1, color: theme.colors.text, fontSize: 16, fontWeight: '600' },
  count: { color: theme.colors.textMuted, fontSize: 15, fontWeight: '600' },
});
