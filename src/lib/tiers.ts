// Personal progression tiers (a solo "level", not a competitive rank) based on
// lifetime pomos. Bronze → Tomato.

export const TIER_NAMES = ['Bronze', 'Silver', 'Gold', 'Diamond', 'Tomato'] as const;

const TIER_THRESHOLDS = [0, 30, 80, 160, 300];

export function tierIndexFor(totalPomos: number): number {
  let idx = 0;
  for (let i = 0; i < TIER_THRESHOLDS.length; i += 1) {
    if (totalPomos >= TIER_THRESHOLDS[i]!) idx = i;
  }
  return idx;
}

/** Pomos still needed to reach the next tier, or null if already at the top. */
export function pomosToNextTier(totalPomos: number): { tier: string; remaining: number } | null {
  const idx = tierIndexFor(totalPomos);
  if (idx >= TIER_NAMES.length - 1) return null;
  return {
    tier: TIER_NAMES[idx + 1]!,
    remaining: TIER_THRESHOLDS[idx + 1]! - totalPomos,
  };
}
