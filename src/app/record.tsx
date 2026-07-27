import {
  AudioModule,
  setAudioModeAsync,
  useAudioRecorder,
  useAudioRecorderState,
} from 'expo-audio';
import * as Crypto from 'expo-crypto';
import { File } from 'expo-file-system';
import * as Haptics from 'expo-haptics';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Alert, Animated, Easing, StyleSheet, Text, View } from 'react-native';

import { PrimaryButton } from '@/components/PrimaryButton';
import { Screen } from '@/components/Screen';
import { formatDuration } from '@/lib/format';
import { questionForDate } from '@/lib/questions';
import { persistRecording } from '@/lib/recordingFiles';
import { VOICE_RECORDING_OPTIONS } from '@/lib/recordingPreset';
import { useAppStore } from '@/lib/store';
import { colors, radius, spacing, type } from '@/lib/theme';
import { RecordingEntry } from '@/lib/types';
import { processRecording } from '@/services/sync';

export default function RecordScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ question?: string }>();
  const settings = useAppStore((s) => s.settings);
  const addRecording = useAppStore((s) => s.addRecording);

  // Question priority: the one carried by the tapped notification, else
  // whatever tonight's rotation says.
  const question =
    typeof params.question === 'string' && params.question.trim()
      ? params.question
      : questionForDate(new Date(), settings.questions);

  const recorder = useAudioRecorder(VOICE_RECORDING_OPTIONS);
  const recorderState = useAudioRecorderState(recorder, 250);
  const [phase, setPhase] = useState<'starting' | 'recording' | 'saving'>('starting');
  const startedRef = useRef(false);
  const finishingRef = useRef(false);

  // Kick off recording as soon as the screen opens.
  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;
    (async () => {
      const permission = await AudioModule.requestRecordingPermissionsAsync();
      if (!permission.granted) {
        Alert.alert(
          'Microphone needed',
          'Cesca can’t record without microphone access. Enable it in system settings.',
          [{ text: 'OK', onPress: () => router.back() }],
        );
        return;
      }
      await setAudioModeAsync({
        allowsRecording: true,
        playsInSilentMode: true,
      });
      await recorder.prepareToRecordAsync();
      recorder.record();
      setPhase('recording');
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    })().catch((e) => {
      Alert.alert('Could not start recording', String(e), [
        { text: 'OK', onPress: () => router.back() },
      ]);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const finishAndSave = async () => {
    if (finishingRef.current) return;
    finishingRef.current = true;
    setPhase('saving');
    try {
      // Capture duration before stop() resets recorder state.
      const durationMillis = recorderState.durationMillis ?? 0;
      await recorder.stop();
      const tempUri = recorder.uri;
      if (!tempUri) throw new Error('Recorder produced no file.');

      const id = Crypto.randomUUID();
      const audioFile = await persistRecording(tempUri, id);
      const entry: RecordingEntry = {
        id,
        createdAt: new Date().toISOString(),
        durationMillis,
        audioFile,
        question,
        transcript: null,
        status: 'pending',
        error: null,
        archived: false,
        syncedAt: null,
      };
      addRecording(entry);
      // Fire and forget — status updates stream into the list UI.
      processRecording(id).catch(() => {});
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      router.replace('/');
    } catch (e) {
      finishingRef.current = false;
      setPhase('recording');
      Alert.alert('Could not save recording', String(e));
    }
  };

  const cancel = () => {
    const discard = async () => {
      if (finishingRef.current) return;
      finishingRef.current = true;
      try {
        if (recorderState.isRecording) await recorder.stop();
        if (recorder.uri) {
          const temp = new File(recorder.uri);
          if (temp.exists) temp.delete();
        }
      } catch {
        // Discard is best-effort.
      }
      router.back();
    };
    if ((recorderState.durationMillis ?? 0) > 3000) {
      Alert.alert('Discard this recording?', 'It won’t be saved or transcribed.', [
        { text: 'Keep recording', style: 'cancel' },
        { text: 'Discard', style: 'destructive', onPress: discard },
      ]);
    } else {
      discard();
    }
  };

  return (
    <Screen>
      <Stack.Screen options={{ gestureEnabled: false }} />
      <View style={styles.body}>
        <Text style={styles.label}>Tonight’s question</Text>
        <Text style={styles.question}>{question}</Text>

        <View style={styles.center}>
          <PulsingDot active={phase === 'recording'} />
          <Text style={styles.timer}>
            {formatDuration(recorderState.durationMillis ?? 0)}
          </Text>
          <Text style={styles.hint}>
            {phase === 'starting'
              ? 'Starting…'
              : phase === 'saving'
                ? 'Saving…'
                : 'Recording — just talk'}
          </Text>
        </View>

        <View style={styles.actions}>
          <PrimaryButton
            label="Stop & save"
            onPress={finishAndSave}
            loading={phase === 'saving'}
            disabled={phase === 'starting'}
          />
          <PrimaryButton label="Cancel" variant="ghost" onPress={cancel} />
        </View>
      </View>
    </Screen>
  );
}

function PulsingDot({ active }: { active: boolean }) {
  const [scale] = useState(() => new Animated.Value(1));

  useEffect(() => {
    if (!active) return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(scale, {
          toValue: 1.35,
          duration: 700,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(scale, {
          toValue: 1,
          duration: 700,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [active, scale]);

  return (
    <View style={styles.pulseWrap}>
      <Animated.View style={[styles.pulseHalo, { transform: [{ scale }] }]} />
      <View style={styles.pulseCore} />
    </View>
  );
}

const styles = StyleSheet.create({
  body: { flex: 1, paddingTop: spacing.xl },
  label: {
    color: colors.textFaint,
    fontSize: type.tiny,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: spacing.sm,
  },
  question: {
    color: colors.text,
    fontSize: type.title - 2,
    fontWeight: '700',
    lineHeight: 34,
  },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  pulseWrap: {
    width: 120,
    height: 120,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
  },
  pulseHalo: {
    position: 'absolute',
    width: 96,
    height: 96,
    borderRadius: radius.full,
    backgroundColor: 'rgba(229, 72, 77, 0.25)',
  },
  pulseCore: {
    width: 56,
    height: 56,
    borderRadius: radius.full,
    backgroundColor: colors.record,
  },
  timer: {
    color: colors.text,
    fontSize: 44,
    fontWeight: '200',
    fontVariant: ['tabular-nums'],
  },
  hint: { color: colors.textFaint, fontSize: type.small, marginTop: 6 },
  actions: { gap: spacing.sm + 2, paddingBottom: spacing.sm },
});
