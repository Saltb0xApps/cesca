import { useEffect, useState } from 'react';
import { Animated, StyleSheet, View, type DimensionValue } from 'react-native';

import { theme } from '@/theme';

function Shimmer({
  width,
  height,
  radius = theme.radius.sm,
}: {
  width: DimensionValue;
  height: number;
  radius?: number;
}) {
  const [opacity] = useState(() => new Animated.Value(0.4));
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 0.9,
          duration: 700,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0.4,
          duration: 700,
          useNativeDriver: true,
        }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [opacity]);

  return (
    <Animated.View
      style={{
        width,
        height,
        borderRadius: radius,
        backgroundColor: theme.colors.surfaceAlt,
        opacity,
      }}
    />
  );
}

/** Placeholder grid shown while the gallery loads. */
export function GallerySkeleton() {
  return (
    <View style={styles.grid}>
      {Array.from({ length: 6 }).map((_, i) => (
        <View key={i} style={styles.cell}>
          <Shimmer width="100%" height={200} radius={theme.radius.md} />
          <Shimmer width="80%" height={12} />
          <Shimmer width="50%" height={12} />
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    padding: 12,
  },
  cell: { width: '47%', gap: 8 },
});
