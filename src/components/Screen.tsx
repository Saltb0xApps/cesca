import { ReactNode } from 'react';
import { ScrollView, StyleSheet, View, ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors, spacing } from '@/lib/theme';

/**
 * Page wrapper: dark background + safe-area padding. `scroll` wraps children
 * in a ScrollView; leave it off for screens that manage their own lists.
 */
export function Screen({
  children,
  scroll = false,
  style,
}: {
  children: ReactNode;
  scroll?: boolean;
  style?: ViewStyle;
}) {
  const insets = useSafeAreaInsets();
  const padding = {
    paddingTop: insets.top + spacing.sm,
    paddingBottom: insets.bottom + spacing.md,
    paddingLeft: insets.left + spacing.md,
    paddingRight: insets.right + spacing.md,
  };

  if (scroll) {
    return (
      <ScrollView
        style={styles.root}
        contentContainerStyle={[padding, style]}
        keyboardShouldPersistTaps="handled"
      >
        {children}
      </ScrollView>
    );
  }
  return <View style={[styles.root, padding, style]}>{children}</View>;
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
});
