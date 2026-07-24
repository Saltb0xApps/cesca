import { notion } from "./client";
import { PROP, STATUS, type Platform } from "./schema";

export interface CreatePostInput {
  name: string;
  status: string;
  platforms: Platform[];
  scheduledFor: string | null;
  defaultCaption: string;
  defaultMedia: Array<{ name: string; fileUploadId?: string; url?: string }>;
  linkedinBody?: string;
}

function fileProps(files: CreatePostInput["defaultMedia"]) {
  return files.map((f) => {
    if (f.fileUploadId) {
      return {
        name: f.name,
        type: "file_upload" as const,
        file_upload: { id: f.fileUploadId },
      };
    }
    return {
      name: f.name,
      type: "external" as const,
      external: { url: f.url! },
    };
  });
}

export async function createPost(databaseId: string, input: CreatePostInput) {
  const properties: Record<string, any> = {
    [PROP.name]: {
      title: [{ type: "text", text: { content: input.name } }],
    },
    [PROP.status]: { select: { name: input.status } },
    [PROP.platforms]: {
      multi_select: input.platforms.map((p) => ({ name: p })),
    },
    [PROP.defaultCaption]: input.defaultCaption
      ? { rich_text: [{ type: "text", text: { content: input.defaultCaption } }] }
      : { rich_text: [] },
    [PROP.defaultMedia]: { files: fileProps(input.defaultMedia) },
  };

  if (input.scheduledFor) {
    properties[PROP.scheduledFor] = { date: { start: input.scheduledFor } };
  }

  if (input.linkedinBody) {
    properties[PROP.linkedinBody] = {
      rich_text: [{ type: "text", text: { content: input.linkedinBody } }],
    };
  }

  const created = await notion.pages.create({
    parent: { database_id: databaseId },
    properties,
  });

  return { id: created.id };
}

export async function deletePost(pageId: string) {
  await notion.pages.update({ page_id: pageId, archived: true });
}

export async function retrievePost(pageId: string) {
  return await notion.pages.retrieve({ page_id: pageId });
}

export { STATUS };
