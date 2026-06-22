import { buildFolderText, buildShotList } from '@/services/export';
import type { Folder, Project, SavedItem, Track } from '@/types';

const track: Track = {
  id: 't1',
  title: 'Around the World',
  artist: 'Daft Punk',
  source: 'spotify',
  externalUrl: 'https://open.spotify.com/track/1',
  fileUri: null,
  createdAt: 0,
};

function item(over: Partial<SavedItem> = {}): SavedItem {
  return {
    id: 'i1',
    source: 'instagram',
    sourceUrl: 'https://instagram.com/reel/1',
    title: null,
    caption: 'Cool transition',
    author: '@creator',
    thumbnailUri: null,
    mediaUri: null,
    note: null,
    folderId: null,
    trackId: null,
    createdAt: 0,
    savedAt: 0,
    ...over,
  };
}

describe('buildShotList', () => {
  const project: Project = {
    id: 'p1',
    name: 'Italy trip',
    status: 'editing',
    notes: 'fast cuts',
    createdAt: 0,
  };

  it('includes header, clips and music', () => {
    const text = buildShotList(project, [item()], [track]);
    expect(text).toContain('# Italy trip');
    expect(text).toContain('Status: editing');
    expect(text).toContain('1. Cool transition');
    expect(text).toContain('by @creator');
    expect(text).toContain('Around the World — Daft Punk');
  });

  it('numbers clips in order', () => {
    const text = buildShotList(
      project,
      [item({ id: 'a', caption: 'first' }), item({ id: 'b', caption: 'second' })],
      []
    );
    expect(text.indexOf('1. first')).toBeLessThan(text.indexOf('2. second'));
  });
});

describe('buildFolderText', () => {
  const folder: Folder = { id: 'f1', name: 'Hooks', color: null, createdAt: 0 };

  it('lists clips with attached music', () => {
    const text = buildFolderText(folder, [item({ track })]);
    expect(text).toContain('# Hooks (1)');
    expect(text).toContain('1. Cool transition');
    expect(text).toContain('♪ Around the World — Daft Punk');
  });
});
