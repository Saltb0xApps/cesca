import { Pressable, StyleSheet, Text } from 'react-native';

import { theme } from '@/theme';

export function Chip({
  label,
  active,
  onPress,
}: {
  label: string;
  active?: boolean;
  onPress?: () => void;
}) {
  return (
    <Pressable
      disabled={!onPress}
      onPress={onPress}
      style={[styles.chip, active && styles.active]}
    >
      <Text style={[styles.text, active && styles.activeText]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: {
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.pill,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  active: {
    backgroundColor: theme.colors.accentSoft,
    borderColor: theme.colors.accent,
  },
  text: { color: theme.colors.text, fontSize: 13, fontWeight: '500' },
  activeText: { color: theme.colors.text },
});
