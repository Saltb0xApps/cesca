import { Client } from "@notionhq/client";
import { config } from "../config";

let _client: Client | undefined;

function getClient(): Client {
  if (!_client) {
    if (!config.notion.token) {
      throw new Error("NOTION_TOKEN not set");
    }
    _client = new Client({ auth: config.notion.token });
  }
  return _client;
}

export const notion = new Proxy({} as Client, {
  get(_, prop: string | symbol) {
    return (getClient() as any)[prop];
  },
});
