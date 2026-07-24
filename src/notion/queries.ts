import { notion } from "./client";
import { PROP, STATUS, type Platform } from "./schema";

export interface NotionFile {
  url: string;
  name: string;
}

export interface ReadyRow {
  pageId: string;
  name: string;
  platforms: Platform[];
  scheduledFor: string | null;

  defaultCaption: string;
  defaultMedia: NotionFile[];

  linkedinBody: string;
  linkedinMedia: NotionFile[];

  instagramCaption: string;
  instagramMedia: NotionFile[];
  instagramFirstComment: string;

  tiktokCaption: string;
  tiktokVideo: NotionFile[];
  tiktokPrivacy: string | null;

  youtubeTitle: string;
  youtubeDescription: string;
  youtubeVideo: NotionFile[];
  youtubeTags: string[];
  youtubeVisibility: string | null;

  substackTitle: string;
  substackSubtitle: string;
  substackBody: string;
}

function plainText(rich: any[]): string {
  return (rich || []).map((r) => r.plain_text || "").join("");
}

function files(p: any): NotionFile[] {
  return (p?.files || []).map((f: any) => ({
    name: f.name as string,
    url: (f.type === "external" ? f.external?.url : f.file?.url) as string,
  }));
}

function multiSelect(p: any): string[] {
  return (p?.multi_select || []).map((o: any) => o.name as string);
}

function selectName(p: any): string | null {
  return p?.select?.name || null;
}

function richText(p: any): string {
  return plainText(p?.rich_text || []);
}

export async function fetchOneRowAsReady(pageId: string): Promise<ReadyRow> {
  const page = await notion.pages.retrieve({ page_id: pageId });
  return mapRow(page as any);
}

function mapRow(page: any): ReadyRow {
  const p = page.properties;
  return {
    pageId: page.id,
    name: plainText(p[PROP.name]?.title || []),
    platforms: multiSelect(p[PROP.platforms]) as Platform[],
    scheduledFor: p[PROP.scheduledFor]?.date?.start || null,

    defaultCaption: richText(p[PROP.defaultCaption]),
    defaultMedia: files(p[PROP.defaultMedia]),

    linkedinBody: richText(p[PROP.linkedinBody]),
    linkedinMedia: files(p[PROP.linkedinMedia]),

    instagramCaption: richText(p[PROP.instagramCaption]),
    instagramMedia: files(p[PROP.instagramMedia]),
    instagramFirstComment: richText(p[PROP.instagramFirstComment]),

    tiktokCaption: richText(p[PROP.tiktokCaption]),
    tiktokVideo: files(p[PROP.tiktokVideo]),
    tiktokPrivacy: selectName(p[PROP.tiktokPrivacy]),

    youtubeTitle: richText(p[PROP.youtubeTitle]),
    youtubeDescription: richText(p[PROP.youtubeDescription]),
    youtubeVideo: files(p[PROP.youtubeVideo]),
    youtubeTags: multiSelect(p[PROP.youtubeTags]),
    youtubeVisibility: selectName(p[PROP.youtubeVisibility]),

    substackTitle: richText(p[PROP.substackTitle]),
    substackSubtitle: richText(p[PROP.substackSubtitle]),
    substackBody: richText(p[PROP.substackBody]),
  };
}

export interface DashboardRow {
  pageId: string;
  name: string;
  status: string;
  platforms: Platform[];
  scheduledFor: string | null;
  publishedUrls: string;
  lastError: string;
  publishedAt: string | null;
  lastEditedTime: string;
}

export async function fetchRecentRows(
  databaseId: string,
  pageSize = 50,
): Promise<DashboardRow[]> {
  const res = await notion.databases.query({
    database_id: databaseId,
    sorts: [{ timestamp: "last_edited_time", direction: "descending" }],
    page_size: pageSize,
  });
  return res.results.map((page: any) => {
    const p = page.properties;
    return {
      pageId: page.id,
      name: plainText(p[PROP.name]?.title || []),
      status: selectName(p[PROP.status]) || "",
      platforms: multiSelect(p[PROP.platforms]) as Platform[],
      scheduledFor: p[PROP.scheduledFor]?.date?.start || null,
      publishedUrls: richText(p[PROP.publishedUrls]),
      lastError: richText(p[PROP.lastError]),
      publishedAt: p[PROP.publishedAt]?.date?.start || null,
      lastEditedTime: page.last_edited_time,
    };
  });
}

