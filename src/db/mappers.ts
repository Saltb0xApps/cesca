import type { Folder, SavedItem, Track } from '@/types';

export interface ItemRow {
  id: string;
  source: string;
  source_url: string | null;
  title: string | null;
  caption: string | null;
  author: string | null;
  thumbnail_uri: string | null;
  media_uri: string | null;
  note: string | null;
  folder_id: string | null;
  track_id: string | null;
  created_at: number;
  saved_at: number;
  folder_name?: string | null;
  // Optional joined track columns (present in the main item queries).
  track_title?: string | null;
  track_artist?: string | null;
  track_source?: string | null;
  track_external_url?: string | null;
  track_file_uri?: string | null;
  track_created_at?: number | null;
}

export interface TrackRow {
  id: string;
  title: string | null;
  artist: string | null;
  source: string;
  external_url: string | null;
  file_uri: string | null;
  created_at: number;
}

export interface FolderRow {
  id: string;
  name: string;
  color: string | null;
  created_at: number;
  item_count?: number;
}

export function mapItem(row: ItemRow): SavedItem {
  return {
    id: row.id,
    source: row.source as SavedItem['source'],
    sourceUrl: row.source_url,
    title: row.title,
    caption: row.caption,
    author: row.author,
    thumbnailUri: row.thumbnail_uri,
    mediaUri: row.media_uri,
    note: row.note,
    folderId: row.folder_id,
    trackId: row.track_id,
    createdAt: row.created_at,
    savedAt: row.saved_at,
    folderName: row.folder_name ?? null,
    track:
      row.track_id && row.track_created_at != null
        ? {
            id: row.track_id,
            title: row.track_title ?? null,
            artist: row.track_artist ?? null,
            source: (row.track_source as Track['source']) ?? 'other',
            externalUrl: row.track_external_url ?? null,
            fileUri: row.track_file_uri ?? null,
            createdAt: row.track_created_at,
          }
        : null,
  };
}

export function mapTrack(row: TrackRow): Track {
  return {
    id: row.id,
    title: row.title,
    artist: row.artist,
    source: row.source as Track['source'],
    externalUrl: row.external_url,
    fileUri: row.file_uri,
    createdAt: row.created_at,
  };
}

export function mapFolder(row: FolderRow): Folder {
  return {
    id: row.id,
    name: row.name,
    color: row.color,
    createdAt: row.created_at,
    itemCount: row.item_count,
  };
}
