import { NextResponse, type NextRequest } from "next/server";
import { loadAccountsWithFreshTokens } from "../../../../../src/accounts";
import { fetchOneRowAsReady, markFailed } from "../../../../../src/notion/queries";
import { publishRow } from "../../../../../src/publisher";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: pageId } = await params;

  const url = new URL(_req.url);
  const accountName = url.searchParams.get("account");

  const accounts = await loadAccountsWithFreshTokens();
  const account = accountName
    ? accounts.find((a) => a.name === accountName)
    : accounts[0];
  if (!account) {
    return NextResponse.json(
      { error: "No account found" },
      { status: 400 },
    );
  }

  try {
    const row = await fetchOneRowAsReady(pageId);
    await publishRow(row, account);
    return NextResponse.json({ ok: true });
  } catch (e) {
    await markFailed(pageId, (e as Error).message).catch(() => {});
    return NextResponse.json(
      { error: (e as Error).message },
      { status: 500 },
    );
  }
}
