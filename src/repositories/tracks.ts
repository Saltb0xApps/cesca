import type { SQLiteDatabase } from 'expo-sqlite';

import type { Track } from '@/types';
import { newId, now } from '@/lib/id';
import { mapTrack, type TrackRow } from '@/db/mappers';

export interface NewTrackInput {
  title?: string | null;
  artist?: string | null;
  source: Track['source'];
  externalUrl?: string | null;
  fileUri?: string | null;
}

export async function listTracks(db: SQLiteDatabase): Promise<Track[]> {
  const rows = await db.getAllAsync<TrackRow>(
    'SELECT * FROM tracks ORDER BY created_at DESC'
  );
  return rows.map(mapTrack);
}

export async function searchTracks(
  db: SQLiteDatabase,
  query: string
): Promise<Track[]> {
  const q = query.trim().toLowerCase();
  if (!q) return listTracks(db);
  const rows = await db.getAllAsync<TrackRow>(
    `SELECT * FROM tracks
     WHERE LOWER(COALESCE(title,'')) LIKE ?
        OR LOWER(COALESCE(artist,'')) LIKE ?
     ORDER BY created_at DESC`,
    `%${q}%`,
    `%${q}%`
  );
  return rows.map(mapTrack);
}

export async function createTrack(
  db: SQLiteDatabase,
  input: NewTrackInput
): Promise<string> {
  const id = newId();
  await db.runAsync(
    `INSERT INTO tracks (id, title, artist, source, external_url, file_uri, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    id,
    input.title ?? null,
    input.artist ?? null,
    input.source,
    input.externalUrl ?? null,
    input.fileUri ?? null,
    now()
  );
  return id;
}

export async function getTrack(
  db: SQLiteDatabase,
  id: string
): Promise<Track | null> {
  const row = await db.getFirstAsync<TrackRow>(
    'SELECT * FROM tracks WHERE id = ?',
    id
  );
  return row ? mapTrack(row) : null;
}

export async function deleteTrack(db: SQLiteDatabase, id: string): Promise<void> {
  await db.runAsync('DELETE FROM tracks WHERE id = ?', id);
}

export async function updateTrack(
  db: SQLiteDatabase,
  id: string,
  edit: { title?: string | null; artist?: string | null }
): Promise<void> {
  await db.runAsync(
    'UPDATE tracks SET title = ?, artist = ? WHERE id = ?',
    edit.title ?? null,
    edit.artist ?? null,
    id
  );
}

/** Number of (non-deleted) saved items using this track. */
export async function trackUsageCount(
  db: SQLiteDatabase,
  id: string
): Promise<number> {
  const row = await db.getFirstAsync<{ n: number }>(
    'SELECT COUNT(*) AS n FROM items WHERE track_id = ? AND deleted_at IS NULL',
    id
  );
  return row?.n ?? 0;
}

/** Repoints every item from `fromId` onto `intoId`, then deletes `fromId`. */
export async function mergeTracks(
  db: SQLiteDatabase,
  fromId: string,
  intoId: string
): Promise<void> {
  if (fromId === intoId) return;
  await db.withTransactionAsync(async () => {
    await db.runAsync(
      'UPDATE items SET track_id = ? WHERE track_id = ?',
      intoId,
      fromId
    );
    await db.runAsync('DELETE FROM tracks WHERE id = ?', fromId);
  });
}

/**
 * Finds an existing track matching title+artist (case-insensitive) or creates
 * one. Used when ingesting reels so the same song isn't duplicated.
 */
export async function upsertTrackByName(
  db: SQLiteDatabase,
  input: NewTrackInput
): Promise<string> {
  if (input.title || input.artist) {
    const existing = await db.getFirstAsync<TrackRow>(
      `SELECT * FROM tracks
       WHERE LOWER(COALESCE(title,'')) = LOWER(?)
         AND LOWER(COALESCE(artist,'')) = LOWER(?)`,
      input.title ?? '',
      input.artist ?? ''
    );
    if (existing) return existing.id;
  }
  return createTrack(db, input);
}
