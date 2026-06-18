"use client";

import { useActionState } from "react";
import Link from "next/link";
import { login, type AuthState } from "../actions";

export default function LoginPage() {
  const [state, action, pending] = useActionState<AuthState, FormData>(login, {});

  return (
    <main className="wrap" style={{ maxWidth: 420, paddingTop: 48 }}>
      <Link href="/" className="brand" style={{ borderBottom: "none", fontSize: 22, letterSpacing: "0.2em" }}>
        ROT
      </Link>
      <h2 style={{ marginBottom: 4 }}>return to your garden</h2>
      <p className="muted" style={{ marginTop: 0 }}>against your own best interest.</p>

      <form action={action}>
        <label htmlFor="username">Username</label>
        <input id="username" name="username" className="field" autoComplete="username" required />

        <label htmlFor="password">Password</label>
        <input id="password" name="password" type="password" className="field" autoComplete="current-password" required />

        {state.error && <p className="err">{state.error}</p>}
        <button className="btn" type="submit" disabled={pending}>
          {pending ? "…" : "log in"}
        </button>
      </form>

      <p className="faint" style={{ marginTop: 22 }}>
        no garden yet? <Link href="/register">plant one</Link>
      </p>
    </main>
  );
}
