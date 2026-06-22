import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';

import type { SavedItem } from '@/types';
import { theme } from '@/theme';

const SOURCE_BADGE: Record<SavedItem['source'], string> = {
  instagram: 'IG',
  tiktok: 'TT',
  upload: '↑',
  link: '🔗',
};

export function VideoCard({
  item,
  onPress,
}: {
  item: SavedItem;
  onPress: () => void;
}) {
  const music = item.track
    ? [item.track.title, item.track.artist].filter(Boolean).join(' · ')
    : null;

  return (
    <Pressable
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}
      onPress={onPress}
    >
      <View style={styles.thumbWrap}>
        {item.thumbnailUri ? (
          <Image
            source={{ uri: item.thumbnailUri }}
            style={styles.thumb}
            contentFit="cover"
            transition={150}
          />
        ) : (
          <View style={[styles.thumb, styles.thumbFallback]}>
            <Text style={styles.fallbackIcon}>🎬</Text>
          </View>
        )}
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{SOURCE_BADGE[item.source]}</Text>
        </View>
      </View>
      <View style={styles.meta}>
        <Text numberOfLines={2} style={styles.caption}>
          {item.caption || item.title || 'Untitled'}
        </Text>
        {music ? (
          <Text numberOfLines={1} style={styles.music}>
            ♪ {music}
          </Text>
        ) : null}
        {item.tags && item.tags.length > 0 ? (
          <Text numberOfLines={1} style={styles.tags}>
            {item.tags.map((t) => `#${t}`).join(' ')}
          </Text>
        ) : null}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.md,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  pressed: { opacity: 0.7 },
  thumbWrap: { position: 'relative' },
  thumb: { width: '100%', aspectRatio: 9 / 16, backgroundColor: theme.colors.surfaceAlt },
  thumbFallback: { alignItems: 'center', justifyContent: 'center' },
  fallbackIcon: { fontSize: 32 },
  badge: {
    position: 'absolute',
    top: 8,
    left: 8,
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderRadius: theme.radius.sm,
    paddingHorizontal: 7,
    paddingVertical: 3,
  },
  badgeText: { color: '#fff', fontSize: 11, fontWeight: '700' },
  meta: { padding: 10, gap: 4 },
  caption: { color: theme.colors.text, fontSize: 13, lineHeight: 17 },
  music: { color: theme.colors.accent, fontSize: 12, fontWeight: '500' },
  tags: { color: theme.colors.textMuted, fontSize: 11 },
});
