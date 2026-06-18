"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";
import { parseTags, serializeTags } from "@/lib/tags";
import { opposingTags } from "@/lib/incompat";

// Lazily generate "compost seeds": things intentionally INCOMPATIBLE with your
// taste, served so the walled garden of your own preferences cracks open a bit.
export async function ensureSuggestions(userId: string, userTags: string) {
  const existing = await db.suggestion.count({ where: { userId, consumed: false } });
  if (existing > 0) return;

  const opp = opposingTags(parseTags(userTags));
  if (opp.length === 0) return;

  await db.suggestion.createMany({
    data: opp.slice(0, 6).map((t) => ({
      userId,
      label: t,
      tags: t,
      source: "MAP",
    })),
  });
}

// Grafting an incompatible seed creates a hardy GRAFT plant (decays slower).
export async function graftSeed(fd: FormData) {
  const user = await getCurrentUser();
  if (!user) return;
  const id = String(fd.get("id") ?? "");
  const sugg = await db.suggestion.findFirst({ where: { id, userId: user.id, consumed: false } });
  if (!sugg) return;

  await db.plant.create({
    data: {
      userId: user.id,
      label: sugg.label,
      tags: serializeTags(parseTags(sugg.tags)),
      drawing: "",
      kind: "GRAFT",
      plantedAtActiveSeconds: user.activeSeconds,
    },
  });
  await db.suggestion.update({ where: { id: sugg.id }, data: { consumed: true } });

  revalidatePath("/seeds");
  revalidatePath("/garden");
}
