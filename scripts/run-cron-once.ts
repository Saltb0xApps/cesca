import { config } from "../src/config.js";
import { runOnce } from "../src/publisher.js";

async function main() {
  if (!config.notion.databaseId) {
    throw new Error("NOTION_DATABASE_ID not set — run `npm run setup:notion` first.");
  }
  const result = await runOnce(config.notion.databaseId);
  console.log(JSON.stringify(result, null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
