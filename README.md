# ROT 🥀

**A digital garden that dies the more you love it.**

Built for a "punk software" hackathon. ROT is anti-design commentary: every app
is engineered to *maximize* your time-on-app. ROT **punishes** it. You draw the
things you love and plant them in a walled garden — but every second you spend
staring at the app, your flowers rot. The only way to keep them alive is to log
off and go live your life. The healthiest gardens belong to the people who are
never here.

## The four dark patterns, inverted

| Dark pattern | Normally | In ROT |
| --- | --- | --- |
| **Planned obsolescence** | products decay so you re-buy | your plants decay; the clock is *your own engagement* |
| **Walled garden** | locks you in | gardens you'd love are visible only **through a fence** — look, don't touch |
| **Intentional incompatibility** | breaks cross-product use | the **Compost Seeds** feed pushes you the *opposite* of your taste, for a fresh perspective |
| **Engagement-max recommendations** | feeds you more of the same | **"people you should meet"** only surfaces users you'd *clash* with |

Plus an **inverted leaderboard** (greenest gardens = people who log in least), a
guilt-trip exit modal where *leaving is the right answer*, and a fake "Premium
Fertilizer" microtransaction that does nothing.

## How the rot works

Rot is computed **on read** — no background jobs. A client heartbeat increments
a per-user `activeSeconds` meter while the tab is focused. Per plant:

```
exposure = activeSeconds - plantedAtActiveSeconds   // focused in-app time since planting
rest     = seconds since you left                   // healing
vitality = clamp(100 - decay*exposure + rest*rest, 0, 100)
```

Two time sources encode the whole satire: **exposure** (in-app time) hurts;
**rest** (time away) heals. Grafted incompatible plants decay at half rate —
novelty is hardier than comfort. `DEMO_MODE=true` cranks decay so a flower
visibly rots to compost in ~60s on stage. Tune in `.env`.

## Stack

Next.js (App Router, TS) · Prisma + SQLite · cookie sessions (scrypt) · zero
external services. Flowers are **hand-drawn on a `<canvas>`** and stored as base64
PNG; the same drawing is then corrupted by CSS decay filters as it rots.

## Run it

```bash
npm install
npm run db:reset   # create + seed the SQLite db
npm run dev        # http://localhost:3000
```

Demo logins for the seeded gardens: any of `vinylvera`, `forestfern`,
`teahouse`, `ghostgardener`, `neonkai`, `hustlebot` — password `password`.
Or register fresh, pick your taste, and draw your first flower.

## Layout

```
src/lib/rot.ts        the decay engine (pure math)
src/lib/incompat.ts   opposites map + (in)compatibility scoring
src/components/        DrawingCanvas, GardenLive, PlantCard, ExitGuard, …
src/app/garden         your plot (draw + plant + watch it rot live)
src/app/seeds          compost seeds (intentional incompatibility)
src/app/meet           anti-recommendations + through-the-fence
src/app/fence/[id]     peek at a compatible garden, view-only
src/app/leaderboard    inverted: least time = greenest
```
