import type { ItemSource, TrackSource } from '@/types';

export interface LinkMetadata {
  source: ItemSource;
  title: string | null;
  caption: string | null;
  author: string | null;
  thumbnailUri: string | null;
  /** Best-effort music detected from the page/caption. */
  musicTitle: string | null;
  musicArtist: string | null;
}

export function detectSource(url: string): ItemSource {
  const u = url.toLowerCase();
  if (u.includes('instagram.com')) return 'instagram';
  if (u.includes('tiktok.com')) return 'tiktok';
  return 'link';
}

export function detectTrackSource(url: string): TrackSource {
  const u = url.toLowerCase();
  if (u.includes('spotify.com')) return 'spotify';
  if (u.includes('youtube.com') || u.includes('youtu.be')) return 'youtube';
  if (u.includes('soundcloud.com')) return 'soundcloud';
  return 'other';
}

function metaTag(html: string, property: string): string | null {
  // Matches both property="og:x" and name="x" with content in either order.
  const patterns = [
    new RegExp(
      `<meta[^>]+(?:property|name)=["']${property}["'][^>]+content=["']([^"']*)["']`,
      'i'
    ),
    new RegExp(
      `<meta[^>]+content=["']([^"']*)["'][^>]+(?:property|name)=["']${property}["']`,
      'i'
    ),
  ];
  for (const re of patterns) {
    const m = html.match(re);
    if (m?.[1]) return decodeEntities(m[1]);
  }
  return null;
}

function decodeEntities(s: string): string {
  return s
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#x27;/g, "'");
}

/**
 * Heuristic music extraction from an Instagram/TikTok caption or title.
 * Looks for the common "<Artist> · <Song>" / "<Song> by <Artist>" shapes.
 */
export function extractMusic(text: string | null): {
  title: string | null;
  artist: string | null;
} {
  if (!text) return { title: null, artist: null };
  const dot = text.match(/([^·•|]+)[·•]\s*([^·•|]+)/);
  if (dot) {
    return { artist: dot[1].trim(), title: dot[2].trim() };
  }
  const by = text.match(/(.+?)\s+by\s+(.+)/i);
  if (by) {
    return { title: by[1].trim(), artist: by[2].trim() };
  }
  return { title: null, artist: null };
}

/**
 * Fetches a URL and extracts Open Graph metadata. This is best-effort: many
 * platforms (Instagram especially) gate full metadata behind auth, so callers
 * should let the user fill in the gaps. Never throws — returns minimal data on
 * failure so ingestion always succeeds.
 */
export async function fetchLinkMetadata(url: string): Promise<LinkMetadata> {
  const source = detectSource(url);
  const fallback: LinkMetadata = {
    source,
    title: null,
    caption: null,
    author: null,
    thumbnailUri: null,
    musicTitle: null,
    musicArtist: null,
  };

  try {
    const res = await fetch(url, {
      headers: {
        // A desktop UA tends to return richer OG tags.
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
    });
    if (!res.ok) return fallback;
    const html = await res.text();

    const title = metaTag(html, 'og:title');
    const caption = metaTag(html, 'og:description');
    const thumbnailUri = metaTag(html, 'og:image');
    const author =
      metaTag(html, 'og:site_name') ??
      metaTag(html, 'author') ??
      extractAuthorHandle(url);

    const audioMeta =
      metaTag(html, 'og:audio:title') ?? metaTag(html, 'music:song');
    const music = audioMeta
      ? { title: audioMeta, artist: metaTag(html, 'music:musician') }
      : extractMusic(caption ?? title);

    return {
      source,
      title,
      caption,
      author,
      thumbnailUri,
      musicTitle: music.title,
      musicArtist: music.artist,
    };
  } catch {
    return fallback;
  }
}

function extractAuthorHandle(url: string): string | null {
  const m = url.match(/instagram\.com\/([^/?#]+)/i);
  if (m && !['p', 'reel', 'reels', 'tv'].includes(m[1].toLowerCase())) {
    return `@${m[1]}`;
  }
  return null;
}
