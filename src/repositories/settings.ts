import type { SQLiteDatabase } from 'expo-sqlite';

export interface Settings {
  /** Download the actual reel video on save (gray-area; personal use). */
  downloadVideos: boolean;
  /** Only download over Wi-Fi (placeholder for a future net-state check). */
  wifiOnly: boolean;
}

export const DEFAULT_SETTINGS: Settings = {
  downloadVideos: true,
  wifiOnly: false,
};

export async function getSettings(db: SQLiteDatabase): Promise<Settings> {
  const rows = await db.getAllAsync<{ key: string; value: string }>(
    'SELECT key, value FROM settings'
  );
  const map = new Map(rows.map((r) => [r.key, r.value]));
  return {
    downloadVideos: parseBool(map.get('downloadVideos'), DEFAULT_SETTINGS.downloadVideos),
    wifiOnly: parseBool(map.get('wifiOnly'), DEFAULT_SETTINGS.wifiOnly),
  };
}

export async function setSetting<K extends keyof Settings>(
  db: SQLiteDatabase,
  key: K,
  value: Settings[K]
): Promise<void> {
  await db.runAsync(
    'INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value',
    key,
    String(value)
  );
}

function parseBool(value: string | undefined, fallback: boolean): boolean {
  if (value === undefined) return fallback;
  return value === 'true';
}
