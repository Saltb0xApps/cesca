import type { SQLiteDatabase } from 'expo-sqlite';

import { createItem, updateItemMedia } from '@/repositories/items';
import { upsertTrackByName } from '@/repositories/tracks';
import { getSettings } from '@/repositories/settings';
import { detectTrackSource, fetchLinkMetadata } from '@/services/metadata';
import { downloadVideo, generateThumbnail } from '@/services/media';

export interface SharePayload {
  /** A shared web URL (e.g. an Instagram reel link). */
  url?: string | null;
  /** Raw shared text (may contain a URL). */
  text?: string | null;
  /** Local file URIs for shared video/image files. */
  files?: string[];
}

function firstUrl(text?: string | null): string | null {
  if (!text) return null;
  const m = text.match(/https?:\/\/\S+/);
  return m ? m[0] : null;
}

/**
 * Turns an incoming share (from the OS Share Sheet) into a saved item.
 * - A URL is enriched with Open Graph metadata and any detected music.
 * - A shared video file is saved directly as a local item.
 * Returns the new item id.
 */
export async function ingestShare(
  db: SQLiteDatabase,
  payload: SharePayload
): Promise<string> {
  const url = payload.url ?? firstUrl(payload.text);

  if (url) {
    const meta = await fetchLinkMetadata(url);
    let trackId: string | null = null;
    if (meta.musicTitle || meta.musicArtist) {
      trackId = await upsertTrackByName(db, {
        title: meta.musicTitle,
        artist: meta.musicArtist,
        source: 'reel',
        externalUrl: url,
      });
    }
    const id = await createItem(db, {
      source: meta.source,
      sourceUrl: url,
      title: meta.title,
      caption: meta.caption,
      author: meta.author,
      thumbnailUri: meta.thumbnailUri,
      trackId,
    });

    // If enabled, download the actual video in the background so the share
    // flow stays snappy. Updates the item's media/thumbnail when it finishes.
    if (meta.videoUrl) {
      const settings = await getSettings(db);
      if (settings.downloadVideos) {
        void downloadAndAttach(db, id, meta.videoUrl, !meta.thumbnailUri);
      }
    }
    return id;
  }

  const file = payload.files?.[0];
  if (file) {
    return createItem(db, {
      source: 'upload',
      mediaUri: file,
      title: payload.text ?? null,
    });
  }

  // Pure text note with no URL — still save it so nothing is lost.
  return createItem(db, {
    source: 'link',
    caption: payload.text ?? null,
  });
}

async function downloadAndAttach(
  db: SQLiteDatabase,
  itemId: string,
  videoUrl: string,
  needThumbnail: boolean
): Promise<void> {
  const localVideo = await downloadVideo(videoUrl);
  if (!localVideo) return;
  await updateItemMedia(db, itemId, { mediaUri: localVideo });
  if (needThumbnail) {
    const thumb = await generateThumbnail(localVideo);
    if (thumb) {
      await updateItemMedia(db, itemId, { thumbnailUri: thumb });
    }
  }
}

/** Imports a local video file (from the device) and generates a thumbnail. */
export async function importVideoFile(
  db: SQLiteDatabase,
  uri: string,
  name?: string
): Promise<string> {
  const id = await createItem(db, {
    source: 'upload',
    mediaUri: uri,
    title: name ?? null,
  });
  void generateThumbnail(uri).then((thumb) => {
    if (thumb) return updateItemMedia(db, id, { thumbnailUri: thumb });
  });
  return id;
}

/** Saves an external music link (Spotify/YouTube/SoundCloud) as a track. */
export async function ingestMusicLink(
  db: SQLiteDatabase,
  url: string,
  title?: string,
  artist?: string
): Promise<string> {
  return upsertTrackByName(db, {
    title: title ?? null,
    artist: artist ?? null,
    source: detectTrackSource(url),
    externalUrl: url,
  });
}
