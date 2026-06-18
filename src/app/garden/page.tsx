import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/session";
import { db } from "@/lib/db";
import { resolveRates } from "@/lib/rot";
import { Nav } from "@/components/Nav";
import { GardenLive } from "@/components/GardenLive";
import { PlantForm } from "@/components/PlantForm";
import { PremiumButton } from "@/components/PremiumButton";
import { ExitGuard } from "@/components/ExitGuard";

export const dynamic = "force-dynamic";

export default async function GardenPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const plants = await db.plant.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
  });

  const rates = resolveRates();

  return (
    <>
      <Nav username={user.username} />
      <GardenLive
        rates={rates}
        initialActiveSeconds={user.activeSeconds}
        plants={plants.map((p) => ({
          id: p.id,
          label: p.label,
          drawing: p.drawing,
          kind: p.kind,
          plantedAtActiveSeconds: p.plantedAtActiveSeconds,
        }))}
      />
      <div className="wrap" style={{ paddingTop: 0 }}>
        <PlantForm />
        <PremiumButton />
      </div>
      <ExitGuard />
    </>
  );
}
