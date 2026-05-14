import { downloadMedia, type DownloadedMedia } from "./media/download.js";
import {
  appendPartialResult,
  fetchReadyRows,
  markFailed,
  markPublishing,
  type ReadyRow,
} from "./notion/queries.js";
import { adapters } from "./platforms/index.js";

function parseOverrides(raw: string): Record<string, Record<string, unknown>> {
  if (!raw.trim()) return {};
  try {
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

async function downloadAll(
  row: ReadyRow,
): Promise<DownloadedMedia[]> {
  const out: DownloadedMedia[] = [];
  for (const m of row.mediaUrls) {
    out.push(await downloadMedia(m.url, m.name));
  }
  return out;
}

async function publishRow(row: ReadyRow) {
  await markPublishing(row.pageId);

  let media: DownloadedMedia[];
  try {
    media = await downloadAll(row);
  } catch (e) {
    await markFailed(row.pageId, `Media download failed: ${(e as Error).message}`);
    return;
  }

  const overrides = parseOverrides(row.overrides);
  const urls: Record<string, string> = {};
  const errors: Record<string, string> = {};

  for (const platform of row.platforms) {
    const adapter = adapters[platform];
    if (!adapter) {
      errors[platform] = "Unknown platform";
      continue;
    }
    try {
      const result = await adapter.publish({
        content: row.content,
        media,
        overrides: overrides[platform] || {},
      });
      urls[platform] = result.url;
    } catch (e) {
      errors[platform] = (e as Error).message;
    }
  }

  await appendPartialResult(row.pageId, urls, errors);
}

export async function runOnce(databaseId: string) {
  const rows = await fetchReadyRows(databaseId);
  for (const row of rows) {
    try {
      await publishRow(row);
    } catch (e) {
      await markFailed(row.pageId, (e as Error).message);
    }
  }
  return { processed: rows.length };
}
