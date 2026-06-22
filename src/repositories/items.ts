import type { SQLiteDatabase } from 'expo-sqlite';

import type { SavedItem } from '@/types';
import { newId, now } from '@/lib/id';
import { mapItem, type ItemRow } from '@/db/mappers';

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
  opts: { folderId?: string } = {}
): Promise<SavedItem[]> {
  const where = opts.folderId
    ? 'WHERE i.deleted_at IS NULL AND i.folder_id = ?'
    : 'WHERE i.deleted_at IS NULL';
  const args = opts.folderId ? [opts.folderId] : [];
  const rows = await db.getAllAsync<ItemRow>(
    `${SELECT_ITEM} ${where} ORDER BY i.saved_at DESC`,
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

/**
 * Full-text-ish search across caption, title, author, track metadata and tags.
 * Each whitespace-separated token must match somewhere (AND semantics).
 */
export async function searchItems(
  db: SQLiteDatabase,
  query: string
): Promise<SavedItem[]> {
  const tokens = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
  if (tokens.length === 0) return listItems(db);

  const haystack = `
    LOWER(COALESCE(i.caption,'') || ' ' || COALESCE(i.title,'') || ' ' ||
          COALESCE(i.author,'') || ' ' || COALESCE(t.title,'') || ' ' ||
          COALESCE(t.artist,'') || ' ' || COALESCE(
            (SELECT GROUP_CONCAT(tg.name, ' ')
             FROM item_tags it JOIN tags tg ON tg.id = it.tag_id
             WHERE it.item_id = i.id), ''))`;

  const conditions = tokens.map(() => `${haystack} LIKE ?`).join(' AND ');
  const args = tokens.map((tk) => `%${tk}%`);

  const rows = await db.getAllAsync<ItemRow>(
    `SELECT i.*, f.name AS folder_name
     FROM items i
     LEFT JOIN folders f ON f.id = i.folder_id
     LEFT JOIN tracks t ON t.id = i.track_id
     WHERE i.deleted_at IS NULL AND ${conditions}
     ORDER BY i.saved_at DESC`,
    ...args
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
    const existing = await db.getFirstAsync<{ id: string }>(
      'SELECT id FROM tags WHERE name = ?',
      name
    );
    const tagId = existing?.id ?? newId();
    if (!existing) {
      await db.runAsync('INSERT INTO tags (id, name) VALUES (?, ?)', tagId, name);
    }
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
