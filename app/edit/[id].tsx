import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';

import { Button } from '@/components/ui/Button';
import { Field } from '@/components/ui/Field';
import { useToast } from '@/components/ui/Toast';
import { getItem, setItemTrack, updateItem } from '@/repositories/items';
import { getTrack, upsertTrackByName } from '@/repositories/tracks';
import { theme } from '@/theme';

export default function EditItemScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const db = useSQLiteContext();
  const router = useRouter();
  const toast = useToast();

  const [loaded, setLoaded] = useState(false);
  const [saving, setSaving] = useState(false);
  const [caption, setCaption] = useState('');
  const [author, setAuthor] = useState('');
  const [note, setNote] = useState('');
  const [musicTitle, setMusicTitle] = useState('');
  const [musicArtist, setMusicArtist] = useState('');

  useEffect(() => {
    let active = true;
    (async () => {
      const item = await getItem(db, id);
      if (!item || !active) return;
      setCaption(item.caption ?? item.title ?? '');
      setAuthor(item.author ?? '');
      setNote(item.note ?? '');
      if (item.trackId) {
        const track = await getTrack(db, item.trackId);
        if (!active) return;
        setMusicTitle(track?.title ?? '');
        setMusicArtist(track?.artist ?? '');
      }
      setLoaded(true);
    })();
    return () => {
      active = false;
    };
  }, [db, id]);

  const save = async () => {
    if (saving) return;
    setSaving(true);
    try {
      await updateItem(db, id, {
        caption: caption.trim() || null,
        author: author.trim() || null,
        note: note.trim() || null,
      });
      if (musicTitle.trim() || musicArtist.trim()) {
        const trackId = await upsertTrackByName(db, {
          title: musicTitle.trim() || null,
          artist: musicArtist.trim() || null,
          source: 'reel',
        });
        await setItemTrack(db, id, trackId);
      } else {
        await setItemTrack(db, id, null);
      }
      toast.show('Saved');
      router.back();
    } finally {
      setSaving(false);
    }
  };

  if (!loaded) {
    return (
      <View style={styles.center}>
        <Text style={styles.muted}>Loading…</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Field
        label="Caption"
        value={caption}
        onChangeText={setCaption}
        placeholder="What's in this clip…"
        multiline
        style={styles.multiline}
      />
      <Field
        label="Author / handle"
        value={author}
        onChangeText={setAuthor}
        placeholder="@creator"
        autoCapitalize="none"
      />
      <View style={styles.musicRow}>
        <View style={styles.flex}>
          <Field
            label="Song"
            value={musicTitle}
            onChangeText={setMusicTitle}
            placeholder="Song title"
          />
        </View>
        <View style={styles.flex}>
          <Field
            label="Artist"
            value={musicArtist}
            onChangeText={setMusicArtist}
            placeholder="Artist"
          />
        </View>
      </View>
      <Field
        label="Notes"
        value={note}
        onChangeText={setNote}
        placeholder="e.g. Use for the intro / great transition at 0:04"
        multiline
        style={styles.multiline}
      />
      <Button title="Save changes" onPress={save} loading={saving} />
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
  multiline: { minHeight: 90, paddingTop: 12, textAlignVertical: 'top' },
  musicRow: { flexDirection: 'row', gap: 12 },
  flex: { flex: 1 },
});
