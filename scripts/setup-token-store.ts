import { config } from "../src/config";
import { notion } from "../src/notion/client";

async function main() {
  const parent = config.notion.parentPageId;
  if (!parent) {
    throw new Error("NOTION_PARENT_PAGE_ID not set in .env");
  }

  const page = await notion.pages.create({
    parent: { type: "page_id", page_id: parent },
    properties: {
      title: {
        title: [{ type: "text", text: { content: "Cesca Token Store" } }],
      },
    },
    children: [
      {
        object: "block",
        type: "callout",
        callout: {
          rich_text: [
            {
              type: "text",
              text: {
                content:
                  "Auto-managed by cesca. Holds rotating LinkedIn OAuth tokens. Don't edit by hand.",
              },
            },
          ],
          icon: { type: "emoji", emoji: "🔒" },
        },
      },
      {
        object: "block",
        type: "code",
        code: {
          language: "json",
          rich_text: [{ type: "text", text: { content: "{}" } }],
        },
      },
    ],
  });

  console.log("Created token store page:", page.id);
  console.log("");
  console.log("Add to .env (and Vercel env):");
  console.log(`NOTION_TOKEN_STORE_PAGE_ID=${page.id}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
