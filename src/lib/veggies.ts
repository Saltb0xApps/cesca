import type { VegType } from '@/components/VegIcon';

// The collection: you start with the tomato (the pomodoro itself) and unlock a
// new vegetable as your all-time pomo count grows.

export interface Veg {
  type: VegType;
  name: string;
  unlockAt: number; // all-time pomos required
}

export const VEGGIES: Veg[] = [
  { type: 'tomato', name: 'Tomato', unlockAt: 0 },
  { type: 'carrot', name: 'Carrot', unlockAt: 10 },
  { type: 'strawberry', name: 'Strawberry', unlockAt: 25 },
  { type: 'pepper', name: 'Pepper', unlockAt: 50 },
  { type: 'corn', name: 'Corn', unlockAt: 80 },
  { type: 'eggplant', name: 'Eggplant', unlockAt: 120 },
  { type: 'broccoli', name: 'Broccoli', unlockAt: 180 },
  { type: 'mushroom', name: 'Mushroom', unlockAt: 260 },
];

export function isUnlocked(veg: Veg, totalPomos: number): boolean {
  return totalPomos >= veg.unlockAt;
}

export function unlockedCount(totalPomos: number): number {
  return VEGGIES.filter((v) => isUnlocked(v, totalPomos)).length;
}

/** The next vegetable to unlock, and how many pomos remain — or null at the end. */
export function nextVeg(totalPomos: number): { veg: Veg; remaining: number } | null {
  const next = VEGGIES.find((v) => totalPomos < v.unlockAt);
  if (!next) return null;
  return { veg: next, remaining: next.unlockAt - totalPomos };
}
