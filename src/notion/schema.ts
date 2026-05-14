export const PROP = {
  name: "Name",
  status: "Status",
  platforms: "Platforms",
  content: "Content",
  media: "Media",
  scheduledFor: "Scheduled For",
  overrides: "Overrides",
  publishedUrls: "Published URLs",
  lastError: "Last Error",
  publishedAt: "Published At",
} as const;

export const STATUS = {
  draft: "Draft",
  ready: "Ready to publish",
  publishing: "Publishing",
  published: "Published",
  failed: "Failed",
} as const;

export const PLATFORMS = [
  "linkedin",
  "instagram",
  "tiktok",
  "youtube",
  "substack",
] as const;

export type Platform = (typeof PLATFORMS)[number];

export const DATABASE_TITLE = "Social Publisher";
