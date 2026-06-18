import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/session";
import { db } from "@/lib/db";
import { Nav } from "@/components/Nav";

export const dynamic = "force-dynamic";

export default async function LeaderboardPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const users = await db.user.findMany({
    orderBy: { activeSeconds: "asc" },
    select: { id: true, username: true, activeSeconds: true, _count: { select: { plants: true } } },
    take: 50,
  });

  return (
    <>
      <Nav username={user.username} />
      <main className="wrap" style={{ paddingTop: 28 }}>
        <h2>greenest gardens</h2>
        <p className="muted" style={{ maxWidth: 600 }}>
          ranked by who wastes the <span className="warn">least</span> time here. the people at the
          top barely log in — that's why their gardens are alive. you climb this board by leaving.
        </p>

        <table style={{ width: "100%", borderCollapse: "collapse", marginTop: 18, fontSize: 14 }}>
          <thead>
            <tr style={{ textAlign: "left", color: "var(--fg-dim)", textTransform: "uppercase", fontSize: 11 }}>
              <th style={{ padding: "8px 6px" }}>#</th>
              <th style={{ padding: "8px 6px" }}>gardener</th>
              <th style={{ padding: "8px 6px" }}>plants</th>
              <th style={{ padding: "8px 6px" }}>time wasted</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u, i) => {
              const mine = u.id === user.id;
              const m = Math.floor(u.activeSeconds / 60);
              const s = u.activeSeconds % 60;
              return (
                <tr
                  key={u.id}
                  style={{ borderTop: "1px solid var(--line)", color: mine ? "var(--warn)" : undefined }}
                >
                  <td style={{ padding: "8px 6px" }}>{i + 1}</td>
                  <td style={{ padding: "8px 6px" }}>
                    @{u.username} {mine && <span className="faint">(you)</span>}
                  </td>
                  <td style={{ padding: "8px 6px" }}>{u._count.plants}</td>
                  <td style={{ padding: "8px 6px" }}>
                    {m}m {String(s).padStart(2, "0")}s
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </main>
    </>
  );
}
