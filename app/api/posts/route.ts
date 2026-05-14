import { NextResponse } from "next/server";
import { config } from "../../../src/config";
import { fetchRecentRows } from "../../../src/notion/queries";

export const dynamic = "force-dynamic";

export async function GET() {
  if (!config.notion.databaseId) {
    return NextResponse.json(
      { error: "NOTION_DATABASE_ID not set" },
      { status: 500 },
    );
  }
  try {
    const rows = await fetchRecentRows(config.notion.databaseId, 50);
    return NextResponse.json({ rows });
  } catch (e) {
    return NextResponse.json(
      { error: (e as Error).message },
      { status: 500 },
    );
  }
}
