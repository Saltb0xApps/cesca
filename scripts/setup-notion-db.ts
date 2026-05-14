import { notion } from "../src/notion/client";
import { config } from "../src/config";
import {
  DATABASE_TITLE,
  PROPERTY_DEFS,
  propertySchema,
} from "../src/notion/schema";

async function main() {
  const parent = config.notion.parentPageId;
  if (!parent) {
    throw new Error(
      "NOTION_PARENT_PAGE_ID not set. Open a Notion page where the DB should live, copy the 32-char ID from the URL into .env, then re-run.",
    );
  }

  const accountName = process.argv[2];
  const title = accountName
    ? `${DATABASE_TITLE} — ${accountName}`
    : DATABASE_TITLE;

  const properties: Record<string, any> = {};
  for (const name of Object.keys(PROPERTY_DEFS)) {
    properties[name] = propertySchema(name);
  }

  const created = await notion.databases.create({
    parent: { type: "page_id", page_id: parent },
    title: [{ type: "text", text: { content: title } }],
    properties,
  });

  console.log("Created database:", created.id);
  console.log("");
  if (accountName) {
    console.log(
      `In your ACCOUNTS env var, set notionDatabaseId for "${accountName}" to:`,
    );
    console.log(`  ${created.id}`);
  } else {
    console.log("Add to .env:");
    console.log(`NOTION_DATABASE_ID=${created.id}`);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
