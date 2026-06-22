import { useCallback, useState } from 'react';
import { Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import {
  Stack,
  useFocusEffect,
  useLocalSearchParams,
  useRouter,
} from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';

import { Button } from '@/components/ui/Button';
import { Field } from '@/components/ui/Field';
import { Chip } from '@/components/ui/Chip';
import { AudioPlayer } from '@/components/AudioPlayer';
import { VideoCard } from '@/components/VideoCard';
import { useToast } from '@/components/ui/Toast';
import { listItems } from '@/repositories/items';
import {
  getTrack,
  listTracks,
  mergeTracks,
  updateTrack,
} from '@/repositories/tracks';
import { isLocalFile } from '@/services/media';
import type { SavedItem, Track } from '@/types';
import { theme } from '@/theme';

export default function TrackDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const db = useSQLiteContext();
  const router = useRouter();
  const toast = useToast();

  const [track, setTrack] = useState<Track | null>(null);
  const [items, setItems] = useState<SavedItem[]>([]);
  const [others, setOthers] = useState<Track[]>([]);
  const [title, setTitle] = useState('');
  const [artist, setArtist] = useState('');

  const load = useCallback(async () => {
    const t = await getTrack(db, id);
    setTrack(t);
    setTitle(t?.title ?? '');
    setArtist(t?.artist ?? '');
    setItems(await listItems(db, { trackId: id }));
    setOthers((await listTracks(db)).filter((o) => o.id !== id));
  }, [db, id]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  if (!track) {
    return (
      <View style={styles.center}>
        <Text style={styles.muted}>Loading…</Text>
      </View>
    );
  }

  const saveMeta = async () => {
    await updateTrack(db, id, {
      title: title.trim() || null,
      artist: artist.trim() || null,
    });
    toast.show('Track updated');
    load();
  };

  const merge = async (intoId: string) => {
    await mergeTracks(db, id, intoId);
    toast.show('Tracks merged');
    router.replace(`/track/${intoId}`);
  };

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Stack.Screen options={{ title: track.title || 'Track' }} />

      {track.fileUri && isLocalFile(track.fileUri) ? (
        <AudioPlayer uri={track.fileUri} />
      ) : null}
      {track.externalUrl ? (
        <Pressable
          style={styles.openBtn}
          onPress={() => Linking.openURL(track.externalUrl!)}
        >
          <Text style={styles.openBtnText}>Open in {track.source} ↗</Text>
        </Pressable>
      ) : null}

      <View style={styles.section}>
        <Field label="Song" value={title} onChangeText={setTitle} />
        <Field label="Artist" value={artist} onChangeText={setArtist} />
        <Button title="Save details" onPress={saveMeta} />
      </View>

      <Text style={styles.sectionLabel}>
        Used in {items.length} {items.length === 1 ? 'video' : 'videos'}
      </Text>
      <View style={styles.grid}>
        {items.map((item) => (
          <View key={item.id} style={styles.cell}>
            <VideoCard item={item} onPress={() => router.push(`/item/${item.id}`)} />
          </View>
        ))}
      </View>

      {others.length > 0 ? (
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Merge into another track</Text>
          <Text style={styles.hint}>
            Combines duplicates: this track&apos;s videos move to the one you
            pick, and this entry is removed.
          </Text>
          <View style={styles.chips}>
            {others.map((o) => (
              <Chip
                key={o.id}
                label={[o.title, o.artist].filter(Boolean).join(' · ') || 'Untitled'}
                onPress={() => merge(o.id)}
              />
            ))}
          </View>
        </View>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: theme.colors.bg },
  content: { padding: 16, gap: 16, paddingBottom: 48 },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.bg,
  },
  muted: { color: theme.colors.textMuted },
  openBtn: {
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.md,
    paddingVertical: 13,
    alignItems: 'center',
  },
  openBtnText: { color: theme.colors.text, fontWeight: '600' },
  section: { gap: 10 },
  sectionLabel: {
    color: theme.colors.textMuted,
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  hint: { color: theme.colors.textMuted, fontSize: 13, lineHeight: 18 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  cell: { width: '47%' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
});
