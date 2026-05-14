import { downloadMedia, type DownloadedMedia } from "./media/download";
import {
  fetchReadyRows,
  markFailed,
  markPublishing,
  markResult,
  type NotionFile,
  type ReadyRow,
} from "./notion/queries";
import type { Platform } from "./notion/schema";
import { adapters } from "./platforms/index";
import type { PublishInput } from "./platforms/types";
import {
  formatPartial,
  formatPublishFailure,
  formatPublishSuccess,
  sendTelegramMessage,
} from "./notify/telegram";

class MediaCache {
  private cache = new Map<string, Promise<DownloadedMedia>>();

  download(file: NotionFile): Promise<DownloadedMedia> {
    let p = this.cache.get(file.url);
    if (!p) {
      p = downloadMedia(file.url, file.name);
      this.cache.set(file.url, p);
    }
    return p;
  }

  async downloadAll(files: NotionFile[]): Promise<DownloadedMedia[]> {
    return Promise.all(files.map((f) => this.download(f)));
  }
}

function pickMedia(
  override: NotionFile[],
  fallback: NotionFile[],
): NotionFile[] {
  return override.length > 0 ? override : fallback;
}

async function buildInputFor(
  platform: Platform,
  row: ReadyRow,
  cache: MediaCache,
): Promise<PublishInput> {
  switch (platform) {
    case "linkedin": {
      const media = pickMedia(row.linkedinMedia, row.defaultMedia);
      return {
        content: row.linkedinBody || row.defaultCaption,
        media: await cache.downloadAll(media),
      };
    }
    case "instagram": {
      const media = pickMedia(row.instagramMedia, row.defaultMedia);
      return {
        content: row.instagramCaption || row.defaultCaption,
        media: await cache.downloadAll(media),
        firstComment: row.instagramFirstComment || undefined,
      };
    }
    case "tiktok": {
      const media = pickMedia(row.tiktokVideo, row.defaultMedia);
      return {
        content: row.tiktokCaption || row.defaultCaption,
        media: await cache.downloadAll(media),
        privacy: row.tiktokPrivacy || "public",
      };
    }
    case "youtube": {
      return {
        content: row.youtubeDescription,
        media: await cache.downloadAll(row.youtubeVideo),
        title: row.youtubeTitle,
        description: row.youtubeDescription,
        tags: row.youtubeTags,
        visibility: row.youtubeVisibility || "public",
      };
    }
    case "substack": {
      return {
        content: row.substackBody,
        media: [],
        title: row.substackTitle,
        subtitle: row.substackSubtitle,
      };
    }
  }
}

function validateFor(platform: Platform, input: PublishInput): string | null {
  switch (platform) {
    case "linkedin":
      if (!input.content.trim()) return "LinkedIn Body / Default Caption is empty";
      return null;
    case "instagram":
      if (!input.media.length) return "Instagram requires at least one media file";
      return null;
    case "tiktok":
      if (!input.media.length) return "TikTok requires a video file";
      return null;
    case "youtube":
      if (!input.title?.trim()) return "YouTube Title is required";
      if (!input.media.length) return "YouTube Video is required";
      return null;
    case "substack":
      if (!input.title?.trim()) return "Substack Title is required";
      return null;
  }
}

async function publishRow(row: ReadyRow) {
  await markPublishing(row.pageId);

  const cache = new MediaCache();
  const urls: Record<string, string> = {};
  const errors: Record<string, string> = {};

  for (const platform of row.platforms) {
    const adapter = adapters[platform];
    if (!adapter) {
      errors[platform] = "Unknown platform";
      continue;
    }
    try {
      const input = await buildInputFor(platform, row, cache);
      const validationError = validateFor(platform, input);
      if (validationError) {
        errors[platform] = validationError;
        continue;
      }
      const result = await adapter.publish(input);
      urls[platform] = result.url;
    } catch (e) {
      errors[platform] = (e as Error).message;
    }
  }

  await markResult(row.pageId, urls, errors);
  await notifyResult(row.name, urls, errors);
}

async function notifyResult(
  name: string,
  urls: Record<string, string>,
  errors: Record<string, string>,
) {
  const hasUrls = Object.keys(urls).length > 0;
  const hasErrors = Object.keys(errors).length > 0;
  let message: string;
  if (hasUrls && hasErrors) message = formatPartial(name, urls, errors);
  else if (hasErrors) message = formatPublishFailure(name, errors);
  else if (hasUrls) message = formatPublishSuccess(name, urls);
  else return;
  await sendTelegramMessage(message);
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