export async function fetchReadyRows(databaseId: string): Promise<ReadyRow[]> {
  const nowIso = new Date().toISOString();
  const res = await notion.databases.query({
    database_id: databaseId,
    filter: {
      and: [
        { property: PROP.status, select: { equals: STATUS.ready } },
        {
          or: [
            { property: PROP.scheduledFor, date: { is_empty: true } },
            { property: PROP.scheduledFor, date: { on_or_before: nowIso } },
          ],
        },
      ],
    },
    page_size: 25,
  });
  return res.results.map(mapRow);
}

export async function markPublishing(pageId: string) {
  await notion.pages.update({
    page_id: pageId,
    properties: {
      [PROP.status]: { select: { name: STATUS.publishing } },
    },
  });
}

export async function markResult(
  pageId: string,
  urls: Record<string, string>,
  errors: Record<string, string>,
) {
  const urlText = Object.entries(urls)
    .map(([platform, url]) => `${platform}: ${url}`)
    .join("\n");
  const errText = Object.entries(errors)
    .map(([platform, err]) => `${platform}: ${err}`)
    .join("\n");
  const hasErrors = Object.keys(errors).length > 0;

  await notion.pages.update({
    page_id: pageId,
    properties: {
      [PROP.status]: {
        select: { name: hasErrors ? STATUS.failed : STATUS.published },
      },
      [PROP.publishedUrls]: {
        rich_text: urlText
          ? [{ type: "text", text: { content: urlText } }]
          : [],
      },
      [PROP.lastError]: {
        rich_text: errText
          ? [{ type: "text", text: { content: errText.slice(0, 2000) } }]
          : [],
      },
      [PROP.publishedAt]: { date: { start: new Date().toISOString() } },
      [PROP.headsUpSent]: { checkbox: false },
    },
  });
}

export interface UpcomingRow {
  pageId: string;
  name: string;
  scheduledFor: string;
  minutesAway: number;
}

export async function fetchUpcomingRows(
  databaseId: string,
  windowMinutes: number,
): Promise<UpcomingRow[]> {
  const now = Date.now();
  const horizon = new Date(now + windowMinutes * 60_000).toISOString();
  const nowIso = new Date(now).toISOString();

  const res = await notion.databases.query({
    database_id: databaseId,
    filter: {
      and: [
        { property: PROP.status, select: { equals: STATUS.ready } },
        { property: PROP.scheduledFor, date: { on_or_before: horizon } },
        { property: PROP.scheduledFor, date: { after: nowIso } },
        { property: PROP.headsUpSent, checkbox: { equals: false } },
      ],
    },
    page_size: 25,
  });

  return res.results.map((page: any) => {
    const p = page.properties;
    const scheduledFor = p[PROP.scheduledFor]?.date?.start as string;
    const minutesAway = Math.max(
      0,
      Math.round((new Date(scheduledFor).getTime() - now) / 60_000),
    );
    return {
      pageId: page.id,
      name: plainText(p[PROP.name]?.title || []),
      scheduledFor,
      minutesAway,
    };
  });
}

export async function markHeadsUpSent(pageId: string) {
  await notion.pages.update({
    page_id: pageId,
    properties: {
      [PROP.headsUpSent]: { checkbox: true },
    },
  });
}

export async function markFailed(pageId: string, error: string) {
  await notion.pages.update({
    page_id: pageId,
    properties: {
      [PROP.status]: { select: { name: STATUS.failed } },
      [PROP.lastError]: {
        rich_text: [{ type: "text", text: { content: error.slice(0, 2000) } }],
      },
    },
  });
}
