import * as FileSystem from 'expo-file-system';
import * as VideoThumbnails from 'expo-video-thumbnails';

import { newId } from '@/lib/id';

const VIDEO_DIR = `${FileSystem.documentDirectory}videos/`;
const THUMB_DIR = `${FileSystem.documentDirectory}thumbnails/`;

async function ensureDir(dir: string): Promise<void> {
  const info = await FileSystem.getInfoAsync(dir);
  if (!info.exists) {
    await FileSystem.makeDirectoryAsync(dir, { intermediates: true });
  }
}

/**
 * Downloads a remote video to the app's document directory so it plays in-app
 * and survives the original post being deleted. Returns the local URI, or null
 * on failure (callers keep the remote link as a fallback).
 */
export async function downloadVideo(remoteUrl: string): Promise<string | null> {
  try {
    await ensureDir(VIDEO_DIR);
    const target = `${VIDEO_DIR}${newId()}.mp4`;
    const result = await FileSystem.downloadAsync(remoteUrl, target);
    if (result.status >= 200 && result.status < 300) {
      return result.uri;
    }
    await FileSystem.deleteAsync(target, { idempotent: true });
    return null;
  } catch {
    return null;
  }
}

/** Generates a JPEG thumbnail from a local video file. Returns null on failure. */
export async function generateThumbnail(
  localVideoUri: string,
  atMs = 1000
): Promise<string | null> {
  try {
    await ensureDir(THUMB_DIR);
    const { uri } = await VideoThumbnails.getThumbnailAsync(localVideoUri, {
      time: atMs,
      quality: 0.7,
    });
    const target = `${THUMB_DIR}${newId()}.jpg`;
    await FileSystem.moveAsync({ from: uri, to: target });
    return target;
  } catch {
    return null;
  }
}

/** Removes any locally-stored media files for an item that's being purged. */
export async function deleteLocalMedia(
  uris: (string | null | undefined)[]
): Promise<void> {
  for (const uri of uris) {
    if (uri && uri.startsWith(FileSystem.documentDirectory ?? '___')) {
      await FileSystem.deleteAsync(uri, { idempotent: true });
    }
  }
}

export function isLocalFile(uri: string | null): boolean {
  return !!uri && uri.startsWith('file://');
}
