import type { Project, SavedItem, Track } from '@/types';

function trackLine(t: Track): string {
  const name = [t.title, t.artist].filter(Boolean).join(' — ') || 'Untitled';
  return t.externalUrl ? `${name} (${t.externalUrl})` : name;
}

/** Renders a project as a plain-text shot list, ready to share/copy. */
export function buildShotList(
  project: Project,
  items: SavedItem[],
  tracks: Track[]
): string {
  const lines: string[] = [];
  lines.push(`# ${project.name}`);
  lines.push(`Status: ${project.status}`);
  if (project.notes) lines.push(`Notes: ${project.notes}`);
  lines.push('');

  lines.push(`## Shot list (${items.length})`);
  items.forEach((item, i) => {
    const caption = item.caption || item.title || 'Untitled clip';
    lines.push(`${i + 1}. ${caption}`);
    if (item.author) lines.push(`   by ${item.author}`);
    if (item.sourceUrl) lines.push(`   ${item.sourceUrl}`);
    if (item.note) lines.push(`   note: ${item.note}`);
  });

  if (tracks.length > 0) {
    lines.push('');
    lines.push(`## Music (${tracks.length})`);
    tracks.forEach((t) => lines.push(`- ${trackLine(t)}`));
  }

  lines.push('');
  lines.push('Exported from Cesca');
  return lines.join('\n');
}
