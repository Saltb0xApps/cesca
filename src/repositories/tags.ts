import type { SQLiteDatabase } from 'expo-sqlite';

import { newId } from '@/lib/id';

export interface TagWithCount {
  id: string;
  name: string;
  count: number;
}

/** All tags with how many (non-deleted) items use each, busiest first. */
export async function listTags(db: SQLiteDatabase): Promise<TagWithCount[]> {
  return db.getAllAsync<TagWithCount>(
    `SELECT tg.id, tg.name,
            COUNT(i.id) AS count
     FROM tags tg
     LEFT JOIN item_tags it ON it.tag_id = tg.id
     LEFT JOIN items i ON i.id = it.item_id AND i.deleted_at IS NULL
     GROUP BY tg.id
     ORDER BY count DESC, tg.name ASC`
  );
}

/** Tags whose name starts with / contains the prefix, for autocomplete. */
export async function suggestTags(
  db: SQLiteDatabase,
  prefix: string,
  limit = 6
): Promise<string[]> {
  const p = prefix.trim().toLowerCase();
  if (!p) return [];
  const rows = await db.getAllAsync<{ name: string }>(
    `SELECT name FROM tags WHERE name LIKE ? ORDER BY name LIMIT ?`,
    `%${p}%`,
    limit
  );
  return rows.map((r) => r.name);
}

export async function renameTag(
  db: SQLiteDatabase,
  id: string,
  newName: string
): Promise<void> {
  const name = newName.trim().toLowerCase();
  if (!name) return;
  const existing = await db.getFirstAsync<{ id: string }>(
    'SELECT id FROM tags WHERE name = ? AND id != ?',
    name,
    id
  );
  if (existing) {
    // Target name already exists — merge into it instead of duplicating.
    await mergeTags(db, id, existing.id);
    return;
  }
  await db.runAsync('UPDATE tags SET name = ? WHERE id = ?', name, id);
}

/** Moves all item links from `fromId` to `intoId`, then deletes `fromId`. */
export async function mergeTags(
  db: SQLiteDatabase,
  fromId: string,
  intoId: string
): Promise<void> {
  if (fromId === intoId) return;
  await db.withTransactionAsync(async () => {
    await db.runAsync(
      'INSERT OR IGNORE INTO item_tags (item_id, tag_id) SELECT item_id, ? FROM item_tags WHERE tag_id = ?',
      intoId,
      fromId
    );
    await db.runAsync('DELETE FROM item_tags WHERE tag_id = ?', fromId);
    await db.runAsync('DELETE FROM tags WHERE id = ?', fromId);
  });
}

export async function deleteTag(db: SQLiteDatabase, id: string): Promise<void> {
  await db.runAsync('DELETE FROM tags WHERE id = ?', id);
}

/** Ensures a tag exists and returns its id (used when merging by name). */
export async function ensureTag(
  db: SQLiteDatabase,
  name: string
): Promise<string> {
  const clean = name.trim().toLowerCase();
  const existing = await db.getFirstAsync<{ id: string }>(
    'SELECT id FROM tags WHERE name = ?',
    clean
  );
  if (existing) return existing.id;
  const id = newId();
  await db.runAsync('INSERT INTO tags (id, name) VALUES (?, ?)', id, clean);
  return id;
}
