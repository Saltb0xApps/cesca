import { StyleSheet, Text, TextInput, TextInputProps, View } from 'react-native';

import { colors, radius, spacing, type } from '@/lib/theme';

/** Labeled text input used across Settings. */
export function Field({
  label,
  hint,
  ...inputProps
}: { label: string; hint?: string } & TextInputProps) {
  return (
    <View style={styles.wrap}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        placeholderTextColor={colors.textFaint}
        autoCapitalize="none"
        autoCorrect={false}
        {...inputProps}
        style={[styles.input, inputProps.multiline && styles.multiline, inputProps.style]}
      />
      {hint ? <Text style={styles.hint}>{hint}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginBottom: spacing.md },
  label: {
    color: colors.textDim,
    fontSize: type.small,
    fontWeight: '600',
    marginBottom: 6,
  },
  input: {
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    color: colors.text,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: type.small + 1,
  },
  multiline: { minHeight: 120, textAlignVertical: 'top' },
  hint: { color: colors.textFaint, fontSize: type.tiny, marginTop: 5, lineHeight: 15 },
});
