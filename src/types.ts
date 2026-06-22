export type ItemSource = 'instagram' | 'tiktok' | 'upload' | 'link';

export type TrackSource =
  | 'reel'
  | 'upload'
  | 'spotify'
  | 'youtube'
  | 'soundcloud'
  | 'other';

export interface Folder {
  id: string;
  name: string;
  color: string | null;
  createdAt: number;
  itemCount?: number;
}

export interface Track {
  id: string;
  title: string | null;
  artist: string | null;
  source: TrackSource;
  externalUrl: string | null;
  fileUri: string | null;
  createdAt: number;
}

export interface SavedItem {
  id: string;
  source: ItemSource;
  sourceUrl: string | null;
  title: string | null;
  caption: string | null;
  author: string | null;
  thumbnailUri: string | null;
  mediaUri: string | null;
  folderId: string | null;
  trackId: string | null;
  createdAt: number;
  savedAt: number;
  // Joined fields populated by queries
  track?: Track | null;
  tags?: string[];
  folderName?: string | null;
}

export interface Tag {
  id: string;
  name: string;
}
