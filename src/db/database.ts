import type { SQLiteDatabase } from 'expo-sqlite';

export const DATABASE_NAME = 'cesca.db';

/**
 * Runs schema migrations. expo-sqlite's SQLiteProvider calls this once on
 * startup. We use PRAGMA user_version to apply migrations incrementally so the
 * schema can evolve without wiping a user's saved library.
 */
export async function migrateDb(db: SQLiteDatabase): Promise<void> {
  await db.execAsync('PRAGMA journal_mode = WAL;');
  await db.execAsync('PRAGMA foreign_keys = ON;');

  const result = await db.getFirstAsync<{ user_version: number }>(
    'PRAGMA user_version;'
  );
  let version = result?.user_version ?? 0;

  if (version < 1) {
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS folders (
        id TEXT PRIMARY KEY NOT NULL,
        name TEXT NOT NULL,
        color TEXT,
        created_at INTEGER NOT NULL
      );

      CREATE TABLE IF NOT EXISTS tracks (
        id TEXT PRIMARY KEY NOT NULL,
        title TEXT,
        artist TEXT,
        source TEXT NOT NULL DEFAULT 'other',
        external_url TEXT,
        file_uri TEXT,
        created_at INTEGER NOT NULL
      );

      CREATE TABLE IF NOT EXISTS items (
        id TEXT PRIMARY KEY NOT NULL,
        source TEXT NOT NULL,
        source_url TEXT,
        title TEXT,
        caption TEXT,
        author TEXT,
        thumbnail_uri TEXT,
        media_uri TEXT,
        folder_id TEXT REFERENCES folders(id) ON DELETE SET NULL,
        track_id TEXT REFERENCES tracks(id) ON DELETE SET NULL,
        created_at INTEGER NOT NULL,
        saved_at INTEGER NOT NULL
      );

      CREATE TABLE IF NOT EXISTS tags (
        id TEXT PRIMARY KEY NOT NULL,
        name TEXT NOT NULL UNIQUE
      );

      CREATE TABLE IF NOT EXISTS item_tags (
        item_id TEXT NOT NULL REFERENCES items(id) ON DELETE CASCADE,
        tag_id TEXT NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
        PRIMARY KEY (item_id, tag_id)
      );

      CREATE INDEX IF NOT EXISTS idx_items_folder ON items(folder_id);
      CREATE INDEX IF NOT EXISTS idx_items_track ON items(track_id);
      CREATE INDEX IF NOT EXISTS idx_items_saved_at ON items(saved_at DESC);
    `);
    version = 1;
  }

  if (version < 2) {
    await db.execAsync(`ALTER TABLE items ADD COLUMN note TEXT;`);
    version = 2;
  }

  if (version < 3) {
    await db.execAsync(`ALTER TABLE items ADD COLUMN deleted_at INTEGER;`);
    version = 3;
  }

  if (version < 4) {
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS settings (
        key TEXT PRIMARY KEY NOT NULL,
        value TEXT NOT NULL
      );
    `);
    version = 4;
  }

  if (version < 5) {
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS projects (
        id TEXT PRIMARY KEY NOT NULL,
        name TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'idea',
        notes TEXT,
        created_at INTEGER NOT NULL
      );

      CREATE TABLE IF NOT EXISTS project_items (
        project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
        item_id TEXT NOT NULL REFERENCES items(id) ON DELETE CASCADE,
        position INTEGER NOT NULL,
        PRIMARY KEY (project_id, item_id)
      );

      CREATE TABLE IF NOT EXISTS project_tracks (
        project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
        track_id TEXT NOT NULL REFERENCES tracks(id) ON DELETE CASCADE,
        position INTEGER NOT NULL,
        PRIMARY KEY (project_id, track_id)
      );

      CREATE INDEX IF NOT EXISTS idx_project_items_proj
        ON project_items(project_id, position);
      CREATE INDEX IF NOT EXISTS idx_project_tracks_proj
        ON project_tracks(project_id, position);
    `);
    version = 5;
  }

  await db.execAsync(`PRAGMA user_version = ${version};`);
}
