import { useState } from 'react';
import {
  Dimensions,
  NativeScrollEvent,
  NativeSyntheticEvent,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/ui/Button';
import { setFlag } from '@/repositories/settings';
import { theme } from '@/theme';

const { width } = Dimensions.get('window');

const SLIDES = [
  {
    icon: '🎬',
    title: 'Save reels you love',
    body: 'In Instagram or TikTok, tap Share and pick Cesca. The reel, its caption and music are saved to your private library.',
  },
  {
    icon: '🔍',
    title: 'Find them instantly',
    body: 'Search by caption, song, artist or tag. Filter by source and sort however you like. Your whole reference library, one tap away.',
  },
  {
    icon: '🎞️',
    title: 'Build your videos',
    body: 'Group clips and music into Projects, reorder your shot list, and export it when you sit down to edit.',
  },
];

export default function OnboardingScreen() {
  const db = useSQLiteContext();
  const router = useRouter();
  const [index, setIndex] = useState(0);

  const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    setIndex(Math.round(e.nativeEvent.contentOffset.x / width));
  };

  const finish = async () => {
    await setFlag(db, 'onboarded', true);
    router.replace('/(tabs)');
  };

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={onScroll}
      >
        {SLIDES.map((slide) => (
          <View key={slide.title} style={[styles.slide, { width }]}>
            <Text style={styles.icon}>{slide.icon}</Text>
            <Text style={styles.title}>{slide.title}</Text>
            <Text style={styles.body}>{slide.body}</Text>
          </View>
        ))}
      </ScrollView>

      <View style={styles.dots}>
        {SLIDES.map((_, i) => (
          <View key={i} style={[styles.dot, i === index && styles.dotActive]} />
        ))}
      </View>

      <View style={styles.footer}>
        <Button
          title={index === SLIDES.length - 1 ? 'Get started' : 'Skip'}
          onPress={finish}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: theme.colors.bg },
  slide: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 36,
    gap: 18,
  },
  icon: { fontSize: 72 },
  title: {
    color: theme.colors.text,
    fontSize: 26,
    fontWeight: '800',
    textAlign: 'center',
  },
  body: {
    color: theme.colors.textMuted,
    fontSize: 16,
    lineHeight: 24,
    textAlign: 'center',
  },
  dots: { flexDirection: 'row', justifyContent: 'center', gap: 8, paddingVertical: 16 },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: theme.colors.border,
  },
  dotActive: { backgroundColor: theme.colors.accent, width: 22 },
  footer: { padding: 20 },
});
