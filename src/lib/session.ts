import { cookies } from "next/headers";
import { db } from "./db";

const COOKIE = "rot_session";
const TTL_DAYS = 30;

export async function createSession(userId: string) {
  const expiresAt = new Date(Date.now() + TTL_DAYS * 864e5);
  const s = await db.session.create({ data: { userId, expiresAt } });
  const jar = await cookies();
  jar.set(COOKIE, s.id, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    expires: expiresAt,
  });
}

export async function getCurrentUser() {
  const jar = await cookies();
  const token = jar.get(COOKIE)?.value;
  if (!token) return null;
  const s = await db.session.findUnique({ where: { id: token }, include: { user: true } });
  if (!s || s.expiresAt < new Date()) return null;
  return s.user;
}

export async function destroySession() {
  const jar = await cookies();
  const token = jar.get(COOKIE)?.value;
  if (token) await db.session.delete({ where: { id: token } }).catch(() => {});
  jar.delete(COOKIE);
}
