import { NextResponse, type NextRequest } from "next/server";
import { config } from "../../../src/config";
import { runHeadsUp } from "../../../src/heads-up";
import { runOnce } from "../../../src/publisher";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(req: NextRequest) {
  if (config.cron.secret) {
    const auth = req.headers.get("authorization");
    if (auth !== `Bearer ${config.cron.secret}`) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }
  }

  const databaseId = config.notion.databaseId;
  if (!databaseId) {
    return NextResponse.json(
      { error: "NOTION_DATABASE_ID not set" },
      { status: 500 },
    );
  }

  try {
    const published = await runOnce(databaseId);
    const headsUp = await runHeadsUp(databaseId);
    return NextResponse.json({ ok: true, published, headsUp });
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: (e as Error).message },
      { status: 500 },
    );
  }
}
