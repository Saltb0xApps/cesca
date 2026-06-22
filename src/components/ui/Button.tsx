import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import * as Haptics from 'expo-haptics';

import { theme } from '@/theme';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';
type Size = 'sm' | 'md';

export function Button({
  title,
  onPress,
  variant = 'primary',
  size = 'md',
  disabled,
  loading,
  haptic = true,
  style,
}: {
  title: string;
  onPress: () => void;
  variant?: Variant;
  size?: Size;
  disabled?: boolean;
  loading?: boolean;
  haptic?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const isDisabled = disabled || loading;
  return (
    <Pressable
      accessibilityRole="button"
      disabled={isDisabled}
      onPress={() => {
        if (haptic) Haptics.selectionAsync();
        onPress();
      }}
      style={({ pressed }) => [
        styles.base,
        styles[size],
        VARIANT_STYLE[variant],
        pressed && styles.pressed,
        isDisabled && styles.disabled,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={VARIANT_TEXT[variant].color} size="small" />
      ) : (
        <Text style={[styles.text, styles[`${size}Text`], VARIANT_TEXT[variant]]}>
          {title}
        </Text>
      )}
    </Pressable>
  );
}

const VARIANT_STYLE: Record<Variant, ViewStyle> = {
  primary: { backgroundColor: theme.colors.accent },
  secondary: {
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  ghost: { backgroundColor: 'transparent' },
  danger: { backgroundColor: theme.colors.danger },
};

const VARIANT_TEXT: Record<Variant, { color: string }> = {
  primary: { color: '#fff' },
  secondary: { color: theme.colors.text },
  ghost: { color: theme.colors.accent },
  danger: { color: '#fff' },
};

const styles = StyleSheet.create({
  base: {
    borderRadius: theme.radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sm: { paddingVertical: 9, paddingHorizontal: 14 },
  md: { paddingVertical: 14, paddingHorizontal: 18 },
  pressed: { opacity: 0.75 },
  disabled: { opacity: 0.45 },
  text: { fontWeight: '700' },
  smText: { fontSize: 14 },
  mdText: { fontSize: 16 },
});
