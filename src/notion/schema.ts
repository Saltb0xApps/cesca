export const PROP = {
  // Shared
  name: "Name",
  status: "Status",
  platforms: "Platforms",
  scheduledFor: "Scheduled For",
  defaultCaption: "Default Caption",
  defaultMedia: "Default Media",
  publishedUrls: "Published URLs",
  lastError: "Last Error",
  publishedAt: "Published At",

  // LinkedIn
  linkedinBody: "LinkedIn Body",
  linkedinMedia: "LinkedIn Media",

  // Instagram
  instagramCaption: "Instagram Caption",
  instagramMedia: "Instagram Media",
  instagramFirstComment: "Instagram First Comment",

  // TikTok
  tiktokCaption: "TikTok Caption",
  tiktokVideo: "TikTok Video",
  tiktokPrivacy: "TikTok Privacy",

  // YouTube
  youtubeTitle: "YouTube Title",
  youtubeDescription: "YouTube Description",
  youtubeVideo: "YouTube Video",
  youtubeTags: "YouTube Tags",
  youtubeVisibility: "YouTube Visibility",

  // Substack
  substackTitle: "Substack Title",
  substackSubtitle: "Substack Subtitle",
  substackBody: "Substack Body",
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

export const TIKTOK_PRIVACY = [
  "public",
  "friends",
  "private",
] as const;

export const YOUTUBE_VISIBILITY = ["public", "unlisted", "private"] as const;

export const DATABASE_TITLE = "Social Publisher";

type PropertyKind =
  | { kind: "title" }
  | { kind: "rich_text" }
  | { kind: "select"; options: readonly string[] }
  | { kind: "multi_select"; options: readonly string[] }
  | { kind: "date" }
  | { kind: "files" };

export const PROPERTY_DEFS: Record<string, PropertyKind> = {
  [PROP.name]: { kind: "title" },
  [PROP.status]: { kind: "select", options: Object.values(STATUS) },
  [PROP.platforms]: { kind: "multi_select", options: PLATFORMS },
  [PROP.scheduledFor]: { kind: "date" },
  [PROP.defaultCaption]: { kind: "rich_text" },
  [PROP.defaultMedia]: { kind: "files" },
  [PROP.publishedUrls]: { kind: "rich_text" },
  [PROP.lastError]: { kind: "rich_text" },
  [PROP.publishedAt]: { kind: "date" },

  [PROP.linkedinBody]: { kind: "rich_text" },
  [PROP.linkedinMedia]: { kind: "files" },

  [PROP.instagramCaption]: { kind: "rich_text" },
  [PROP.instagramMedia]: { kind: "files" },
  [PROP.instagramFirstComment]: { kind: "rich_text" },

  [PROP.tiktokCaption]: { kind: "rich_text" },
  [PROP.tiktokVideo]: { kind: "files" },
  [PROP.tiktokPrivacy]: { kind: "select", options: TIKTOK_PRIVACY },

  [PROP.youtubeTitle]: { kind: "rich_text" },
  [PROP.youtubeDescription]: { kind: "rich_text" },
  [PROP.youtubeVideo]: { kind: "files" },
  [PROP.youtubeTags]: { kind: "multi_select", options: [] },
  [PROP.youtubeVisibility]: { kind: "select", options: YOUTUBE_VISIBILITY },

  [PROP.substackTitle]: { kind: "rich_text" },
  [PROP.substackSubtitle]: { kind: "rich_text" },
  [PROP.substackBody]: { kind: "rich_text" },
};

export function propertySchema(name: string): any {
  const def = PROPERTY_DEFS[name];
  if (!def) throw new Error(`Unknown property: ${name}`);
  switch (def.kind) {
    case "title":
      return { title: {} };
    case "rich_text":
      return { rich_text: {} };
    case "date":
      return { date: {} };
    case "files":
      return { files: {} };
    case "select":
      return { select: { options: def.options.map((name) => ({ name })) } };
    case "multi_select":
      return {
        multi_select: { options: def.options.map((name) => ({ name })) },
      };
  }
}
