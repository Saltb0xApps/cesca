/**
 * Minimal Notion API client — just enough to append transcript blocks to the
 * very end of one page, plus a connection test for Settings.
 */
import { fetchWithTimeout } from '@/lib/http';
import {
  batchBlocks,
  buildTranscriptBlocks,
  NotionBlock,
  TranscriptBlockInput,
} from '@/lib/notionBlocks';

const API = 'https://api.notion.com/v1';
const NOTION_VERSION = '2022-06-28';
const TIMEOUT_MS = 30 * 1000;

function headers(token: string): Record<string, string> {
  return {
    Authorization: `Bearer ${token}`,
    'Notion-Version': NOTION_VERSION,
    'Content-Type': 'application/json',
  };
}

async function describeNotionError(res: Response): Promise<string> {
  let detail = '';
  try {
    const body = (await res.json()) as { message?: string };
    detail = body.message ?? '';
  } catch {
    // Ignore unparseable bodies.
  }
  if (res.status === 401) {
    return 'Notion rejected the token — double-check the integration secret in Settings.';
  }
  if (res.status === 404) {
    return 'Notion page not found. Open the page in Notion → ⋯ menu → Connections → add your integration, and re-check the page link.';
  }
  if (res.status === 429) {
    return 'Notion rate limit hit — will work on retry in a moment.';
  }
  return `Notion request failed (HTTP ${res.status})${detail ? `: ${detail}` : ''}`;
}

/**
 * Append one recording's blocks to the end of the page. Batches respect
 * Notion's 100-blocks-per-request cap and run sequentially so order holds.
 */
export async function appendTranscriptToNotion(options: {
  token: string;
  pageId: string;
  input: TranscriptBlockInput;
}): Promise<void> {
  const blocks = buildTranscriptBlocks(options.input);
  for (const batch of batchBlocks(blocks)) {
    await appendBlocks(options.token, options.pageId, batch);
  }
}

async function appendBlocks(
  token: string,
  pageId: string,
  blocks: NotionBlock[],
  attempt: number = 0,
): Promise<void> {
  const res = await fetchWithTimeout(
    `${API}/blocks/${pageId}/children`,
    {
      method: 'PATCH',
      headers: headers(token),
      body: JSON.stringify({ children: blocks }),
    },
    TIMEOUT_MS,
  );
  if (res.ok) return;

  // One polite retry on rate limiting, honoring Retry-After.
  if (res.status === 429 && attempt === 0) {
    const after = Number(res.headers.get('retry-after') ?? '2');
    await new Promise((r) => setTimeout(r, Math.min(after, 15) * 1000));
    return appendBlocks(token, pageId, blocks, 1);
  }
  throw new Error(await describeNotionError(res));
}

/** Used by the Settings "Test connection" button. Returns the page title. */
export async function testNotionConnection(options: {
  token: string;
  pageId: string;
}): Promise<{ pageTitle: string }> {
  const res = await fetchWithTimeout(
    `${API}/pages/${options.pageId}`,
    { method: 'GET', headers: headers(options.token) },
    TIMEOUT_MS,
  );
  if (!res.ok) {
    throw new Error(await describeNotionError(res));
  }
  const page = (await res.json()) as {
    properties?: Record<
      string,
      { type?: string; title?: { plain_text?: string }[] }
    >;
  };
  // The title lives in whichever property has type "title".
  const titleProp = Object.values(page.properties ?? {}).find(
    (p) => p.type === 'title',
  );
  const pageTitle =
    titleProp?.title?.map((t) => t.plain_text ?? '').join('') || 'Untitled page';
  return { pageTitle };
}
