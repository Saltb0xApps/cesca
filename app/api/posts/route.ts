import { NextResponse } from "next/server";
import { getAccounts } from "../../../src/accounts";
import { fetchRecentRows } from "../../../src/notion/queries";

export const dynamic = "force-dynamic";

export async function GET() {
  const accounts = getAccounts();
  if (accounts.length === 0) {
    return NextResponse.json(
      { error: "No accounts configured" },
      { status: 500 },
    );
  }

  try {
    const all = await Promise.all(
      accounts.map(async (account) => {
        const rows = await fetchRecentRows(account.notionDatabaseId, 50);
        return rows.map((r) => ({ ...r, account: account.name }));
      }),
    );
    const rows = all.flat().sort((a, b) =>
      b.lastEditedTime.localeCompare(a.lastEditedTime),
    );
    return NextResponse.json({
      accounts: accounts.map((a) => a.name),
      rows,
    });
  } catch (e) {
    return NextResponse.json(
      { error: (e as Error).message },
      { status: 500 },
    );
  }
}
