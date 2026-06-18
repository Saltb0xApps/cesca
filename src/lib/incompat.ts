import { parseTags } from "./tags";

// Curated opposites. The whole "intentional incompatibility" satire runs on
// this map: it must work fully offline (no network call on stage). A Claude API
// generator is an optional env-gated stretch, never a demo dependency.
export const OPPOSITES: Record<string, string[]> = {
  jazz: ["edm", "noise"],
  edm: ["jazz", "ambient"],
  vinyl: ["streaming", "spotify"],
  streaming: ["vinyl", "analog"],
  slow: ["fast", "hustle"],
  fast: ["slow", "stillness"],
  analog: ["digital"],
  digital: ["analog"],
  minimal: ["maximal", "clutter"],
  maximal: ["minimal"],
  cats: ["dogs"],
  dogs: ["cats"],
  coffee: ["tea"],
  tea: ["coffee"],
  city: ["forest", "nature"],
  forest: ["city", "concrete"],
  vintage: ["futurist", "modern"],
  punk: ["smoothjazz", "corporate"],
  smoothjazz: ["punk"],
  books: ["tiktok"],
  tiktok: ["books"],
  solitude: ["crowds"],
  crowds: ["solitude"],
  handmade: ["massproduced"],
  warm: ["cold"],
  cold: ["warm"],
};

// A flat canonical tag list for the register form, so opposites actually match.
export const CANONICAL_TAGS = Object.keys(OPPOSITES);

/** Jaccard overlap of two tag sets -> 0..1 similarity. */
export function similarity(a: string[], b: string[]): number {
  if (!a.length || !b.length) return 0;
  const sa = new Set(a);
  const sb = new Set(b);
  let inter = 0;
  for (const t of sa) if (sb.has(t)) inter++;
  const union = new Set([...a, ...b]).size;
  return union ? inter / union : 0;
}

/** Count of explicit opposite pairs between two tag sets. */
export function oppositionScore(a: string[], b: string[]): number {
  const sb = new Set(b);
  let opp = 0;
  for (const t of a) for (const o of OPPOSITES[t] ?? []) if (sb.has(o)) opp++;
  return opp;
}

/** Higher = more INCOMPATIBLE. Ranks /meet (anti-recommendations). */
export function incompatScore(a: string[], b: string[]): number {
  return oppositionScore(a, b) * 2 + (1 - similarity(a, b));
}

/** Higher = more COMPATIBLE. Ranks /fence (the gardens you can only peek at). */
export function compatScore(a: string[], b: string[]): number {
  return similarity(a, b) - oppositionScore(a, b);
}

/** Opposite tags to seed Compost Seeds for a user. */
export function opposingTags(tags: string[]): string[] {
  const out = new Set<string>();
  for (const t of tags) for (const o of OPPOSITES[t] ?? []) out.add(o);
  return [...out];
}

/** Rank other users for one viewer by (in)compatibility. */
export function rankUsers<T extends { tags: string }>(
  me: string[],
  users: T[],
  mode: "incompat" | "compat",
): T[] {
  const score = (u: T) =>
    mode === "incompat"
      ? incompatScore(me, parseTags(u.tags))
      : compatScore(me, parseTags(u.tags));
  return [...users].sort((x, y) => score(y) - score(x));
}
