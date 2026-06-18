"use server";

import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { hashPassword, verifyPassword } from "@/lib/auth";
import { createSession } from "@/lib/session";
import { serializeTags } from "@/lib/tags";

export type AuthState = { error?: string };

export async function register(_prev: AuthState, fd: FormData): Promise<AuthState> {
  const username = String(fd.get("username") ?? "").trim().toLowerCase();
  const password = String(fd.get("password") ?? "");
  const tags = serializeTags(fd.getAll("tags").map(String));

  if (!/^[a-z0-9_]{2,20}$/.test(username)) {
    return { error: "username: 2–20 chars, a–z 0–9 _ only." };
  }
  if (password.length < 4) return { error: "password must be at least 4 characters." };
  if (!tags) return { error: "pick at least one thing you like — it shapes your garden." };

  const exists = await db.user.findUnique({ where: { username } });
  if (exists) return { error: "that name is already rotting somewhere. pick another." };

  const user = await db.user.create({
    data: { username, passwordHash: hashPassword(password), tags },
  });
  await createSession(user.id);
  redirect("/garden");
}

export async function login(_prev: AuthState, fd: FormData): Promise<AuthState> {
  const username = String(fd.get("username") ?? "").trim().toLowerCase();
  const password = String(fd.get("password") ?? "");

  const user = await db.user.findUnique({ where: { username } });
  if (!user || !verifyPassword(password, user.passwordHash)) {
    return { error: "wrong name or password." };
  }
  await createSession(user.id);
  redirect("/garden");
}
