import type { SQLiteDatabase } from 'expo-sqlite';

import type { Project, ProjectStatus, SavedItem, Track } from '@/types';
import { newId, now } from '@/lib/id';
import { mapItem, mapTrack, type ItemRow, type TrackRow } from '@/db/mappers';

interface ProjectRow {
  id: string;
  name: string;
  status: string;
  notes: string | null;
  created_at: number;
  item_count?: number;
}

function mapProject(row: ProjectRow): Project {
  return {
    id: row.id,
    name: row.name,
    status: row.status as ProjectStatus,
    notes: row.notes,
    createdAt: row.created_at,
    itemCount: row.item_count,
  };
}

export async function listProjects(db: SQLiteDatabase): Promise<Project[]> {
  const rows = await db.getAllAsync<ProjectRow>(
    `SELECT p.*,
            (SELECT COUNT(*) FROM project_items pi WHERE pi.project_id = p.id)
              AS item_count
     FROM projects p
     ORDER BY p.created_at DESC`
  );
  return rows.map(mapProject);
}

export async function getProject(
  db: SQLiteDatabase,
  id: string
): Promise<Project | null> {
  const row = await db.getFirstAsync<ProjectRow>(
    'SELECT * FROM projects WHERE id = ?',
    id
  );
  return row ? mapProject(row) : null;
}

export async function createProject(
  db: SQLiteDatabase,
  name: string
): Promise<string> {
  const id = newId();
  await db.runAsync(
    'INSERT INTO projects (id, name, status, notes, created_at) VALUES (?, ?, ?, ?, ?)',
    id,
    name.trim(),
    'idea',
    null,
    now()
  );
  return id;
}

export async function updateProject(
  db: SQLiteDatabase,
  id: string,
  edit: { name?: string; status?: ProjectStatus; notes?: string | null }
): Promise<void> {
  const sets: string[] = [];
  const args: (string | null)[] = [];
  if (edit.name !== undefined) {
    sets.push('name = ?');
    args.push(edit.name.trim());
  }
  if (edit.status !== undefined) {
    sets.push('status = ?');
    args.push(edit.status);
  }
  if ('notes' in edit) {
    sets.push('notes = ?');
    args.push(edit.notes ?? null);
  }
  if (sets.length === 0) return;
  await db.runAsync(
    `UPDATE projects SET ${sets.join(', ')} WHERE id = ?`,
    ...args,
    id
  );
}

export async function deleteProject(
  db: SQLiteDatabase,
  id: string
): Promise<void> {
  await db.runAsync('DELETE FROM projects WHERE id = ?', id);
}

// --- Shot list (ordered items) ---

export async function listProjectItems(
  db: SQLiteDatabase,
  projectId: string
): Promise<SavedItem[]> {
  const rows = await db.getAllAsync<ItemRow>(
    `SELECT i.*, f.name AS folder_name
     FROM project_items pi
     JOIN items i ON i.id = pi.item_id AND i.deleted_at IS NULL
     LEFT JOIN folders f ON f.id = i.folder_id
     WHERE pi.project_id = ?
     ORDER BY pi.position ASC`,
    projectId
  );
  return rows.map(mapItem);
}

export async function addItemToProject(
  db: SQLiteDatabase,
  projectId: string,
  itemId: string
): Promise<void> {
  const max = await db.getFirstAsync<{ m: number | null }>(
    'SELECT MAX(position) AS m FROM project_items WHERE project_id = ?',
    projectId
  );
  const position = (max?.m ?? -1) + 1;
  await db.runAsync(
    'INSERT OR IGNORE INTO project_items (project_id, item_id, position) VALUES (?, ?, ?)',
    projectId,
    itemId,
    position
  );
}

export async function removeItemFromProject(
  db: SQLiteDatabase,
  projectId: string,
  itemId: string
): Promise<void> {
  await db.runAsync(
    'DELETE FROM project_items WHERE project_id = ? AND item_id = ?',
    projectId,
    itemId
  );
}

/** Swaps an item with its neighbour to move it up (-1) or down (+1). */
export async function moveProjectItem(
  db: SQLiteDatabase,
  projectId: string,
  itemId: string,
  direction: -1 | 1
): Promise<void> {
  const rows = await db.getAllAsync<{ item_id: string; position: number }>(
    'SELECT item_id, position FROM project_items WHERE project_id = ? ORDER BY position ASC',
    projectId
  );
  const index = rows.findIndex((r) => r.item_id === itemId);
  const swapWith = index + direction;
  if (index < 0 || swapWith < 0 || swapWith >= rows.length) return;
  const a = rows[index];
  const b = rows[swapWith];
  await db.withTransactionAsync(async () => {
    await db.runAsync(
      'UPDATE project_items SET position = ? WHERE project_id = ? AND item_id = ?',
      b.position,
      projectId,
      a.item_id
    );
    await db.runAsync(
      'UPDATE project_items SET position = ? WHERE project_id = ? AND item_id = ?',
      a.position,
      projectId,
      b.item_id
    );
  });
}

/** Projects that already contain a given item (to show ticks in the picker). */
export async function projectIdsForItem(
  db: SQLiteDatabase,
  itemId: string
): Promise<Set<string>> {
  const rows = await db.getAllAsync<{ project_id: string }>(
    'SELECT project_id FROM project_items WHERE item_id = ?',
    itemId
  );
  return new Set(rows.map((r) => r.project_id));
}

// --- Project music ---

export async function listProjectTracks(
  db: SQLiteDatabase,
  projectId: string
): Promise<Track[]> {
  const rows = await db.getAllAsync<TrackRow>(
    `SELECT t.* FROM project_tracks pt
     JOIN tracks t ON t.id = pt.track_id
     WHERE pt.project_id = ?
     ORDER BY pt.position ASC`,
    projectId
  );
  return rows.map(mapTrack);
}

export async function addTrackToProject(
  db: SQLiteDatabase,
  projectId: string,
  trackId: string
): Promise<void> {
  const max = await db.getFirstAsync<{ m: number | null }>(
    'SELECT MAX(position) AS m FROM project_tracks WHERE project_id = ?',
    projectId
  );
  const position = (max?.m ?? -1) + 1;
  await db.runAsync(
    'INSERT OR IGNORE INTO project_tracks (project_id, track_id, position) VALUES (?, ?, ?)',
    projectId,
    trackId,
    position
  );
}

export async function removeTrackFromProject(
  db: SQLiteDatabase,
  projectId: string,
  trackId: string
): Promise<void> {
  await db.runAsync(
    'DELETE FROM project_tracks WHERE project_id = ? AND track_id = ?',
    projectId,
    trackId
  );
}
