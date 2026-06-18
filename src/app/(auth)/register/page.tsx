"use client";

import { useActionState } from "react";
import Link from "next/link";
import { register, type AuthState } from "../actions";
import { CANONICAL_TAGS } from "@/lib/incompat";

export default function RegisterPage() {
  const [state, action, pending] = useActionState<AuthState, FormData>(register, {});

  return (
    <main className="wrap" style={{ maxWidth: 460, paddingTop: 48 }}>
      <Link href="/" className="brand" style={{ borderBottom: "none", fontSize: 22, letterSpacing: "0.2em" }}>
        ROT
      </Link>
      <h2 style={{ marginBottom: 4 }}>plant a garden</h2>
      <p className="muted" style={{ marginTop: 0 }}>pick what you love. we'll use it against you.</p>

      <form action={action}>
        <label htmlFor="username">Username</label>
        <input id="username" name="username" className="field" autoComplete="username" required />

        <label htmlFor="password">Password</label>
        <input id="password" name="password" type="password" className="field" autoComplete="new-password" required />

        <label>Your taste (this seeds your garden — and your incompatibilities)</label>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, margin: "8px 0 18px" }}>
          {CANONICAL_TAGS.map((t) => (
            <label
              key={t}
              style={{ border: "1px solid var(--line)", padding: "4px 10px", cursor: "pointer", fontSize: 13 }}
            >
              <input type="checkbox" name="tags" value={t} style={{ marginRight: 6 }} />
              {t}
            </label>
          ))}
        </div>

        {state.error && <p className="err">{state.error}</p>}
        <button className="btn" type="submit" disabled={pending}>
          {pending ? "germinating…" : "plant it →"}
        </button>
      </form>

      <p className="faint" style={{ marginTop: 22 }}>
        already rotting? <Link href="/login">log in</Link>
      </p>
    </main>
  );
}
