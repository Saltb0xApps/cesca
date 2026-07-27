/**
 * Pure Notion helpers: page-ID parsing and block construction.
 * No network and no React Native imports — fully unit-testable.
 */

/** Notion caps a single rich_text content string at 2000 chars. Stay under it. */
export const MAX_TEXT_CHUNK = 1900;
/** Notion caps one append request at 100 blocks. */
export const MAX_BLOCKS_PER_REQUEST = 100;

const HEX32 = /[0-9a-f]{32}/gi;
const DASHED_UUID = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi;

function hyphenate(hex32: string): string {
  const h = hex32.toLowerCase();
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
}

/**
 * Extract a Notion page ID from whatever the user pasted: a full page URL
 * (with or without a workspace slug / page title / query string), a dashed
 * UUID, or a bare 32-char hex ID. Returns the normalized dashed UUID, or
 * null if nothing that looks like a page ID is present.
 */
export function parseNotionPageId(input: string): string | null {
  const raw = input.trim();
  if (!raw) return null;
  // Drop query string and hash — ?v=... on database views also contains hex IDs.
  const withoutQuery = raw.split(/[?#]/)[0];

  const dashed = withoutQuery.match(DASHED_UUID);
  if (dashed && dashed.length > 0) return dashed[dashed.length - 1].toLowerCase();

  const hex = withoutQuery.match(HEX32);
  if (hex && hex.length > 0) return hyphenate(hex[hex.length - 1]);

  return null;
}

/**
 * Split long text into chunks of at most `limit` chars, preferring paragraph
 * breaks, then sentence ends, then spaces, so Notion paragraphs read naturally.
 */
export function chunkText(text: string, limit: number = MAX_TEXT_CHUNK): string[] {
  const clean = text.trim();
  if (!clean) return [];
  const chunks: string[] = [];
  let rest = clean;
  while (rest.length > limit) {
    const window = rest.slice(0, limit);
    let cut = window.lastIndexOf('\n\n');
    if (cut < limit * 0.3) {
      const sentence = Math.max(
        window.lastIndexOf('. '),
        window.lastIndexOf('! '),
        window.lastIndexOf('? '),
      );
      cut = sentence >= 0 ? sentence + 1 : -1;
    }
    if (cut < limit * 0.3) cut = window.lastIndexOf(' ');
    if (cut <= 0) cut = limit;
    chunks.push(rest.slice(0, cut).trim());
    rest = rest.slice(cut).trim();
  }
  if (rest) chunks.push(rest);
  return chunks.filter((c) => c.length > 0);
}

type RichText = {
  type: 'text';
  text: { content: string };
  annotations?: Partial<{
    italic: boolean;
    bold: boolean;
    color: string;
  }>;
};

export type NotionBlock = Record<string, unknown>;

function rt(content: string, annotations?: RichText['annotations']): RichText {
  const node: RichText = { type: 'text', text: { content } };
  if (annotations) node.annotations = annotations;
  return node;
}

export interface TranscriptBlockInput {
  /** e.g. "Sun, Jul 27 · 9:42 PM" */
  dateLine: string;
  /** e.g. "3:12" or null to omit */
  durationLine: string | null;
  question: string | null;
  transcript: string;
}

/**
 * Build the blocks appended to the very end of the Notion page for one
 * recording: a small heading with the date, the night's question as a quote,
 * then the transcript as paragraphs.
 */
export function buildTranscriptBlocks(input: TranscriptBlockInput): NotionBlock[] {
  const blocks: NotionBlock[] = [];

  const headingText = input.durationLine
    ? `🎙 ${input.dateLine} · ${input.durationLine}`
    : `🎙 ${input.dateLine}`;

  blocks.push({
    object: 'block',
    type: 'heading_3',
    heading_3: { rich_text: [rt(headingText)] },
  });

  if (input.question) {
    blocks.push({
      object: 'block',
      type: 'quote',
      quote: {
        rich_text: [rt(input.question, { italic: true, color: 'gray' })],
      },
    });
  }

  for (const chunk of chunkText(input.transcript)) {
    blocks.push({
      object: 'block',
      type: 'paragraph',
      paragraph: { rich_text: [rt(chunk)] },
    });
  }

  return blocks;
}

/** Split a block list into request-sized batches (append order is preserved). */
export function batchBlocks(
  blocks: NotionBlock[],
  size: number = MAX_BLOCKS_PER_REQUEST,
): NotionBlock[][] {
  const batches: NotionBlock[][] = [];
  for (let i = 0; i < blocks.length; i += size) {
    batches.push(blocks.slice(i, i + size));
  }
  return batches;
}
