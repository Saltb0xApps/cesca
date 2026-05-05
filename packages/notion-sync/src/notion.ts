const NOTION_VERSION = "2022-06-28";

export interface NotionConfig {
  token: string;
  pageId: string;
}

export function readConfig(): NotionConfig {
  const token = process.env.NOTION_TOKEN;
  const pageId = process.env.NOTION_PAGE_ID;
  if (!token || !pageId) {
    console.error("Set NOTION_TOKEN and NOTION_PAGE_ID in the environment.");
    process.exit(1);
  }
  return { token, pageId };
}

async function notionFetch(
  cfg: NotionConfig,
  path: string,
  init: RequestInit = {},
): Promise<unknown> {
  const res = await fetch(`https://api.notion.com${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${cfg.token}`,
      "Notion-Version": NOTION_VERSION,
      "Content-Type": "application/json",
      ...(init.headers ?? {}),
    },
  });
  const body = await res.text();
  if (!res.ok) {
    throw new Error(`Notion ${res.status} ${res.statusText}: ${body}`);
  }
  return body ? JSON.parse(body) : null;
}

export async function getPage(cfg: NotionConfig): Promise<unknown> {
  return notionFetch(cfg, `/v1/pages/${cfg.pageId}`);
}

export async function appendParagraphs(
  cfg: NotionConfig,
  header: string,
  paragraphs: string[],
): Promise<void> {
  const children = [
    headingBlock(header),
    ...paragraphs.map(paragraphBlock),
  ];
  await notionFetch(cfg, `/v1/blocks/${cfg.pageId}/children`, {
    method: "PATCH",
    body: JSON.stringify({ children }),
  });
}

function paragraphBlock(text: string) {
  return {
    object: "block",
    type: "paragraph",
    paragraph: {
      rich_text: [{ type: "text", text: { content: text } }],
    },
  };
}

function headingBlock(text: string) {
  return {
    object: "block",
    type: "heading_2",
    heading_2: {
      rich_text: [{ type: "text", text: { content: text } }],
    },
  };
}
