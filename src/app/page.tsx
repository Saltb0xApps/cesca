import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/session";
import { Nav } from "@/components/Nav";

export default async function Home() {
  const user = await getCurrentUser();
  if (user) redirect("/garden");

  return (
    <>
      <Nav />
      <main className="wrap" style={{ paddingTop: 60 }}>
        <h1 style={{ fontSize: 46, letterSpacing: "0.15em", marginBottom: 4 }} className="cursor">
          ROT
        </h1>
        <p className="muted" style={{ fontSize: 18, marginTop: 0 }}>
          a digital garden that dies the more you love it.
        </p>

        <div style={{ maxWidth: 560, marginTop: 28, lineHeight: 1.7 }}>
          <p>
            every app you use is built to keep you scrolling. this one is built to make you{" "}
            <span className="warn">leave</span>.
          </p>
          <p className="muted">
            draw the things you love. plant them in your walled garden. but every second you spend
            staring at the app, your flowers <span className="warn">rot</span>. the only way to keep
            them alive is to log off and go live your life.
          </p>
          <p className="faint">
            the healthiest gardens belong to the people who are never here.
          </p>
        </div>

        <div style={{ display: "flex", gap: 12, marginTop: 32 }}>
          <Link href="/register" className="btn">
            plant a garden →
          </Link>
          <Link href="/login" className="btn ghost">
            i already have one
          </Link>
        </div>
      </main>
    </>
  );
}
