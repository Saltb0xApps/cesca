"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";
import { serializeTags } from "@/lib/tags";

export async function plantThing(fd: FormData) {
  const user = await getCurrentUser();
  if (!user) return;

  const label = String(fd.get("label") ?? "").trim().slice(0, 60);
  if (!label) return;
  const tags = serializeTags(String(fd.get("tags") ?? "").split(","));
  const drawing = String(fd.get("drawing") ?? "").startsWith("data:image")
    ? String(fd.get("drawing"))
    : "";

  await db.plant.create({
    data: {
      userId: user.id,
      label,
      tags,
      drawing,
      kind: "NORMAL",
      // snapshot the meter so exposure only counts time AFTER planting
      plantedAtActiveSeconds: user.activeSeconds,
    },
  });

  revalidatePath("/garden");
}

export async function removePlant(fd: FormData) {
  const user = await getCurrentUser();
  if (!user) return;
  const id = String(fd.get("id") ?? "");
  await db.plant.deleteMany({ where: { id, userId: user.id } });
  revalidatePath("/garden");
}
