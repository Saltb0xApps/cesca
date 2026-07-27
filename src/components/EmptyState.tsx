import { StyleSheet, Text, View } from 'react-native';

import { colors, spacing, type } from '@/lib/theme';

export function EmptyState({ title, body }: { title: string; body: string }) {
  return (
    <View style={styles.wrap}>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.body}>{body}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', paddingVertical: spacing.xl, paddingHorizontal: spacing.lg },
  title: { color: colors.textDim, fontSize: type.body, fontWeight: '600', marginBottom: 6 },
  body: { color: colors.textFaint, fontSize: type.small, textAlign: 'center', lineHeight: 19 },
});
