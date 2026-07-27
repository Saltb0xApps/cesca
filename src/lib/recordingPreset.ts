import { RecordingOptions, RecordingPresets } from 'expo-audio';

/**
 * Voice-optimized: mono 64 kbps AAC. Half the upload size of the default
 * HIGH_QUALITY preset with no practical loss for speech transcription
 * (~0.5 MB/min → hours of talking stays under OpenAI's 25 MB cap).
 */
export const VOICE_RECORDING_OPTIONS: RecordingOptions = {
  ...RecordingPresets.HIGH_QUALITY,
  numberOfChannels: 1,
  bitRate: 64000,
};
