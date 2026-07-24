import { NextResponse } from "next/server";
import { getAccounts } from "../../../src/accounts";

export const dynamic = "force-dynamic";

export async function GET() {
  const accounts = getAccounts();
  return NextResponse.json({
    accounts: accounts.map((a) => ({
      name: a.name,
      hasLinkedIn: Boolean(a.linkedin),
      authorUrn: a.linkedin?.authorUrn || null,
      expiresAt: a.linkedin?.expiresAt || null,
      isOrganization: a.linkedin?.authorUrn.includes("organization") || false,
    })),
  });
}
