import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import { colors, radius, type } from '@/lib/theme';
import { RecordingEntry } from '@/lib/types';

interface Descriptor {
  label: string;
  color: string;
  busy?: boolean;
}

export function describeStatus(entry: RecordingEntry): Descriptor {
  switch (entry.status) {
    case 'pending':
      return entry.transcript
        ? { label: 'Waiting to sync', color: colors.textDim }
        : { label: 'Waiting', color: colors.textDim };
    case 'transcribing':
      return { label: 'Transcribing', color: colors.accent, busy: true };
    case 'syncing':
      return { label: 'Syncing to Notion', color: colors.accent, busy: true };
    case 'synced':
      return { label: 'In Notion ✓', color: colors.success };
    case 'error':
      return { label: 'Needs attention', color: colors.danger };
  }
}

export function StatusPill({ entry }: { entry: RecordingEntry }) {
  const { label, color, busy } = describeStatus(entry);
  return (
    <View style={[styles.pill, { borderColor: color }]}>
      {busy && <ActivityIndicator size="small" color={color} style={styles.spinner} />}
      <Text style={[styles.text, { color }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderRadius: radius.full,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  spinner: { marginRight: 5, transform: [{ scale: 0.55 }] },
  text: { fontSize: type.tiny, fontWeight: '600' },
});
