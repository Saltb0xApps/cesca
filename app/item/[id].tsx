import { useCallback, useState } from 'react';
import {
  Alert,
  Image,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Stack, useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';

import {
  deleteItem,
  getItem,
  moveItemToFolder,
  setItemTags,
} from '@/repositories/items';
import { getTrack } from '@/repositories/tracks';
import { listFolders } from '@/repositories/folders';
import type { Folder, SavedItem } from '@/types';
import { theme } from '@/theme';

export default function ItemDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const db = useSQLiteContext();
  const router = useRouter();
  const [item, setItem] = useState<SavedItem | null>(null);
  const [folders, setFolders] = useState<Folder[]>([]);
  const [tagInput, setTagInput] = useState('');

  const reload = useCallback(async () => {
    const found = await getItem(db, id);
    if (found?.trackId) {
      found.track = await getTrack(db, found.trackId);
    }
    setItem(found);
    setFolders(await listFolders(db));
  }, [db, id]);

  useFocusEffect(
    useCallback(() => {
      reload();
    }, [reload])
  );

  if (!item) {
    return (
      <View style={styles.center}>
        <Text style={styles.muted}>Loading…</Text>
      </View>
    );
  }

  const addTag = async () => {
    const t = tagInput.trim();
    if (!t) return;
    const next = Array.from(new Set([...(item.tags ?? []), t.toLowerCase()]));
    await setItemTags(db, item.id, next);
    setTagInput('');
    reload();
  };

  const removeTag = async (tag: string) => {
    const next = (item.tags ?? []).filter((t) => t !== tag);
    await setItemTags(db, item.id, next);
    reload();
  };

  const assignFolder = async (folderId: string | null) => {
    await moveItemToFolder(db, item.id, folderId);
    reload();
  };

  const confirmDelete = () => {
    Alert.alert('Delete video?', 'This removes it from your library.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          await deleteItem(db, item.id);
          router.back();
        },
      },
    ]);
  };

  const music = item.track
    ? [item.track.title, item.track.artist].filter(Boolean).join(' · ')
    : null;

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Stack.Screen options={{ headerRight: () => (
        <Pressable hitSlop={10} onPress={confirmDelete}>
          <Text style={styles.headerDelete}>Delete</Text>
        </Pressable>
      ) }} />

      {item.thumbnailUri ? (
        <Image source={{ uri: item.thumbnailUri }} style={styles.hero} />
      ) : (
        <View style={[styles.hero, styles.heroFallback]}>
          <Text style={{ fontSize: 48 }}>🎬</Text>
        </View>
      )}

      {item.sourceUrl ? (
        <Pressable
          style={styles.openBtn}
          onPress={() => Linking.openURL(item.sourceUrl!)}
        >
          <Text style={styles.openBtnText}>Open original ↗</Text>
        </Pressable>
      ) : null}

      {item.caption || item.title ? (
        <Text style={styles.caption}>{item.caption || item.title}</Text>
      ) : null}
      {item.author ? <Text style={styles.author}>{item.author}</Text> : null}

      {music ? (
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Music</Text>
          <Text style={styles.music}>♪ {music}</Text>
        </View>
      ) : null}

      <View style={styles.section}>
        <Text style={styles.sectionLabel}>Tags</Text>
        <View style={styles.chips}>
          {(item.tags ?? []).map((tag) => (
            <Pressable
              key={tag}
              style={styles.chip}
              onPress={() => removeTag(tag)}
            >
              <Text style={styles.chipText}>#{tag} ✕</Text>
            </Pressable>
          ))}
        </View>
        <View style={styles.tagInputRow}>
          <TextInput
            value={tagInput}
            onChangeText={setTagInput}
            placeholder="Add a tag (e.g. transition)…"
            placeholderTextColor={theme.colors.textMuted}
            style={styles.tagInput}
            autoCapitalize="none"
            onSubmitEditing={addTag}
            returnKeyType="done"
          />
          <Pressable style={styles.tagAddBtn} onPress={addTag}>
            <Text style={styles.tagAddText}>Add</Text>
          </Pressable>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionLabel}>Folder</Text>
        <View style={styles.chips}>
          <Pressable
            style={[styles.folderChip, !item.folderId && styles.folderChipActive]}
            onPress={() => assignFolder(null)}
          >
            <Text style={styles.chipText}>None</Text>
          </Pressable>
          {folders.map((f) => (
            <Pressable
              key={f.id}
              style={[
                styles.folderChip,
                item.folderId === f.id && styles.folderChipActive,
              ]}
              onPress={() => assignFolder(f.id)}
            >
              <Text style={styles.chipText}>{f.name}</Text>
            </Pressable>
          ))}
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: theme.colors.bg },
  content: { padding: 16, gap: 16, paddingBottom: 48 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.colors.bg },
  muted: { color: theme.colors.textMuted },
  headerDelete: { color: theme.colors.danger, fontWeight: '600' },
  hero: {
    width: '100%',
    aspectRatio: 9 / 16,
    maxHeight: 420,
    borderRadius: theme.radius.lg,
    backgroundColor: theme.colors.surfaceAlt,
  },
  heroFallback: { alignItems: 'center', justifyContent: 'center' },
  openBtn: {
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.md,
    paddingVertical: 13,
    alignItems: 'center',
  },
  openBtnText: { color: theme.colors.text, fontWeight: '600' },
  caption: { color: theme.colors.text, fontSize: 16, lineHeight: 22 },
  author: { color: theme.colors.textMuted, fontSize: 14 },
  section: { gap: 8 },
  sectionLabel: {
    color: theme.colors.textMuted,
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  music: { color: theme.colors.accent, fontSize: 16, fontWeight: '600' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    backgroundColor: theme.colors.accentSoft,
    borderRadius: theme.radius.pill,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  chipText: { color: theme.colors.text, fontSize: 13, fontWeight: '500' },
  tagInputRow: { flexDirection: 'row', gap: 10 },
  tagInput: {
    flex: 1,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.md,
    paddingHorizontal: 14,
    height: 44,
    color: theme.colors.text,
  },
  tagAddBtn: {
    backgroundColor: theme.colors.accent,
    paddingHorizontal: 18,
    borderRadius: theme.radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tagAddText: { color: '#fff', fontWeight: '700' },
  folderChip: {
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.pill,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  folderChipActive: {
    backgroundColor: theme.colors.accentSoft,
    borderColor: theme.colors.accent,
  },
});
