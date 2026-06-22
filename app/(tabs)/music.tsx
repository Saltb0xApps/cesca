import { useCallback, useState } from 'react';
import {
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useFocusEffect } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import * as DocumentPicker from 'expo-document-picker';
import { SafeAreaView } from 'react-native-safe-area-context';

import { EmptyState } from '@/components/EmptyState';
import { SearchBar } from '@/components/SearchBar';
import {
  createTrack,
  deleteTrack,
  searchTracks,
} from '@/repositories/tracks';
import { ingestMusicLink } from '@/services/ingest';
import type { Track } from '@/types';
import { theme } from '@/theme';

const SOURCE_LABEL: Record<Track['source'], string> = {
  reel: 'From reel',
  upload: 'Uploaded',
  spotify: 'Spotify',
  youtube: 'YouTube',
  soundcloud: 'SoundCloud',
  other: 'Link',
};

export default function MusicScreen() {
  const db = useSQLiteContext();
  const [query, setQuery] = useState('');
  const [tracks, setTracks] = useState<Track[]>([]);
  const [showLinkForm, setShowLinkForm] = useState(false);
  const [linkUrl, setLinkUrl] = useState('');
  const [linkTitle, setLinkTitle] = useState('');

  const reload = useCallback(() => {
    searchTracks(db, query).then(setTracks);
  }, [db, query]);

  useFocusEffect(
    useCallback(() => {
      reload();
    }, [reload])
  );

  const onChangeQuery = (q: string) => {
    setQuery(q);
    searchTracks(db, q).then(setTracks);
  };

  const pickAudioFile = async () => {
    const res = await DocumentPicker.getDocumentAsync({
      type: 'audio/*',
      copyToCacheDirectory: true,
    });
    if (res.canceled || !res.assets?.[0]) return;
    const asset = res.assets[0];
    await createTrack(db, {
      title: asset.name.replace(/\.[^.]+$/, ''),
      source: 'upload',
      fileUri: asset.uri,
    });
    reload();
  };

  const saveLink = async () => {
    if (!linkUrl.trim()) return;
    await ingestMusicLink(db, linkUrl.trim(), linkTitle.trim() || undefined);
    setLinkUrl('');
    setLinkTitle('');
    setShowLinkForm(false);
    reload();
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>Music</Text>
        <SearchBar
          value={query}
          onChangeText={onChangeQuery}
          placeholder="Search songs & artists…"
        />
        <View style={styles.actions}>
          <Pressable style={styles.action} onPress={pickAudioFile}>
            <Text style={styles.actionText}>↑ Add audio file</Text>
          </Pressable>
          <Pressable
            style={styles.action}
            onPress={() => setShowLinkForm((s) => !s)}
          >
            <Text style={styles.actionText}>🔗 Add link</Text>
          </Pressable>
        </View>
        {showLinkForm ? (
          <View style={styles.form}>
            <TextInput
              value={linkUrl}
              onChangeText={setLinkUrl}
              placeholder="Spotify / YouTube / SoundCloud URL"
              placeholderTextColor={theme.colors.textMuted}
              autoCapitalize="none"
              autoCorrect={false}
              style={styles.input}
            />
            <TextInput
              value={linkTitle}
              onChangeText={setLinkTitle}
              placeholder="Song name (optional)"
              placeholderTextColor={theme.colors.textMuted}
              style={styles.input}
            />
            <Pressable style={styles.saveBtn} onPress={saveLink}>
              <Text style={styles.saveBtnText}>Save track</Text>
            </Pressable>
          </View>
        ) : null}
      </View>

      <FlatList
        data={tracks}
        keyExtractor={(t) => t.id}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <View style={styles.trackRow}>
            <View style={styles.trackIcon}>
              <Text style={{ fontSize: 18 }}>🎵</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.trackTitle} numberOfLines={1}>
                {item.title || 'Untitled track'}
              </Text>
              <Text style={styles.trackSub} numberOfLines={1}>
                {[item.artist, SOURCE_LABEL[item.source]]
                  .filter(Boolean)
                  .join(' · ')}
              </Text>
            </View>
            <Pressable
              hitSlop={10}
              onPress={() => deleteTrack(db, item.id).then(reload)}
            >
              <Text style={styles.delete}>✕</Text>
            </Pressable>
          </View>
        )}
        ListEmptyComponent={
          <EmptyState
            icon="🎵"
            title="No music yet"
            subtitle="Music from saved reels lands here automatically. Add your own files or links too."
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
  actions: { flexDirection: 'row', gap: 10 },
  action: {
    flex: 1,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.md,
    paddingVertical: 11,
    alignItems: 'center',
  },
  actionText: { color: theme.colors.text, fontWeight: '600', fontSize: 14 },
  form: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: 12,
    gap: 10,
  },
  input: {
    backgroundColor: theme.colors.surfaceAlt,
    borderRadius: theme.radius.sm,
    paddingHorizontal: 12,
    height: 42,
    color: theme.colors.text,
  },
  saveBtn: {
    backgroundColor: theme.colors.accent,
    borderRadius: theme.radius.sm,
    paddingVertical: 11,
    alignItems: 'center',
  },
  saveBtnText: { color: '#fff', fontWeight: '700' },
  list: { padding: 12, gap: 8, flexGrow: 1 },
  trackRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: 12,
  },
  trackIcon: {
    width: 40,
    height: 40,
    borderRadius: theme.radius.sm,
    backgroundColor: theme.colors.accentSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  trackTitle: { color: theme.colors.text, fontSize: 15, fontWeight: '600' },
  trackSub: { color: theme.colors.textMuted, fontSize: 13, marginTop: 2 },
  delete: { color: theme.colors.textMuted, fontSize: 16, paddingHorizontal: 4 },
});
