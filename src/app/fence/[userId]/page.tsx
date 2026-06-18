import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/session";
import { db } from "@/lib/db";
import { Nav } from "@/components/Nav";
import { parseTags } from "@/lib/tags";
import { compatScore } from "@/lib/incompat";
import { resolveRates } from "@/lib/rot";
import { PlantCard } from "@/components/PlantCard";

export const dynamic = "force-dynamic";

export default async function FencePage({ params }: { params: Promise<{ userId: string }> }) {
  const me = await getCurrentUser();
  if (!me) redirect("/login");
  const { userId } = await params;

  const them = await db.user.findUnique({
    where: { id: userId },
    include: { plants: { orderBy: { createdAt: "desc" } } },
  });
  if (!them || them.id === me.id) notFound();

  // You can only peek at gardens you'd actually like. Strangers stay walled off.
  if (compatScore(parseTags(me.tags), parseTags(them.tags)) <= 0) notFound();

  const rates = resolveRates();

  return (
    <>
      <Nav username={me.username} />
      <main className="wrap" style={{ paddingTop: 28 }}>
        <Link href="/meet" className="faint">
          ← back
        </Link>
        <h2 style={{ marginBottom: 2 }}>@{them.username}&apos;s garden</h2>
        <p className="warn" style={{ marginTop: 0 }}>
          🔒 you'd love it here. that's exactly why you can't come in.
        </p>

        <div className="fence" style={{ marginTop: 18 }}>
          <div className="caged">
            {them.plants.length === 0 ? (
              <p className="muted">empty plot.</p>
            ) : (
              <div className="grid">
                {them.plants.map((p) => (
                  <PlantCard
                    key={p.id}
                    plant={{
                      id: p.id,
                      label: p.label,
                      drawing: p.drawing,
                      kind: p.kind,
                      plantedAtActiveSeconds: p.plantedAtActiveSeconds,
                    }}
                    rates={rates}
                    activeSeconds={them.activeSeconds}
                    lastSeenAt={them.lastSeenAt}
                  />
                ))}
              </div>
            )}
          </div>
        </div>

        <p className="faint" style={{ marginTop: 20 }}>
          there is no follow button. there is no message box. there is only the fence.
        </p>
      </main>
    </>
  );
}
