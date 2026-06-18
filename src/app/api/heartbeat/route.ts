import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/session";
import { db } from "@/lib/db";

// Every focused heartbeat reports elapsed seconds. We increment the engagement
// meter (the rot fuel) and stamp lastSeenAt. An `away` ping stamps lastSeenAt
// only, so rest-healing starts from the moment you leave.
export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ ok: false }, { status: 401 });

  const { seconds = 0, away = false } = await req.json().catch(() => ({}));
  const inc = Math.min(Math.max(Math.round(Number(seconds) || 0), 0), 10);

  const updated = await db.user.update({
    where: { id: user.id },
    data: away
      ? { lastSeenAt: new Date() }
      : { activeSeconds: { increment: inc }, lastSeenAt: new Date() },
    select: { activeSeconds: true },
  });

  return NextResponse.json({ activeSeconds: updated.activeSeconds });
}
