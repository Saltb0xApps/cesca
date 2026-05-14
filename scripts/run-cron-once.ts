import { config } from "../src/config";
import { runHeadsUp } from "../src/heads-up";
import { runOnce } from "../src/publisher";

async function main() {
  if (!config.notion.databaseId) {
    throw new Error("NOTION_DATABASE_ID not set — run `npm run setup:notion` first.");
  }
  const published = await runOnce(config.notion.databaseId);
  const headsUp = await runHeadsUp(config.notion.databaseId);
  console.log(JSON.stringify({ published, headsUp }, null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
