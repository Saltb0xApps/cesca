import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/session";
import { db } from "@/lib/db";
import { Nav } from "@/components/Nav";
import { ensureSuggestions, graftSeed } from "./actions";

export const dynamic = "force-dynamic";

export default async function SeedsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  await ensureSuggestions(user.id, user.tags);
  const seeds = await db.suggestion.findMany({
    where: { userId: user.id, consumed: false },
    orderBy: { createdAt: "desc" },
  });

  return (
    <>
      <Nav username={user.username} />
      <main className="wrap" style={{ paddingTop: 28 }}>
        <h2>compost seeds</h2>
        <p className="muted" style={{ maxWidth: 600 }}>
          the algorithm refuses to show you more of what you like. instead, here are things{" "}
          <span className="warn">intentionally incompatible</span> with your garden — the opposite of
          your taste. graft one in. it'll feel wrong. it'll also rot half as fast, because novelty is
          hardier than comfort.
        </p>

        {seeds.length === 0 ? (
          <p className="faint">no seeds right now. your taste is too agreeable. plant more contradictions.</p>
        ) : (
          <div className="grid" style={{ marginTop: 20 }}>
            {seeds.map((s) => (
              <div className="card" key={s.id}>
                <div style={{ fontSize: 38, textAlign: "center", padding: "18px 0" }}>🥀</div>
                <div className="label">{s.label}</div>
                <div className="stage">intentionally incompatible</div>
                <form action={graftSeed} style={{ marginTop: 10 }}>
                  <input type="hidden" name="id" value={s.id} />
                  <button className="btn" style={{ width: "100%", padding: "6px" }}>
                    graft it
                  </button>
                </form>
              </div>
            ))}
          </div>
        )}
      </main>
    </>
  );
}
