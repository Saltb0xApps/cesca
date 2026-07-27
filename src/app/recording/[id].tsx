import { Ionicons } from '@expo/vector-icons';
import { setAudioModeAsync, useAudioPlayer, useAudioPlayerStatus } from 'expo-audio';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useMemo } from 'react';
import {
  Alert,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { PrimaryButton } from '@/components/PrimaryButton';
import { Screen } from '@/components/Screen';
import { StatusPill } from '@/components/StatusPill';
import { formatDayTime, formatDuration, formatTime } from '@/lib/format';
import { recordingExists, uriForRecording } from '@/lib/recordingFiles';
import { useAppStore } from '@/lib/store';
import { colors, radius, spacing, type } from '@/lib/theme';
import { processRecording } from '@/services/sync';

export default function RecordingDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const entry = useAppStore((s) => s.recordings.find((r) => r.id === id));
  const setArchived = useAppStore((s) => s.setArchived);
  const deleteRecording = useAppStore((s) => s.deleteRecording);

  const audioUri = useMemo(() => {
    if (!entry) return null;
    return recordingExists(entry.audioFile) ? uriForRecording(entry.audioFile) : null;
  }, [entry?.audioFile]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!entry) {
    // Deleted while open (or bad deep link) — nothing to show.
    return (
      <Screen>
        <BackHeader onBack={() => router.back()} title="Recording" />
        <Text style={styles.missing}>This recording no longer exists.</Text>
      </Screen>
    );
  }

  const confirmDelete = () => {
    Alert.alert(
      'Delete recording?',
      'Removes the audio and transcript from this phone. Anything already synced to Notion stays in Notion.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            deleteRecording(entry.id);
            router.back();
          },
        },
      ],
    );
  };

  const shareTranscript = () => {
    if (!entry.transcript) return;
    Share.share({
      message: `${formatDayTime(entry.createdAt)}\n${entry.question ?? ''}\n\n${entry.transcript}`.trim(),
    }).catch(() => {});
  };

  const retryable = entry.status === 'error' || entry.status === 'pending';

  return (
    <Screen style={{ paddingBottom: 0 }}>
      <BackHeader
        onBack={() => router.back()}
        title={formatDayTime(entry.createdAt)}
      />
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: spacing.xl }}
      >
        <View style={styles.metaRow}>
          <StatusPill entry={entry} />
          <Text style={styles.metaText}>{formatDuration(entry.durationMillis)}</Text>
        </View>

        {entry.status === 'synced' && entry.syncedAt ? (
          <Text style={styles.syncedNote}>
            Added to the end of your Notion page at {formatTime(entry.syncedAt)}.
          </Text>
        ) : null}

        {entry.error ? (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{entry.error}</Text>
          </View>
        ) : null}

        {retryable ? (
          <PrimaryButton
            label={entry.transcript ? 'Retry Notion sync' : 'Retry transcription & sync'}
            onPress={() => processRecording(entry.id)}
            style={{ marginBottom: spacing.md }}
          />
        ) : null}

        {audioUri ? <PlaybackBar uri={audioUri} /> : null}

        {entry.question ? (
          <View style={styles.questionBox}>
            <Text style={styles.questionText}>{entry.question}</Text>
          </View>
        ) : null}

        {entry.transcript ? (
          <Text style={styles.transcript} selectable>
            {entry.transcript}
          </Text>
        ) : (
          <Text style={styles.noTranscript}>
            No transcript yet — it appears here as soon as transcription finishes.
          </Text>
        )}

        <View style={styles.actions}>
          {entry.transcript ? (
            <PrimaryButton label="Share transcript" variant="ghost" onPress={shareTranscript} />
          ) : null}
          <PrimaryButton
            label={entry.archived ? 'Move out of archive' : 'Archive'}
            variant="ghost"
            onPress={() => setArchived(entry.id, !entry.archived)}
          />
          <PrimaryButton label="Delete from phone" variant="danger" onPress={confirmDelete} />
        </View>
      </ScrollView>
    </Screen>
  );
}

function BackHeader({ onBack, title }: { onBack: () => void; title: string }) {
  return (
    <View style={styles.header}>
      <Pressable hitSlop={10} onPress={onBack} style={styles.backBtn}>
        <Ionicons name="chevron-back" size={24} color={colors.text} />
      </Pressable>
      <Text style={styles.headerTitle} numberOfLines={1}>
        {title}
      </Text>
      <View style={{ width: 24 }} />
    </View>
  );
}

function PlaybackBar({ uri }: { uri: string }) {
  const player = useAudioPlayer(uri);
  const status = useAudioPlayerStatus(player);

  // Recording mode may still be active right after recording; switch the
  // session back to playback so audio comes out of the speaker.
  useEffect(() => {
    setAudioModeAsync({ allowsRecording: false, playsInSilentMode: true }).catch(() => {});
  }, []);

  const finished =
    status.isLoaded && status.duration > 0 && status.currentTime >= status.duration - 0.05;

  const toggle = () => {
    if (status.playing) {
      player.pause();
      return;
    }
    if (finished) player.seekTo(0);
    player.play();
  };

  return (
    <Pressable onPress={toggle} style={styles.playback}>
      <Ionicons
        name={status.playing ? 'pause-circle' : 'play-circle'}
        size={38}
        color={colors.accent}
      />
      <Text style={styles.playbackText}>
        {formatDuration(status.currentTime * 1000)}
        {status.duration > 0 ? ` / ${formatDuration(status.duration * 1000)}` : ''}
      </Text>
      <Text style={styles.playbackHint}>{status.playing ? 'Playing' : 'Play recording'}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
    marginTop: spacing.xs,
  },
  backBtn: { padding: 2 },
  headerTitle: {
    color: colors.text,
    fontSize: type.body,
    fontWeight: '700',
    flex: 1,
    textAlign: 'center',
  },
  missing: { color: colors.textDim, fontSize: type.body, textAlign: 'center', marginTop: spacing.xl },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  metaText: { color: colors.textFaint, fontSize: type.small, fontVariant: ['tabular-nums'] },
  syncedNote: { color: colors.success, fontSize: type.small, marginBottom: spacing.sm },
  errorBox: {
    backgroundColor: 'rgba(229, 72, 77, 0.12)',
    borderColor: colors.danger,
    borderWidth: 1,
    borderRadius: radius.md,
    padding: spacing.sm + 4,
    marginBottom: spacing.md,
  },
  errorText: { color: colors.danger, fontSize: type.small, lineHeight: 19 },
  playback: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm + 2,
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radius.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.sm + 4,
    marginBottom: spacing.md,
  },
  playbackText: {
    color: colors.text,
    fontSize: type.small,
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
  },
  playbackHint: { color: colors.textFaint, fontSize: type.small, marginLeft: 'auto' },
  questionBox: {
    borderLeftWidth: 3,
    borderLeftColor: colors.accent,
    paddingLeft: spacing.sm + 4,
    marginBottom: spacing.md,
  },
  questionText: { color: colors.textDim, fontSize: type.body, fontStyle: 'italic', lineHeight: 22 },
  transcript: { color: colors.text, fontSize: type.body, lineHeight: 25 },
  noTranscript: { color: colors.textFaint, fontSize: type.small, lineHeight: 20 },
  actions: { marginTop: spacing.lg, gap: spacing.sm + 2 },
});
