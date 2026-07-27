import { Ionicons } from '@expo/vector-icons';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';

import { StatusPill } from '@/components/StatusPill';
import { formatDayTime, formatDuration } from '@/lib/format';
import { colors, radius, spacing, type } from '@/lib/theme';
import { RecordingEntry } from '@/lib/types';

export function RecordingRow({
  entry,
  onPress,
  onArchiveToggle,
  onDelete,
}: {
  entry: RecordingEntry;
  onPress: () => void;
  onArchiveToggle: () => void;
  onDelete: () => void;
}) {
  const confirmDelete = () => {
    Alert.alert(
      'Delete recording?',
      'Removes the audio and transcript from this phone. Anything already synced to Notion stays in Notion.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: onDelete },
      ],
    );
  };

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.card, pressed && { opacity: 0.8 }]}
    >
      <View style={styles.topRow}>
        <Text style={styles.date}>{formatDayTime(entry.createdAt)}</Text>
        <Text style={styles.duration}>{formatDuration(entry.durationMillis)}</Text>
      </View>

      {entry.transcript ? (
        <Text style={styles.preview} numberOfLines={2}>
          {entry.transcript}
        </Text>
      ) : null}

      <View style={styles.bottomRow}>
        <StatusPill entry={entry} />
        <View style={styles.actions}>
          <Pressable hitSlop={10} onPress={onArchiveToggle} style={styles.iconBtn}>
            <Ionicons
              name={entry.archived ? 'arrow-up-circle-outline' : 'archive-outline'}
              size={19}
              color={colors.textDim}
            />
          </Pressable>
          <Pressable hitSlop={10} onPress={confirmDelete} style={styles.iconBtn}>
            <Ionicons name="trash-outline" size={19} color={colors.textDim} />
          </Pressable>
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    marginBottom: spacing.sm + 2,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
  },
  date: { color: colors.text, fontSize: type.body, fontWeight: '600' },
  duration: { color: colors.textFaint, fontSize: type.small, fontVariant: ['tabular-nums'] },
  preview: {
    color: colors.textDim,
    fontSize: type.small,
    lineHeight: 19,
    marginTop: 6,
  },
  bottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.sm + 2,
  },
  actions: { flexDirection: 'row', gap: spacing.md },
  iconBtn: { padding: 2 },
});
