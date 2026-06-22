import type { SQLiteDatabase } from 'expo-sqlite';

import type { SavedItem } from '@/types';
import { newId, now } from '@/lib/id';
import { mapItem, type ItemRow } from '@/db/mappers';
import { ensureTag } from '@/repositories/tags';

export interface NewItemInput {
  source: SavedItem['source'];
  sourceUrl?: string | null;
  title?: string | null;
  caption?: string | null;
  author?: string | null;
  thumbnailUri?: string | null;
  mediaUri?: string | null;
  folderId?: string | null;
  trackId?: string | null;
  tags?: string[];
}

const SELECT_ITEM = `
  SELECT i.*, f.name AS folder_name
  FROM items i
  LEFT JOIN folders f ON f.id = i.folder_id
`;

export async function createItem(
  db: SQLiteDatabase,
  input: NewItemInput
): Promise<string> {
  const id = newId();
  const ts = now();
  await db.runAsync(
    `INSERT INTO items
      (id, source, source_url, title, caption, author, thumbnail_uri,
       media_uri, folder_id, track_id, created_at, saved_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    id,
    input.source,
    input.sourceUrl ?? null,
    input.title ?? null,
    input.caption ?? null,
    input.author ?? null,
    input.thumbnailUri ?? null,
    input.mediaUri ?? null,
    input.folderId ?? null,
    input.trackId ?? null,
    ts,
    ts
  );
  if (input.tags?.length) {
    await setItemTags(db, id, input.tags);
  }
  return id;
}

export async function listItems(
  db: SQLiteDatabase,
  opts: { folderId?: string; trackId?: string } = {}
): Promise<SavedItem[]> {
  const clauses = ['i.deleted_at IS NULL'];
  const args: string[] = [];
  if (opts.folderId) {
    clauses.push('i.folder_id = ?');
    args.push(opts.folderId);
  }
  if (opts.trackId) {
    clauses.push('i.track_id = ?');
    args.push(opts.trackId);
  }
  const rows = await db.getAllAsync<ItemRow>(
    `${SELECT_ITEM} WHERE ${clauses.join(' AND ')} ORDER BY i.saved_at DESC`,
    ...args
  );
  return attachTags(db, rows.map(mapItem));
}

export async function getItem(
  db: SQLiteDatabase,
  id: string
): Promise<SavedItem | null> {
  const row = await db.getFirstAsync<ItemRow>(
    `${SELECT_ITEM} WHERE i.id = ?`,
    id
  );
  if (!row) return null;
  const [item] = await attachTags(db, [mapItem(row)]);
  return item;
}

export type ItemSort = 'recent' | 'oldest' | 'az';

export interface SearchFilters {
  source?: SavedItem['source'];
  hasMusic?: boolean;
  hasVideo?: boolean;
  folderId?: string;
  sort?: ItemSort;
}

const SORT_SQL: Record<ItemSort, string> = {
  recent: 'i.saved_at DESC',
  oldest: 'i.saved_at ASC',
  az: 'LOWER(COALESCE(i.caption, i.title, "")) ASC',
};

/**
 * Search across caption, title, author, track metadata and tags, with optional
 * filters and sort. Each whitespace-separated token must match (AND semantics).
 */
export async function searchItems(
  db: SQLiteDatabase,
  query: string,
  filters: SearchFilters = {}
): Promise<SavedItem[]> {
  const tokens = query.trim().toLowerCase().split(/\s+/).filter(Boolean);

  const haystack = `
    LOWER(COALESCE(i.caption,'') || ' ' || COALESCE(i.title,'') || ' ' ||
          COALESCE(i.author,'') || ' ' || COALESCE(t.title,'') || ' ' ||
          COALESCE(t.artist,'') || ' ' || COALESCE(
            (SELECT GROUP_CONCAT(tg.name, ' ')
             FROM item_tags it JOIN tags tg ON tg.id = it.tag_id
             WHERE it.item_id = i.id), ''))`;

  const clauses = ['i.deleted_at IS NULL'];
  const args: string[] = [];

  for (const tk of tokens) {
    clauses.push(`${haystack} LIKE ?`);
    args.push(`%${tk}%`);
  }
  if (filters.source) {
    clauses.push('i.source = ?');
    args.push(filters.source);
  }
  if (filters.hasMusic) {
    clauses.push('i.track_id IS NOT NULL');
  }
  if (filters.hasVideo) {
    clauses.push('i.media_uri IS NOT NULL');
  }
  if (filters.folderId) {
    clauses.push('i.folder_id = ?');
    args.push(filters.folderId);
  }

  const sort = SORT_SQL[filters.sort ?? 'recent'];
  const rows = await db.getAllAsync<ItemRow>(
    `SELECT i.*, f.name AS folder_name
     FROM items i
     LEFT JOIN folders f ON f.id = i.folder_id
     LEFT JOIN tracks t ON t.id = i.track_id
     WHERE ${clauses.join(' AND ')}
     ORDER BY ${sort}`,
    ...args
  );
  return attachTags(db, rows.map(mapItem));
}

/** Items carrying a specific tag (exact tag match), newest first. */
export async function listItemsByTag(
  db: SQLiteDatabase,
  tagName: string
): Promise<SavedItem[]> {
  const rows = await db.getAllAsync<ItemRow>(
    `SELECT i.*, f.name AS folder_name
     FROM items i
     LEFT JOIN folders f ON f.id = i.folder_id
     JOIN item_tags it ON it.item_id = i.id
     JOIN tags tg ON tg.id = it.tag_id
     WHERE i.deleted_at IS NULL AND tg.name = ?
     ORDER BY i.saved_at DESC`,
    tagName.trim().toLowerCase()
  );
  return attachTags(db, rows.map(mapItem));
}

export interface ItemEdit {
  title?: string | null;
  caption?: string | null;
  author?: string | null;
  note?: string | null;
}

/** Updates only the user-editable fields that were provided. */
export async function updateItem(
  db: SQLiteDatabase,
  id: string,
  edit: ItemEdit
): Promise<void> {
  const columns: Record<keyof ItemEdit, string> = {
    title: 'title',
    caption: 'caption',
    author: 'author',
    note: 'note',
  };
  const sets: string[] = [];
  const args: (string | null)[] = [];
  for (const key of Object.keys(columns) as (keyof ItemEdit)[]) {
    if (key in edit) {
      sets.push(`${columns[key]} = ?`);
      args.push(edit[key] ?? null);
    }
  }
  if (sets.length === 0) return;
  await db.runAsync(
    `UPDATE items SET ${sets.join(', ')} WHERE id = ?`,
    ...args,
    id
  );
}

export async function moveItemToFolder(
  db: SQLiteDatabase,
  itemId: string,
  folderId: string | null
): Promise<void> {
  await db.runAsync('UPDATE items SET folder_id = ? WHERE id = ?', folderId, itemId);
}

/** Sets the local media/thumbnail URIs (used after a background download). */
export async function updateItemMedia(
  db: SQLiteDatabase,
  id: string,
  media: { mediaUri?: string | null; thumbnailUri?: string | null }
): Promise<void> {
  const sets: string[] = [];
  const args: (string | null)[] = [];
  if ('mediaUri' in media) {
    sets.push('media_uri = ?');
    args.push(media.mediaUri ?? null);
  }
  if ('thumbnailUri' in media) {
    sets.push('thumbnail_uri = ?');
    args.push(media.thumbnailUri ?? null);
  }
  if (sets.length === 0) return;
  await db.runAsync(`UPDATE items SET ${sets.join(', ')} WHERE id = ?`, ...args, id);
}

export async function setItemTrack(
  db: SQLiteDatabase,
  itemId: string,
  trackId: string | null
): Promise<void> {
  await db.runAsync('UPDATE items SET track_id = ? WHERE id = ?', trackId, itemId);
}

/** Marks an item deleted (hidden from lists) so the delete can be undone. */
export async function softDeleteItem(
  db: SQLiteDatabase,
  id: string
): Promise<void> {
  await db.runAsync('UPDATE items SET deleted_at = ? WHERE id = ?', now(), id);
}

export async function restoreItem(
  db: SQLiteDatabase,
  id: string
): Promise<void> {
  await db.runAsync('UPDATE items SET deleted_at = NULL WHERE id = ?', id);
}

/** Permanently removes an item and its tag links. */
export async function deleteItem(db: SQLiteDatabase, id: string): Promise<void> {
  await db.runAsync('DELETE FROM items WHERE id = ?', id);
}

/** Replaces an item's tags, creating any tags that don't yet exist. */
export async function setItemTags(
  db: SQLiteDatabase,
  itemId: string,
  tagNames: string[]
): Promise<void> {
  const clean = Array.from(
    new Set(tagNames.map((t) => t.trim().toLowerCase()).filter(Boolean))
  );
  await db.runAsync('DELETE FROM item_tags WHERE item_id = ?', itemId);
  for (const name of clean) {
    const tagId = await ensureTag(db, name);
    await db.runAsync(
      'INSERT OR IGNORE INTO item_tags (item_id, tag_id) VALUES (?, ?)',
      itemId,
      tagId
    );
  }
}

async function attachTags(
  db: SQLiteDatabase,
  items: SavedItem[]
): Promise<SavedItem[]> {
  for (const item of items) {
    const rows = await db.getAllAsync<{ name: string }>(
      `SELECT tg.name FROM item_tags it
       JOIN tags tg ON tg.id = it.tag_id
       WHERE it.item_id = ? ORDER BY tg.name`,
      item.id
    );
    item.tags = rows.map((r) => r.name);
  }
  return items;
}
