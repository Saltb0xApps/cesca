import { PrismaClient } from "@prisma/client";
import { randomBytes, scryptSync } from "node:crypto";

const db = new PrismaClient();

function hashPassword(pw: string): string {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(pw, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

// A tiny hand-drawn-looking flower as an inline SVG data URL, so seeded gardens
// aren't empty in the fence/preview shots.
function flower(petal: string, center: string): string {
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='120' height='120'>
    <rect width='120' height='120' fill='#0d130d'/>
    <rect x='58' y='60' width='4' height='45' fill='#2a8c45'/>
    ${[0, 60, 120, 180, 240, 300]
      .map((a) => `<ellipse cx='60' cy='40' rx='9' ry='20' fill='${petal}' transform='rotate(${a} 60 55)'/>`)
      .join("")}
    <circle cx='60' cy='55' r='10' fill='${center}'/>
  </svg>`;
  return "data:image/svg+xml," + encodeURIComponent(svg.replace(/\n\s*/g, ""));
}

const USERS = [
  {
    username: "vinylvera",
    tags: "punk,vinyl,analog,slow,books",
    activeSeconds: 45,
    plants: [
      { label: "my dad's turntable", d: flower("#ff6b9d", "#ffd24d") },
      { label: "saturday morning silence", d: flower("#4dff7c", "#ffd24d") },
    ],
  },
  {
    username: "forestfern",
    tags: "forest,nature,slow,handmade,warm",
    activeSeconds: 12,
    plants: [
      { label: "moss after rain", d: flower("#4dff7c", "#b06b2e") },
      { label: "a hand-thrown mug", d: flower("#ffd24d", "#b06b2e") },
      { label: "woodsmoke", d: flower("#ff6b9d", "#4dff7c") },
    ],
  },
  {
    username: "teahouse",
    tags: "tea,solitude,books,warm,handmade",
    activeSeconds: 90,
    plants: [
      { label: "first sip, too hot", d: flower("#ffd24d", "#ff6b9d") },
      { label: "rereading the same page", d: flower("#6bb8ff", "#ffd24d") },
    ],
  },
  {
    username: "ghostgardener",
    tags: "minimal,cold,solitude",
    activeSeconds: 3,
    plants: [{ label: "an empty room", d: flower("#ffffff", "#6bb8ff") }],
  },
  {
    username: "neonkai",
    tags: "edm,digital,fast,streaming,crowds",
    activeSeconds: 2400,
    plants: [
      { label: "4am bass drop", d: flower("#6bb8ff", "#ff6b9d") },
      { label: "infinite scroll", d: flower("#ff6b9d", "#6bb8ff") },
    ],
  },
  {
    username: "hustlebot",
    tags: "hustle,fast,city,coffee,maximal",
    activeSeconds: 5400,
    plants: [
      { label: "the 5am grind", d: flower("#ffd24d", "#b06b2e") },
      { label: "one more notification", d: flower("#ff6b9d", "#ffd24d") },
    ],
  },
];

async function main() {
  for (const u of USERS) {
    await db.user.deleteMany({ where: { username: u.username } });
    const user = await db.user.create({
      data: {
        username: u.username,
        passwordHash: hashPassword("password"),
        tags: u.tags,
        activeSeconds: u.activeSeconds,
      },
    });
    for (const p of u.plants) {
      await db.plant.create({
        data: {
          userId: user.id,
          label: p.label,
          drawing: p.d,
          tags: u.tags,
          kind: "NORMAL",
          plantedAtActiveSeconds: 0,
        },
      });
    }
    console.log(`seeded @${u.username} (${u.plants.length} plants, ${u.activeSeconds}s)`);
  }
  console.log("\ndemo login for any seeded user: password = 'password'");
}

main()
  .then(() => db.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await db.$disconnect();
    process.exit(1);
  });
