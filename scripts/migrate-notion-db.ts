import { notion } from "../src/notion/client";
import { config } from "../src/config";
import { PROP, PROPERTY_DEFS, propertySchema } from "../src/notion/schema";

const RENAMES: Record<string, string> = {
  Content: PROP.defaultCaption,
  Media: PROP.defaultMedia,
};
const DELETIONS = ["Overrides"];

async function main() {
  const databaseId = config.notion.databaseId;
  if (!databaseId) {
    throw new Error("NOTION_DATABASE_ID not set in .env");
  }

  const db = await notion.databases.retrieve({ database_id: databaseId });
  const existing = (db as any).properties as Record<string, any>;

  const updates: Record<string, any> = {};

  for (const [oldName, newName] of Object.entries(RENAMES)) {
    if (existing[oldName] && !existing[newName]) {
      updates[oldName] = { name: newName };
      console.log(`Renaming "${oldName}" → "${newName}"`);
    }
  }

  for (const name of DELETIONS) {
    if (existing[name]) {
      updates[name] = null;
      console.log(`Deleting "${name}"`);
    }
  }

  for (const name of Object.keys(PROPERTY_DEFS)) {
    const willBeRenamedTo = Object.values(RENAMES).includes(name);
    const sourceForRename = Object.entries(RENAMES).find(
      ([from, to]) => to === name && existing[from] && !existing[to],
    );
    if (existing[name] || sourceForRename) continue;
    if (willBeRenamedTo && sourceForRename) continue;
    updates[name] = propertySchema(name);
    console.log(`Adding "${name}"`);
  }

  if (Object.keys(updates).length === 0) {
    console.log("Database is already up to date.");
    return;
  }

  await notion.databases.update({
    database_id: databaseId,
    properties: updates,
  });

  console.log("");
  console.log("Migration complete.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
