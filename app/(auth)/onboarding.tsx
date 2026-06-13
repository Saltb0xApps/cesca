import { useState } from 'react';
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { useProfileStore } from '@/stores/profileStore';
import { colors } from '@/theme';

const AVATARS = ['🍅', '🔥', '📚', '🧠', '⚡️', '🦉', '🌙', '☕️', '🎯', '🏆'];
const EXAM_SUGGESTIONS = ['USMLE', 'Bar Exam', 'A-Levels', 'Finals', 'Thesis'];

export default function Onboarding() {
  const router = useRouter();
  const { demoMode } = useAuth();
  const saveProfile = useProfileStore((s) => s.save);
  const [name, setName] = useState('');
  const [avatar, setAvatar] = useState(AVATARS[0]!);
  const [examTag, setExamTag] = useState('');
  const [busy, setBusy] = useState(false);

  const save = async () => {
    if (name.trim().length < 2) {
      Alert.alert('Pick a display name');
      return;
    }

    // Always persist locally so the profile flows through the app.
    await saveProfile({
      displayName: name.trim(),
      avatar,
      examTag: examTag.trim(),
    });

    // Demo mode: no Supabase — go straight in.
    if (demoMode) {
      router.replace('/(tabs)');
      return;
    }

    setBusy(true);
    const { data: userData } = await supabase.auth.getUser();
    const userId = userData.user?.id;
    if (!userId) {
      setBusy(false);
      Alert.alert('Not signed in');
      return;
    }
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone ?? 'UTC';
    const { error } = await supabase.from('profiles').upsert({
      id: userId,
      display_name: name.trim(),
      avatar,
      exam_tag: examTag.trim() || null,
      timezone,
    });
    setBusy(false);
    if (error) {
      Alert.alert('Could not save profile', error.message);
      return;
    }
    router.replace('/(tabs)');
  };

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.title}>Set up your profile</Text>

        <Text style={styles.label}>Display name</Text>
        <TextInput
          style={styles.input}
          placeholder="e.g. Akhil"
          placeholderTextColor={colors.subtle}
          value={name}
          onChangeText={setName}
        />

        <Text style={styles.label}>Avatar</Text>
        <View style={styles.row}>
          {AVATARS.map((a) => (
            <Pressable
              key={a}
              style={[styles.avatar, avatar === a && styles.avatarOn]}
              onPress={() => setAvatar(a)}
            >
              <Text style={styles.avatarText}>{a}</Text>
            </Pressable>
          ))}
        </View>

        <Text style={styles.label}>What are you grinding for?</Text>
        <TextInput
          style={styles.input}
          placeholder="USMLE Step 1, Finals, Thesis…"
          placeholderTextColor={colors.subtle}
          value={examTag}
          onChangeText={setExamTag}
        />
        <View style={styles.row}>
          {EXAM_SUGGESTIONS.map((s) => (
            <Pressable key={s} style={styles.chip} onPress={() => setExamTag(s)}>
              <Text style={styles.chipText}>{s}</Text>
            </Pressable>
          ))}
        </View>

        <Pressable style={styles.button} onPress={save} disabled={busy}>
          <Text style={styles.buttonText}>{busy ? 'Saving…' : 'Start competing'}</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  container: { padding: 24, gap: 12 },
  title: { fontSize: 26, fontWeight: '800', color: colors.ink, marginBottom: 8 },
  label: { fontSize: 14, fontWeight: '700', color: colors.subtle, marginTop: 10 },
  input: {
    backgroundColor: colors.card,
    borderColor: colors.line,
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
    fontSize: 18,
    color: colors.ink,
  },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.card,
    borderColor: colors.line,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarOn: { borderColor: colors.tomato, borderWidth: 2 },
  avatarText: { fontSize: 24 },
  chip: {
    backgroundColor: colors.card,
    borderColor: colors.line,
    borderWidth: 1,
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  chipText: { color: colors.ink, fontWeight: '600' },
  button: {
    backgroundColor: colors.tomato,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginTop: 20,
  },
  buttonText: { color: '#fff', fontSize: 17, fontWeight: '700' },
});
