import { StyleSheet } from 'react-native';
import { useVideoPlayer, VideoView } from 'expo-video';

import { theme } from '@/theme';

/** Plays a locally-stored video clip with native controls. */
export function VideoPlayerView({ uri }: { uri: string }) {
  const player = useVideoPlayer(uri, (p) => {
    p.loop = true;
  });

  return (
    <VideoView
      player={player}
      style={styles.video}
      contentFit="contain"
      nativeControls
      allowsFullscreen
    />
  );
}

const styles = StyleSheet.create({
  video: {
    width: '100%',
    aspectRatio: 9 / 16,
    maxHeight: 480,
    borderRadius: theme.radius.lg,
    backgroundColor: '#000',
  },
});
