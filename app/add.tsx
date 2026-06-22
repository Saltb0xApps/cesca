import { useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';

import { ingestShare } from '@/services/ingest';
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

  return (
    <View style={styles.screen}>
      <Text style={styles.label}>Paste a reel or video link</Text>
      <TextInput
        value={url}
        onChangeText={setUrl}
        placeholder="https://www.instagram.com/reel/…"
        placeholderTextColor={theme.colors.textMuted}
        style={styles.input}
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
      <Pressable
        style={[styles.btn, (!url.trim() || busy) && styles.btnDisabled]}
        onPress={save}
        disabled={!url.trim() || busy}
      >
        {busy ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.btnText}>Save to library</Text>
        )}
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: theme.colors.bg, padding: 20, gap: 14 },
  label: { color: theme.colors.text, fontSize: 18, fontWeight: '700' },
  input: {
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.md,
    paddingHorizontal: 16,
    height: 50,
    color: theme.colors.text,
    fontSize: 16,
  },
  hint: { color: theme.colors.textMuted, fontSize: 13, lineHeight: 19 },
  btn: {
    backgroundColor: theme.colors.accent,
    borderRadius: theme.radius.md,
    paddingVertical: 15,
    alignItems: 'center',
    marginTop: 4,
  },
  btnDisabled: { opacity: 0.5 },
  btnText: { color: '#fff', fontWeight: '700', fontSize: 16 },
});
