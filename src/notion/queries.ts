import { notion } from "./client.js";
import { PROP, STATUS, type Platform } from "./schema.js";

export interface ReadyRow {
  pageId: string;
  name: string;
  platforms: Platform[];
  content: string;
  mediaUrls: Array<{ url: string; name: string }>;
  scheduledFor: string | null;
  overrides: string;
}

function plainText(rich: any[]): string {
  return (rich || []).map((r) => r.plain_text || "").join("");
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

  return res.results.map((page: any) => {
    const p = page.properties;
    const media = (p[PROP.media]?.files || []).map((f: any) => ({
      name: f.name as string,
      url: (f.type === "external" ? f.external?.url : f.file?.url) as string,
    }));

    return {
      pageId: page.id as string,
      name: plainText(p[PROP.name]?.title || []),
      platforms: (p[PROP.platforms]?.multi_select || []).map(
        (o: any) => o.name as Platform,
      ),
      content: plainText(p[PROP.content]?.rich_text || []),
      mediaUrls: media,
      scheduledFor: p[PROP.scheduledFor]?.date?.start || null,
      overrides: plainText(p[PROP.overrides]?.rich_text || []),
    };
  });
}

export async function setStatus(pageId: string, status: string) {
  await notion.pages.update({
    page_id: pageId,
    properties: {
      [PROP.status]: { select: { name: status } },
    },
  });
}

export async function markPublishing(pageId: string) {
  await setStatus(pageId, STATUS.publishing);
}

export async function markPublished(
  pageId: string,
  urls: Record<string, string>,
) {
  const urlText = Object.entries(urls)
    .map(([platform, url]) => `${platform}: ${url}`)
    .join("\n");

  await notion.pages.update({
    page_id: pageId,
    properties: {
      [PROP.status]: { select: { name: STATUS.published } },
      [PROP.publishedUrls]: {
        rich_text: [{ type: "text", text: { content: urlText } }],
      },
      [PROP.publishedAt]: { date: { start: new Date().toISOString() } },
      [PROP.lastError]: { rich_text: [] },
    },
  });
}

export async function markFailed(pageId: string, error: string) {
  await notion.pages.update({
    page_id: pageId,
    properties: {
      [PROP.status]: { select: { name: STATUS.failed } },
      [PROP.lastError]: {
        rich_text: [
          { type: "text", text: { content: error.slice(0, 2000) } },
        ],
      },
    },
  });
}

export async function appendPartialResult(
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
        status: { name: hasErrors ? STATUS.failed : STATUS.published },
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
    },
  });
}
