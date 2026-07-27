import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from 'react-native';

import { Field } from '@/components/Field';
import { PrimaryButton } from '@/components/PrimaryButton';
import { Screen } from '@/components/Screen';
import { formatHHMM, parseHHMM } from '@/lib/format';
import { parseNotionPageId } from '@/lib/notionBlocks';
import { loadSecrets, saveSecrets } from '@/lib/secrets';
import { useAppStore } from '@/lib/store';
import { colors, radius, spacing, type } from '@/lib/theme';
import { testNotionConnection } from '@/services/notion';
import { rescheduleReminders, sendPreviewNotification } from '@/services/reminders';
import { processPending } from '@/services/sync';

const TIME_PRESETS = ['20:30', '21:00', '21:30', '22:00'];

export default function SettingsScreen() {
  const router = useRouter();
  const settings = useAppStore((s) => s.settings);
  const updateSettings = useAppStore((s) => s.updateSettings);

  const [notionToken, setNotionToken] = useState('');
  const [openaiKey, setOpenaiKey] = useState('');
  const [pageInput, setPageInput] = useState(settings.notionPageInput);
  const [knowledgeInput, setKnowledgeInput] = useState(settings.knowledgePageInput);
  const [reminderEnabled, setReminderEnabled] = useState(settings.reminderEnabled);
  const [timeText, setTimeText] = useState(
    formatHHMM(settings.reminderHour, settings.reminderMinute),
  );
  const [questionsText, setQuestionsText] = useState(settings.questions.join('\n'));
  const [testing, setTesting] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadSecrets().then((secrets) => {
      if (secrets.notionToken) setNotionToken(secrets.notionToken);
      if (secrets.openaiKey) setOpenaiKey(secrets.openaiKey);
    });
  }, []);

  const parsedPageId = parseNotionPageId(pageInput);
  const parsedKnowledgeId = parseNotionPageId(knowledgeInput);

  const testConnection = async () => {
    if (!notionToken.trim() || !parsedPageId) {
      Alert.alert(
        'Missing details',
        'Enter the integration token and a valid Braindump page link first.',
      );
      return;
    }
    setTesting(true);
    try {
      const lines: string[] = [];
      const braindump = await testNotionConnection({
        token: notionToken.trim(),
        pageId: parsedPageId,
      });
      lines.push(`Braindumps → “${braindump.pageTitle}”`);
      if (parsedKnowledgeId) {
        const knowledge = await testNotionConnection({
          token: notionToken.trim(),
          pageId: parsedKnowledgeId,
        });
        lines.push(`Knowledge → “${knowledge.pageTitle}”`);
      }
      Alert.alert('Connected ✓', lines.join('\n'));
    } catch (e) {
      Alert.alert('Connection failed', e instanceof Error ? e.message : String(e));
    } finally {
      setTesting(false);
    }
  };

  const save = async () => {
    const time = parseHHMM(timeText);
    if (!time) {
      Alert.alert('Invalid time', 'Use 24-hour HH:MM, for example 21:30.');
      return;
    }
    if (pageInput.trim() && !parsedPageId) {
      Alert.alert(
        'Braindump page link looks off',
        'Paste the full page URL from Share → Copy link (or the 32-character page ID).',
      );
      return;
    }
    if (knowledgeInput.trim() && !parsedKnowledgeId) {
      Alert.alert(
        'Knowledge page link looks off',
        'Paste the full page URL from Share → Copy link (or the 32-character page ID).',
      );
      return;
    }
    const questions = questionsText
      .split('\n')
      .map((q) => q.trim())
      .filter((q) => q.length > 0);

    setSaving(true);
    try {
      await saveSecrets({ notionToken, openaiKey });
      updateSettings({
        notionPageInput: pageInput.trim(),
        notionPageId: parsedPageId,
        knowledgePageInput: knowledgeInput.trim(),
        knowledgePageId: parsedKnowledgeId,
        reminderEnabled,
        reminderHour: time.hour,
        reminderMinute: time.minute,
        questions,
      });
      await rescheduleReminders(useAppStore.getState().settings);
      // If keys were just added, unstick anything that failed without them.
      processPending().catch(() => {});
      Alert.alert('Saved ✓', 'Settings updated.', [
        { text: 'Done', onPress: () => router.back() },
      ]);
    } finally {
      setSaving(false);
    }
  };

  const preview = async () => {
    const ok = await sendPreviewNotification(useAppStore.getState().settings);
    if (!ok) {
      Alert.alert(
        'Notifications blocked',
        'Enable notifications for Cesca in system settings to get the nightly reminder.',
      );
    }
  };

  return (
    <Screen style={{ paddingBottom: 0 }}>
      <View style={styles.header}>
        <Pressable hitSlop={10} onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={24} color={colors.text} />
        </Pressable>
        <Text style={styles.title}>Settings</Text>
        <View style={{ width: 24 }} />
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ paddingBottom: spacing.xl * 2 }}
        >
          <SectionTitle label="Notion" />
          <Text style={styles.help}>
            1. Create an internal integration at{' '}
            <Text style={styles.link} onPress={() => Linking.openURL('https://www.notion.so/my-integrations')}>
              notion.so/my-integrations
            </Text>{' '}
            and copy its secret.{'\n'}
            2. Open your target page in Notion → ⋯ menu → Connections → add the
            integration.{'\n'}
            3. Paste the page link below (Share → Copy link).
          </Text>
          <Field
            label="Integration token"
            value={notionToken}
            onChangeText={setNotionToken}
            placeholder="ntn_… or secret_…"
            secureTextEntry
          />
          <Field
            label="Braindump page link"
            value={pageInput}
            onChangeText={setPageInput}
            placeholder="https://www.notion.so/Brain-Time-…"
            hint={
              pageInput.trim()
                ? parsedPageId
                  ? `Page ID: ${parsedPageId}`
                  : 'No page ID found in this link yet'
                : 'Nightly braindumps are appended to the very end of this page.'
            }
          />
          <Field
            label="Knowledge page link (optional)"
            value={knowledgeInput}
            onChangeText={setKnowledgeInput}
            placeholder="https://www.notion.so/Knowledge-…"
            hint={
              knowledgeInput.trim()
                ? parsedKnowledgeId
                  ? `Page ID: ${parsedKnowledgeId}`
                  : 'No page ID found in this link yet'
                : 'Recordings marked 📚 Knowledge land here. Remember to connect your integration to this page too.'
            }
          />
          <PrimaryButton
            label="Test connection"
            variant="ghost"
            onPress={testConnection}
            loading={testing}
          />

          <SectionTitle label="Transcription" style={{ marginTop: spacing.xl }} />
          <Field
            label="OpenAI API key"
            value={openaiKey}
            onChangeText={setOpenaiKey}
            placeholder="sk-…"
            secureTextEntry
            hint="Used only to transcribe your recordings (gpt-4o-mini-transcribe, ≈$0.003/min). Stored in the phone's keychain."
          />

          <SectionTitle label="Nightly reminder" style={{ marginTop: spacing.xl }} />
          <View style={styles.switchRow}>
            <Text style={styles.switchLabel}>Remind me every night</Text>
            <Switch
              value={reminderEnabled}
              onValueChange={setReminderEnabled}
              trackColor={{ true: colors.accent, false: colors.surfaceAlt }}
              thumbColor="#FFFFFF"
            />
          </View>
          <Field
            label="Time (24h)"
            value={timeText}
            onChangeText={setTimeText}
            placeholder="21:30"
            keyboardType="numbers-and-punctuation"
          />
          <View style={styles.chips}>
            {TIME_PRESETS.map((t) => (
              <Pressable
                key={t}
                onPress={() => setTimeText(t)}
                style={[styles.chip, timeText === t && styles.chipActive]}
              >
                <Text style={[styles.chipText, timeText === t && styles.chipTextActive]}>
                  {t}
                </Text>
              </Pressable>
            ))}
          </View>
          <PrimaryButton label="Send a test notification" variant="ghost" onPress={preview} />

          <SectionTitle label="Nightly questions" style={{ marginTop: spacing.xl }} />
          <Field
            label="One question per line"
            value={questionsText}
            onChangeText={setQuestionsText}
            multiline
            autoCapitalize="sentences"
            autoCorrect
            hint="The reminder rotates through these, one per night, and the question is saved alongside each transcript."
          />

          <PrimaryButton
            label="Save"
            onPress={save}
            loading={saving}
            style={{ marginTop: spacing.md }}
          />
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}

function SectionTitle({ label, style }: { label: string; style?: object }) {
  return <Text style={[styles.section, style]}>{label}</Text>;
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
    marginTop: spacing.xs,
  },
  backBtn: { padding: 2 },
  title: { color: colors.text, fontSize: type.body, fontWeight: '700' },
  section: {
    color: colors.accent,
    fontSize: type.tiny,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1.2,
    marginBottom: spacing.sm,
  },
  help: {
    color: colors.textFaint,
    fontSize: type.small,
    lineHeight: 20,
    marginBottom: spacing.md,
  },
  link: { color: colors.accent, textDecorationLine: 'underline' },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  switchLabel: { color: colors.text, fontSize: type.body },
  chips: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.md },
  chip: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.full,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: colors.surfaceAlt,
  },
  chipActive: { borderColor: colors.accent, backgroundColor: 'rgba(240, 179, 92, 0.15)' },
  chipText: { color: colors.textDim, fontSize: type.small, fontVariant: ['tabular-nums'] },
  chipTextActive: { color: colors.accent, fontWeight: '600' },
});
