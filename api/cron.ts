import type { VercelRequest, VercelResponse } from "@vercel/node";
import { config } from "../src/config.js";
import { runHeadsUp } from "../src/heads-up.js";
import { runOnce } from "../src/publisher.js";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (config.cron.secret) {
    const auth = req.headers["authorization"];
    if (auth !== `Bearer ${config.cron.secret}`) {
      return res.status(401).json({ error: "unauthorized" });
    }
  }

  const databaseId = config.notion.databaseId;
  if (!databaseId) {
    return res.status(500).json({ error: "NOTION_DATABASE_ID not set" });
  }

  try {
    const published = await runOnce(databaseId);
    const headsUp = await runHeadsUp(databaseId);
    return res.status(200).json({ ok: true, published, headsUp });
  } catch (e) {
    return res.status(500).json({ ok: false, error: (e as Error).message });
  }
}
