import { config } from "../config";

const NOTION_API = "https://api.notion.com/v1";
const NOTION_VERSION = "2022-06-28";

interface CreatedUpload {
  id: string;
  upload_url: string;
}

async function notionHeaders(extra: Record<string, string> = {}) {
  if (!config.notion.token) throw new Error("NOTION_TOKEN not set");
  return {
    Authorization: `Bearer ${config.notion.token}`,
    "Notion-Version": NOTION_VERSION,
    ...extra,
  };
}

async function createUpload(): Promise<CreatedUpload> {
  const res = await fetch(`${NOTION_API}/file_uploads`, {
    method: "POST",
    headers: await notionHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify({}),
  });
  if (!res.ok) {
    throw new Error(`Notion file_uploads create failed: ${res.status} ${await res.text()}`);
  }
  return (await res.json()) as CreatedUpload;
}

async function sendUpload(
  uploadId: string,
  file: Blob,
  filename: string,
): Promise<void> {
  const form = new FormData();
  form.append("file", file, filename);

  const res = await fetch(`${NOTION_API}/file_uploads/${uploadId}/send`, {
    method: "POST",
    headers: await notionHeaders(),
    body: form,
  });
  if (!res.ok) {
    throw new Error(`Notion file_uploads send failed: ${res.status} ${await res.text()}`);
  }
}

export interface UploadedFile {
  id: string;
  name: string;
}

export async function uploadFileToNotion(
  file: Blob,
  filename: string,
): Promise<UploadedFile> {
  const created = await createUpload();
  await sendUpload(created.id, file, filename);
  return { id: created.id, name: filename };
}
