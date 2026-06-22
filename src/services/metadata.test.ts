import {
  detectSource,
  detectTrackSource,
  extractMusic,
} from '@/services/metadata';

describe('detectSource', () => {
  it('recognises Instagram URLs', () => {
    expect(detectSource('https://www.instagram.com/reel/abc/')).toBe('instagram');
  });

  it('recognises TikTok URLs', () => {
    expect(detectSource('https://www.tiktok.com/@x/video/123')).toBe('tiktok');
  });

  it('falls back to link for anything else', () => {
    expect(detectSource('https://example.com/clip')).toBe('link');
  });
});

describe('detectTrackSource', () => {
  it.each([
    ['https://open.spotify.com/track/1', 'spotify'],
    ['https://youtu.be/abc', 'youtube'],
    ['https://www.youtube.com/watch?v=abc', 'youtube'],
    ['https://soundcloud.com/x/y', 'soundcloud'],
    ['https://example.com/song.mp3', 'other'],
  ])('maps %s to %s', (url, expected) => {
    expect(detectTrackSource(url)).toBe(expected);
  });
});

describe('extractMusic', () => {
  it('parses "Artist · Song" form', () => {
    expect(extractMusic('Daft Punk · Around the World')).toEqual({
      artist: 'Daft Punk',
      title: 'Around the World',
    });
  });

  it('parses "Song by Artist" form', () => {
    expect(extractMusic('Around the World by Daft Punk')).toEqual({
      title: 'Around the World',
      artist: 'Daft Punk',
    });
  });

  it('returns nulls when nothing matches', () => {
    expect(extractMusic('just a normal caption')).toEqual({
      title: null,
      artist: null,
    });
  });

  it('handles empty input', () => {
    expect(extractMusic(null)).toEqual({ title: null, artist: null });
  });
});
