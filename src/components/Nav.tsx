import Link from "next/link";

export function Nav({ username }: { username?: string }) {
  return (
    <nav className="nav wrap" style={{ marginBottom: 0 }}>
      <Link href={username ? "/garden" : "/"} className="brand" style={{ borderBottom: "none" }}>
        ROT
      </Link>
      {username ? (
        <>
          <Link href="/garden">garden</Link>
          <Link href="/seeds">seeds</Link>
          <Link href="/meet">meet</Link>
          <Link href="/leaderboard">leaderboard</Link>
          <span className="spacer" />
          <span className="faint">@{username}</span>
          <form action="/api/logout" method="post" style={{ display: "inline" }}>
            <button className="btn ghost" style={{ padding: "4px 10px" }}>
              leave
            </button>
          </form>
        </>
      ) : (
        <>
          <span className="spacer" />
          <Link href="/login">login</Link>
          <Link href="/register">register</Link>
        </>
      )}
    </nav>
  );
}
