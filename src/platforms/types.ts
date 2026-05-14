import type { DownloadedMedia } from "../media/download";

export interface PublishInput {
  // Main body/caption already resolved for this platform (override or default).
  content: string;
  media: DownloadedMedia[];

  // Optional platform-specific fields. Each adapter only reads what it needs.
  title?: string;
  subtitle?: string;
  description?: string;
  tags?: string[];
  visibility?: string;
  firstComment?: string;
  privacy?: string;
}

export interface PublishResult {
  url: string;
}

export interface PlatformAdapter {
  name: string;
  publish(input: PublishInput): Promise<PublishResult>;
}
