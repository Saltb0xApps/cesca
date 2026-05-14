import type { DownloadedMedia } from "../media/download.js";

export interface PublishInput {
  content: string;
  media: DownloadedMedia[];
  overrides: Record<string, unknown>;
}

export interface PublishResult {
  url: string;
}

export interface PlatformAdapter {
  name: string;
  publish(input: PublishInput): Promise<PublishResult>;
}
