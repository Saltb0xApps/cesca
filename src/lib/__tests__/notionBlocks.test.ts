import {
  batchBlocks,
  buildTranscriptBlocks,
  chunkText,
  MAX_TEXT_CHUNK,
  parseNotionPageId,
} from '../notionBlocks';

describe('parseNotionPageId', () => {
  const id32 = '249989fe8ac480efbc8f57f56486db54';
  const dashed = '249989fe-8ac4-80ef-bc8f-57f56486db54';

  it('parses a full page URL with title slug', () => {
    expect(
      parseNotionPageId(`https://www.notion.so/myspace/Brain-Time-${id32}`),
    ).toBe(dashed);
  });

  it('parses a URL with query string', () => {
    expect(parseNotionPageId(`https://www.notion.so/${id32}?pvs=4`)).toBe(dashed);
  });

  it('ignores IDs that only appear in the query string', () => {
    expect(
      parseNotionPageId(
        `https://www.notion.so/myspace/Page-${id32}?v=aaaabbbbccccddddaaaabbbbccccdddd`,
      ),
    ).toBe(dashed);
  });

  it('parses a bare 32-char hex ID', () => {
    expect(parseNotionPageId(id32)).toBe(dashed);
  });

  it('parses an already-dashed UUID', () => {
    expect(parseNotionPageId(dashed)).toBe(dashed);
  });

  it('parses uppercase input', () => {
    expect(parseNotionPageId(id32.toUpperCase())).toBe(dashed);
  });

  it('returns null for junk', () => {
    expect(parseNotionPageId('')).toBeNull();
    expect(parseNotionPageId('https://www.notion.so/my-page')).toBeNull();
    expect(parseNotionPageId('not a link')).toBeNull();
  });
});

describe('chunkText', () => {
  it('keeps short text as one chunk', () => {
    expect(chunkText('hello world')).toEqual(['hello world']);
  });

  it('returns nothing for empty/whitespace text', () => {
    expect(chunkText('   ')).toEqual([]);
  });

  it('splits long text into chunks under the limit, preserving content', () => {
    const sentence = 'This is a fairly ordinary sentence about the day. ';
    const text = sentence.repeat(200); // ~10k chars
    const chunks = chunkText(text);
    expect(chunks.length).toBeGreaterThan(1);
    for (const chunk of chunks) {
      expect(chunk.length).toBeLessThanOrEqual(MAX_TEXT_CHUNK);
    }
    // No words lost: rejoining equals the original modulo whitespace.
    expect(chunks.join(' ').replace(/\s+/g, ' ').trim()).toBe(
      text.replace(/\s+/g, ' ').trim(),
    );
  });

  it('handles a single giant token without spaces', () => {
    const text = 'x'.repeat(MAX_TEXT_CHUNK * 2 + 10);
    const chunks = chunkText(text);
    expect(chunks.length).toBe(3);
    expect(chunks.join('')).toHaveLength(text.length);
  });
});

describe('buildTranscriptBlocks', () => {
  it('builds heading + quote + paragraphs', () => {
    const blocks = buildTranscriptBlocks({
      dateLine: 'Sun, Jul 27 · 9:42 PM',
      durationLine: '3:12',
      question: 'What happened with BlackSar today?',
      transcript: 'Today we shipped the thing.',
    });
    expect(blocks.map((b) => b.type)).toEqual(['heading_3', 'quote', 'paragraph']);
    const heading = blocks[0] as any;
    expect(heading.heading_3.rich_text[0].text.content).toContain('Sun, Jul 27');
    expect(heading.heading_3.rich_text[0].text.content).toContain('3:12');
  });

  it('omits the quote when there is no question', () => {
    const blocks = buildTranscriptBlocks({
      dateLine: 'Sun, Jul 27 · 9:42 PM',
      durationLine: null,
      question: null,
      transcript: 'Short note.',
    });
    expect(blocks.map((b) => b.type)).toEqual(['heading_3', 'paragraph']);
  });
});

describe('batchBlocks', () => {
  it('splits into request-sized batches preserving order', () => {
    const blocks = Array.from({ length: 250 }, (_, i) => ({ i }));
    const batches = batchBlocks(blocks, 100);
    expect(batches.map((b) => b.length)).toEqual([100, 100, 50]);
    expect(batches.flat()).toEqual(blocks);
  });
});
