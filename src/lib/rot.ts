// The rot engine. Pure math, computed ON READ from timestamps + the cumulative
// engagement meter. This is where the whole satire lives:
//   exposure (time spent IN the app) hurts; rest (time AWAY) heals.
//
// Rates are resolved from env ON THE SERVER and passed to client components as
// props, so the live-wilting UI and the server agree exactly.

const num = (v: string | undefined, d: number) => (v ? Number(v) : d);

export interface Rates {
  decay: number; // vitality lost per second of active exposure
  rest: number; // vitality regained per second of rest (away)
  graft: number; // multiplier on decay for hardy GRAFT plants
}

/** Resolve rot rates from env. Server-only (reads process.env). */
export function resolveRates(): Rates {
  const demo = process.env.DEMO_MODE === "true";
  const mult = num(process.env.DEMO_DECAY_MULT, 25);
  return {
    decay: num(process.env.ROT_DECAY_RATE, 0.05) * (demo ? mult : 1),
    rest: num(process.env.ROT_REST_RATE, 0.02),
    graft: num(process.env.ROT_GRAFT_FACTOR, 0.5),
  };
}

export type Stage = "thriving" | "healthy" | "wilting" | "rotting" | "compost";

export interface PlantInput {
  kind: string; // "NORMAL" | "GRAFT"
  plantedAtActiveSeconds: number;
}

export interface UserInput {
  activeSeconds: number;
  lastSeenAt: Date | string;
}

export function clamp(n: number, lo = 0, hi = 100): number {
  return Math.max(lo, Math.min(hi, n));
}

/** Seconds of in-app exposure this plant has accumulated since planting. */
export function exposureSeconds(plant: PlantInput, user: UserInput): number {
  return Math.max(0, user.activeSeconds - plant.plantedAtActiveSeconds);
}

/** Real seconds the user has been AWAY since lastSeen (healing time). */
export function restSeconds(user: UserInput, now: Date = new Date()): number {
  return Math.max(0, (now.getTime() - new Date(user.lastSeenAt).getTime()) / 1000);
}

/** Core formula with explicit rates (usable on client and server). */
export function vitalityWith(
  rates: Rates,
  plant: PlantInput,
  user: UserInput,
  now: Date = new Date(),
): number {
  const decay = rates.decay * (plant.kind === "GRAFT" ? rates.graft : 1);
  const exposure = exposureSeconds(plant, user);
  const rest = restSeconds(user, now);
  return clamp(100 - decay * exposure + rates.rest * rest);
}

/** Server convenience: resolve rates from env, then compute. */
export function vitality(plant: PlantInput, user: UserInput, now: Date = new Date()): number {
  return vitalityWith(resolveRates(), plant, user, now);
}

export function stage(v: number): Stage {
  if (v >= 80) return "thriving";
  if (v >= 55) return "healthy";
  if (v >= 30) return "wilting";
  if (v > 5) return "rotting";
  return "compost";
}

/** 0..1 glitch intensity for the UI — the inverse of vitality. */
export function glitchIntensity(v: number): number {
  return clamp(1 - v / 100, 0, 1);
}

export const STAGE_LABEL: Record<Stage, string> = {
  thriving: "THRIVING",
  healthy: "HEALTHY",
  wilting: "WILTING",
  rotting: "ROTTING",
  compost: "COMPOST",
};

export const STAGE_COLOR: Record<Stage, string> = {
  thriving: "#4dff7c",
  healthy: "#7ddf6b",
  wilting: "#ffd24d",
  rotting: "#b06b2e",
  compost: "#6b6b6b",
};
