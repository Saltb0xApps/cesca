import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/session";
import { db } from "@/lib/db";
import { Nav } from "@/components/Nav";
import { parseTags } from "@/lib/tags";
import { compatScore, incompatScore } from "@/lib/incompat";

export const dynamic = "force-dynamic";

export default async function MeetPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const me = parseTags(user.tags);

  const others = await db.user.findMany({
    where: { id: { not: user.id } },
    select: { id: true, username: true, tags: true, plants: { select: { drawing: true }, take: 4 } },
  });

  const incompatible = [...others]
    .map((u) => ({ u, score: incompatScore(me, parseTags(u.tags)) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 6);

  const compatible = [...others]
    .map((u) => ({ u, score: compatScore(me, parseTags(u.tags)) }))
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 4);

  return (
    <>
      <Nav username={user.username} />
      <main className="wrap" style={{ paddingTop: 28 }}>
        <h2>people you should meet</h2>
        <p className="muted" style={{ maxWidth: 620 }}>
          our recommendation engine only suggests people you'd <span className="warn">clash</span>{" "}
          with. no echo chamber. no comfort. the worse the fit, the higher they rank.
        </p>

        {incompatible.length === 0 ? (
          <p className="faint">nobody else here yet. it's lonely being right.</p>
        ) : (
          <div className="grid" style={{ marginTop: 18 }}>
            {incompatible.map(({ u }) => (
              <div className="card" key={u.id}>
                <div style={{ fontSize: 30, textAlign: "center", padding: "10px 0" }}>🤝</div>
                <div className="label">@{u.username}</div>
                <div className="stage">clashes on: {parseTags(u.tags).slice(0, 4).join(", ") || "everything"}</div>
                <p className="faint" style={{ fontSize: 12, marginTop: 8 }}>
                  the algorithm insists you'd hate each other. say hi.
                </p>
              </div>
            ))}
          </div>
        )}

        <h2 style={{ marginTop: 48 }}>through the fence</h2>
        <p className="muted" style={{ maxWidth: 620 }}>
          these gardeners share your taste — you'd probably love them. so naturally, you can only{" "}
          <span className="warn">peek through the fence</span>. no messaging. no following. look, but
          do not touch.
        </p>

        {compatible.length === 0 ? (
          <p className="faint">no kindred gardens found. the wall holds.</p>
        ) : (
          <div className="grid" style={{ marginTop: 18 }}>
            {compatible.map(({ u }) => (
              <Link key={u.id} href={`/fence/${u.id}`} className="card fence" style={{ borderBottom: "1px solid var(--line)", display: "block" }}>
                <div className="caged" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 4 }}>
                  {(u.plants.length ? u.plants : [{ drawing: "" }, { drawing: "" }]).slice(0, 4).map((p, i) =>
                    p.drawing ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img key={i} src={p.drawing} alt="" style={{ width: "100%", aspectRatio: "1/1", objectFit: "cover" }} />
                    ) : (
                      <div key={i} style={{ aspectRatio: "1/1", background: "var(--bg)" }} />
                    ),
                  )}
                </div>
                <div className="label" style={{ position: "relative", zIndex: 2 }}>@{u.username}</div>
                <div className="stage" style={{ position: "relative", zIndex: 2 }}>peek →</div>
              </Link>
            ))}
          </div>
        )}
      </main>
    </>
  );
}
