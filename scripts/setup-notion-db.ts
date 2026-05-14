import { notion } from "../src/notion/client.js";
import { config } from "../src/config.js";
import {
  DATABASE_TITLE,
  PLATFORMS,
  PROP,
  STATUS,
} from "../src/notion/schema.js";

async function main() {
  const parent = config.notion.parentPageId;
  if (!parent) {
    throw new Error(
      "NOTION_PARENT_PAGE_ID not set. Open a Notion page where the DB should live, copy the 32-char ID from the URL into .env, then re-run.",
    );
  }

  const created = await notion.databases.create({
    parent: { type: "page_id", page_id: parent },
    title: [{ type: "text", text: { content: DATABASE_TITLE } }],
    properties: {
      [PROP.name]: { title: {} },
      [PROP.status]: {
        select: {
          options: Object.values(STATUS).map((name) => ({ name })),
        },
      },
      [PROP.platforms]: {
        multi_select: {
          options: PLATFORMS.map((p) => ({ name: p })),
        },
      },
      [PROP.content]: { rich_text: {} },
      [PROP.media]: { files: {} },
      [PROP.scheduledFor]: { date: {} },
      [PROP.overrides]: { rich_text: {} },
      [PROP.publishedUrls]: { rich_text: {} },
      [PROP.lastError]: { rich_text: {} },
      [PROP.publishedAt]: { date: {} },
    },
  });

  console.log("Created database:", created.id);
  console.log("");
  console.log("Add to .env:");
  console.log(`NOTION_DATABASE_ID=${created.id}`);
  console.log("");
  console.log(
    `Status options created as a Select: ${Object.values(STATUS).join(", ")}`,
  );
  console.log(
    "(Notion's API doesn't allow creating Status-type properties; we use Select instead. You can convert it to Status in the UI if you prefer the kanban look.)",
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
