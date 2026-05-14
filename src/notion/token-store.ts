import { notion } from "./client";

export interface StoredLinkedInTokens {
  accessToken: string;
  refreshToken?: string;
  expiresAt?: string;
}

export type StoredTokens = Record<string, StoredLinkedInTokens>;

async function findStorageBlock(pageId: string): Promise<any | null> {
  const res = await notion.blocks.children.list({
    block_id: pageId,
    page_size: 50,
  });
  for (const block of res.results) {
    if ((block as any).type === "code") return block;
  }
  return null;
}

export async function loadStoredTokens(pageId: string): Promise<StoredTokens> {
  const block = await findStorageBlock(pageId);
  if (!block) return {};
  const text = ((block as any).code.rich_text || [])
    .map((r: any) => r.plain_text || "")
    .join("");
  if (!text.trim()) return {};
  try {
    return JSON.parse(text) as StoredTokens;
  } catch {
    return {};
  }
}

export async function saveStoredTokens(
  pageId: string,
  tokens: StoredTokens,
): Promise<void> {
  const block = await findStorageBlock(pageId);
  const json = JSON.stringify(tokens, null, 2);
  const codePayload = {
    language: "json" as const,
    rich_text: [{ type: "text" as const, text: { content: json } }],
  };

  if (block) {
    await notion.blocks.update({
      block_id: block.id,
      code: codePayload,
    });
  } else {
    await notion.blocks.children.append({
      block_id: pageId,
      children: [{ object: "block", type: "code", code: codePayload }],
    });
  }
}
