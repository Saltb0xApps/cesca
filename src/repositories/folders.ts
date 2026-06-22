import type { SQLiteDatabase } from 'expo-sqlite';

import type { Folder } from '@/types';
import { newId, now } from '@/lib/id';
import { mapFolder, type FolderRow } from '@/db/mappers';

export async function listFolders(db: SQLiteDatabase): Promise<Folder[]> {
  const rows = await db.getAllAsync<FolderRow>(
    `SELECT f.*,
            (SELECT COUNT(*) FROM items i WHERE i.folder_id = f.id) AS item_count
     FROM folders f
     ORDER BY f.created_at DESC`
  );
  return rows.map(mapFolder);
}

export async function createFolder(
  db: SQLiteDatabase,
  name: string,
  color: string | null = null
): Promise<string> {
  const id = newId();
  await db.runAsync(
    'INSERT INTO folders (id, name, color, created_at) VALUES (?, ?, ?, ?)',
    id,
    name.trim(),
    color,
    now()
  );
  return id;
}

export async function renameFolder(
  db: SQLiteDatabase,
  id: string,
  name: string
): Promise<void> {
  await db.runAsync('UPDATE folders SET name = ? WHERE id = ?', name.trim(), id);
}

export async function deleteFolder(db: SQLiteDatabase, id: string): Promise<void> {
  // Items keep existing; their folder_id is set NULL by the FK constraint.
  await db.runAsync('DELETE FROM folders WHERE id = ?', id);
}

export async function getFolder(
  db: SQLiteDatabase,
  id: string
): Promise<Folder | null> {
  const row = await db.getFirstAsync<FolderRow>(
    'SELECT * FROM folders WHERE id = ?',
    id
  );
  return row ? mapFolder(row) : null;
}
