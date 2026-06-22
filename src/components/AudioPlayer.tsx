import { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';
import { Audio, type AVPlaybackStatus } from 'expo-av';

import { theme } from '@/theme';

/** Minimal play/pause control for a locally-stored audio file. */
export function AudioPlayer({ uri }: { uri: string }) {
  const soundRef = useRef<Audio.Sound | null>(null);
  const [playing, setPlaying] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    return () => {
      soundRef.current?.unloadAsync();
      soundRef.current = null;
    };
  }, []);

  const onStatus = (status: AVPlaybackStatus) => {
    if (!status.isLoaded) return;
    setPlaying(status.isPlaying);
    if (status.didJustFinish) {
      soundRef.current?.setPositionAsync(0);
    }
  };

  const toggle = async () => {
    try {
      if (!soundRef.current) {
        setLoading(true);
        await Audio.setAudioModeAsync({ playsInSilentModeIOS: true });
        const { sound } = await Audio.Sound.createAsync(
          { uri },
          { shouldPlay: true },
          onStatus
        );
        soundRef.current = sound;
        setLoading(false);
        return;
      }
      if (playing) {
        await soundRef.current.pauseAsync();
      } else {
        await soundRef.current.playAsync();
      }
    } catch {
      setLoading(false);
    }
  };

  return (
    <Pressable style={styles.btn} onPress={toggle}>
      <Text style={styles.icon}>{loading ? '…' : playing ? '❚❚' : '▶'}</Text>
      <Text style={styles.label}>
        {loading ? 'Loading' : playing ? 'Pause' : 'Play'}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  btn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: theme.colors.accentSoft,
    borderRadius: theme.radius.md,
    paddingVertical: 13,
    paddingHorizontal: 18,
    alignSelf: 'flex-start',
  },
  icon: { color: theme.colors.accent, fontSize: 16, fontWeight: '700' },
  label: { color: theme.colors.text, fontSize: 15, fontWeight: '600' },
});
