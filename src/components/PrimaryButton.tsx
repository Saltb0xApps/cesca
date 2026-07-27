import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  ViewStyle,
} from 'react-native';

import { colors, radius, spacing, type } from '@/lib/theme';

type Variant = 'primary' | 'danger' | 'ghost';

export function PrimaryButton({
  label,
  onPress,
  variant = 'primary',
  loading = false,
  disabled = false,
  style,
}: {
  label: string;
  onPress: () => void;
  variant?: Variant;
  loading?: boolean;
  disabled?: boolean;
  style?: ViewStyle;
}) {
  const inactive = disabled || loading;
  return (
    <Pressable
      onPress={onPress}
      disabled={inactive}
      style={({ pressed }) => [
        styles.base,
        variantStyles[variant],
        pressed && { opacity: 0.75 },
        inactive && { opacity: 0.45 },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={variant === 'primary' ? colors.accentText : colors.text} />
      ) : (
        <Text style={[styles.label, labelStyles[variant]]}>{label}</Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: radius.md,
    paddingVertical: 14,
    paddingHorizontal: spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: { fontSize: type.body, fontWeight: '600' },
});

const variantStyles: Record<Variant, ViewStyle> = {
  primary: { backgroundColor: colors.accent },
  danger: { backgroundColor: 'rgba(229, 72, 77, 0.16)', borderWidth: 1, borderColor: colors.danger },
  ghost: { backgroundColor: colors.surfaceAlt, borderWidth: 1, borderColor: colors.border },
};

const labelStyles = StyleSheet.create({
  primary: { color: colors.accentText },
  danger: { color: colors.danger },
  ghost: { color: colors.text },
});
