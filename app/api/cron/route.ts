import { NextResponse, type NextRequest } from "next/server";
import { getAccounts } from "../../../src/accounts";
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

  const accounts = getAccounts();
  if (accounts.length === 0) {
    return NextResponse.json(
      { error: "No accounts configured. Set ACCOUNTS or NOTION_DATABASE_ID." },
      { status: 500 },
    );
  }

  const results = [];
  for (const account of accounts) {
    try {
      const published = await runOnce(account);
      const headsUp = await runHeadsUp(account);
      results.push({ account: account.name, ok: true, published, headsUp });
    } catch (e) {
      results.push({
        account: account.name,
        ok: false,
        error: (e as Error).message,
      });
    }
  }

  return NextResponse.json({ ok: true, results });
}
