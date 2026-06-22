import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Image } from 'expo-image';
import {
  Link,
  Stack,
  useFocusEffect,
  useLocalSearchParams,
  useRouter,
} from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';

import {
  getItem,
  moveItemToFolder,
  restoreItem,
  setItemTags,
  softDeleteItem,
} from '@/repositories/items';
import { getTrack } from '@/repositories/tracks';
import { listFolders } from '@/repositories/folders';
import { suggestTags } from '@/repositories/tags';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/components/ui/Toast';
import { VideoPlayerView } from '@/components/VideoPlayerView';
import { isLocalFile } from '@/services/media';
import type { Folder, SavedItem } from '@/types';
import { theme } from '@/theme';

export default function ItemDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const db = useSQLiteContext();
  const router = useRouter();
  const toast = useToast();
  const [item, setItem] = useState<SavedItem | null>(null);
  const [folders, setFolders] = useState<Folder[]>([]);
  const [tagInput, setTagInput] = useState('');
  const [suggestions, setSuggestions] = useState<string[]>([]);

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

  const existingTags = useMemo(() => item?.tags ?? [], [item?.tags]);
  useEffect(() => {
    let active = true;
    // suggestTags returns [] for empty input, so this also clears suggestions.
    suggestTags(db, tagInput).then((s) => {
      if (active) setSuggestions(s.filter((t) => !existingTags.includes(t)));
    });
    return () => {
      active = false;
    };
  }, [db, tagInput, existingTags]);

  if (!item) {
    return (
      <View style={styles.center}>
        <Text style={styles.muted}>Loading…</Text>
      </View>
    );
  }

  const addTag = async (value?: string) => {
    const t = (value ?? tagInput).trim();
    if (!t) return;
    const next = Array.from(new Set([...(item.tags ?? []), t.toLowerCase()]));
    await setItemTags(db, item.id, next);
    setTagInput('');
    setSuggestions([]);
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

  const handleDelete = async () => {
    const deletedId = item.id;
    await softDeleteItem(db, deletedId);
    router.back();
    toast.show('Video deleted', {
      label: 'Undo',
      onPress: () => restoreItem(db, deletedId),
    });
  };

  const music = item.track
    ? [item.track.title, item.track.artist].filter(Boolean).join(' · ')
    : null;

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Stack.Screen
        options={{
          headerRight: () => (
            <Link href={`/edit/${item.id}`} asChild>
              <Pressable hitSlop={10}>
                <Text style={styles.headerEdit}>Edit</Text>
              </Pressable>
            </Link>
          ),
        }}
      />

      {isLocalFile(item.mediaUri) ? (
        <VideoPlayerView uri={item.mediaUri!} />
      ) : item.thumbnailUri ? (
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
        <Pressable
          style={styles.section}
          onPress={() => item.trackId && router.push(`/track/${item.trackId}`)}
        >
          <Text style={styles.sectionLabel}>Music</Text>
          <Text style={styles.music}>♪ {music} ›</Text>
        </Pressable>
      ) : null}

      {item.note ? (
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Notes</Text>
          <Text style={styles.note}>{item.note}</Text>
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
        {suggestions.length > 0 ? (
          <View style={styles.chips}>
            {suggestions.map((s) => (
              <Pressable
                key={s}
                style={styles.suggestChip}
                onPress={() => addTag(s)}
              >
                <Text style={styles.chipText}>#{s}</Text>
              </Pressable>
            ))}
          </View>
        ) : null}
        <View style={styles.tagInputRow}>
          <TextInput
            value={tagInput}
            onChangeText={setTagInput}
            placeholder="Add a tag (e.g. transition)…"
            placeholderTextColor={theme.colors.textMuted}
            style={styles.tagInput}
            autoCapitalize="none"
            onSubmitEditing={() => addTag()}
            returnKeyType="done"
          />
          <Pressable style={styles.tagAddBtn} onPress={() => addTag()}>
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

      <Button
        title="Add to a project"
        variant="secondary"
        onPress={() =>
          router.push({ pathname: '/pick-project', params: { itemId: item.id } })
        }
        style={styles.deleteBtn}
      />
      <Button
        title="Delete video"
        variant="danger"
        onPress={handleDelete}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: theme.colors.bg },
  content: { padding: 16, gap: 16, paddingBottom: 48 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.colors.bg },
  muted: { color: theme.colors.textMuted },
  headerEdit: { color: theme.colors.accent, fontWeight: '700', fontSize: 16 },
  note: { color: theme.colors.text, fontSize: 15, lineHeight: 21 },
  deleteBtn: { marginTop: 8 },
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
  suggestChip: {
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.pill,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
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
