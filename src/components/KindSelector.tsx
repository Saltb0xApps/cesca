import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, radius, spacing, type } from '@/lib/theme';
import { KIND_META, RecordingKind } from '@/lib/types';

const KINDS: RecordingKind[] = ['braindump', 'knowledge', 'local'];

/** Three-way chip row: what is this recording for? */
export function KindSelector({
  value,
  onChange,
  disabled = false,
}: {
  value: RecordingKind;
  onChange: (kind: RecordingKind) => void;
  disabled?: boolean;
}) {
  return (
    <View style={[styles.row, disabled && { opacity: 0.5 }]}>
      {KINDS.map((kind) => {
        const active = kind === value;
        return (
          <Pressable
            key={kind}
            disabled={disabled}
            onPress={() => onChange(kind)}
            style={[styles.chip, active && styles.chipActive]}
          >
            <Text style={[styles.chipText, active && styles.chipTextActive]}>
              {KIND_META[kind].icon} {KIND_META[kind].label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: spacing.sm },
  chip: {
    flexGrow: 1,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.full,
    backgroundColor: colors.surfaceAlt,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  chipActive: {
    borderColor: colors.accent,
    backgroundColor: 'rgba(240, 179, 92, 0.15)',
  },
  chipText: { color: colors.textDim, fontSize: type.small - 1, fontWeight: '600' },
  chipTextActive: { color: colors.accent },
});
