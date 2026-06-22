import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import * as DocumentPicker from 'expo-document-picker';

import { Button } from '@/components/ui/Button';
import { Field } from '@/components/ui/Field';
import { importVideoFile, ingestShare } from '@/services/ingest';
import { theme } from '@/theme';

export default function AddLinkScreen() {
  const db = useSQLiteContext();
  const router = useRouter();
  const [url, setUrl] = useState('');
  const [busy, setBusy] = useState(false);

  const save = async () => {
    if (!url.trim() || busy) return;
    setBusy(true);
    try {
      const id = await ingestShare(db, { url: url.trim() });
      router.replace(`/item/${id}`);
    } finally {
      setBusy(false);
    }
  };

  const importVideo = async () => {
    if (busy) return;
    const res = await DocumentPicker.getDocumentAsync({
      type: 'video/*',
      copyToCacheDirectory: true,
    });
    if (res.canceled || !res.assets?.[0]) return;
    setBusy(true);
    try {
      const asset = res.assets[0];
      const id = await importVideoFile(db, asset.uri, asset.name);
      router.replace(`/item/${id}`);
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={styles.screen}>
      <Field
        label="Paste a reel or video link"
        value={url}
        onChangeText={setUrl}
        placeholder="https://www.instagram.com/reel/…"
        autoCapitalize="none"
        autoCorrect={false}
        autoFocus
        keyboardType="url"
        onSubmitEditing={save}
      />
      <Text style={styles.hint}>
        Cesca fetches the thumbnail, caption, author and any detected music. Tip:
        the fastest way is to tap Share on a reel and pick Cesca.
      </Text>
      <Button
        title="Save to library"
        onPress={save}
        loading={busy}
        disabled={!url.trim()}
      />
      <View style={styles.orRow}>
        <View style={styles.line} />
        <Text style={styles.or}>or</Text>
        <View style={styles.line} />
      </View>
      <Button
        title="Import a video from device"
        variant="secondary"
        onPress={importVideo}
        disabled={busy}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: theme.colors.bg, padding: 20, gap: 14 },
  hint: { color: theme.colors.textMuted, fontSize: 13, lineHeight: 19 },
  orRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginVertical: 4 },
  line: { flex: 1, height: 1, backgroundColor: theme.colors.border },
  or: { color: theme.colors.textMuted, fontSize: 13 },
});
