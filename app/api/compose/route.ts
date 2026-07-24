import { NextResponse, type NextRequest } from "next/server";
import { findAccount } from "../../../src/accounts";
import { createPost } from "../../../src/notion/mutations";
import type { Platform } from "../../../src/notion/schema";

export const dynamic = "force-dynamic";

interface Body {
  accountName: string;
  name: string;
  status: "Draft" | "Ready to publish";
  platforms: Platform[];
  scheduledFor: string | null;
  defaultCaption: string;
  linkedinBody?: string;
  media: Array<{ name: string; fileUploadId?: string; url?: string }>;
}

export async function POST(req: NextRequest) {
  const body = (await req.json()) as Body;
  const account = findAccount(body.accountName);
  if (!account) {
    return NextResponse.json(
      { error: `Unknown account: ${body.accountName}` },
      { status: 400 },
    );
  }

  try {
    const { id } = await createPost(account.notionDatabaseId, {
      name: body.name || "(untitled)",
      status: body.status,
      platforms: body.platforms,
      scheduledFor: body.scheduledFor,
      defaultCaption: body.defaultCaption,
      linkedinBody: body.linkedinBody,
      defaultMedia: body.media,
    });
    return NextResponse.json({ id });
  } catch (e) {
    return NextResponse.json(
      { error: (e as Error).message },
      { status: 500 },
    );
  }
}
