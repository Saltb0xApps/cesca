import * as FileSystem from 'expo-file-system';
import type { SQLiteDatabase } from 'expo-sqlite';

const TABLES = [
  'folders',
  'tracks',
  'items',
  'tags',
  'item_tags',
  'projects',
  'project_items',
  'project_tracks',
  'settings',
] as const;

type TableName = (typeof TABLES)[number];

export interface Backup {
  app: 'cesca';
  version: number;
  exportedAt: number;
  tables: Record<TableName, Record<string, unknown>[]>;
}

/**
 * Serialises the entire local library to a JSON file in the cache directory and
 * returns its URI, ready to hand to the share sheet (save to Files, Drive, …).
 */
export async function exportLibrary(db: SQLiteDatabase): Promise<string> {
  const tables = {} as Backup['tables'];
  for (const table of TABLES) {
    tables[table] = await db.getAllAsync<Record<string, unknown>>(
      `SELECT * FROM ${table}`
    );
  }
  const backup: Backup = {
    app: 'cesca',
    version: 1,
    exportedAt: Date.now(),
    tables,
  };
  const stamp = new Date().toISOString().slice(0, 10);
  const uri = `${FileSystem.cacheDirectory}cesca-backup-${stamp}.json`;
  await FileSystem.writeAsStringAsync(uri, JSON.stringify(backup, null, 2));
  return uri;
}

export interface ImportResult {
  items: number;
  tracks: number;
  projects: number;
}

/**
 * Restores rows from a backup file, upserting by primary key so re-importing is
 * idempotent and merges into the existing library rather than wiping it.
 */
export async function importLibrary(
  db: SQLiteDatabase,
  fileUri: string
): Promise<ImportResult> {
  const raw = await FileSystem.readAsStringAsync(fileUri);
  const backup = JSON.parse(raw) as Backup;
  if (backup.app !== 'cesca' || !backup.tables) {
    throw new Error('Not a Cesca backup file.');
  }

  await db.withTransactionAsync(async () => {
    for (const table of TABLES) {
      const rows = backup.tables[table] ?? [];
      for (const row of rows) {
        const cols = Object.keys(row);
        if (cols.length === 0) continue;
        const placeholders = cols.map(() => '?').join(', ');
        const values = cols.map((c) => row[c] as string | number | null);
        await db.runAsync(
          `INSERT OR REPLACE INTO ${table} (${cols.join(', ')}) VALUES (${placeholders})`,
          ...values
        );
      }
    }
  });

  return {
    items: backup.tables.items?.length ?? 0,
    tracks: backup.tables.tracks?.length ?? 0,
    projects: backup.tables.projects?.length ?? 0,
  };
}
