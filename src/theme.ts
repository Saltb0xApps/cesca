// Minimal shared theme. Brand the tomato/round metaphor (Part 1 naming note).
export const colors = {
  tomato: '#E63A2E',
  tomatoDark: '#B71C1C',
  ink: '#1C1A22',
  subtle: '#6B6776',
  bg: '#FAF7F4',
  card: '#FFFFFF',
  line: '#ECE7E1',
  good: '#2E9E5B',
  gold: '#E0B11A',
};

export const tiers = ['Bronze', 'Silver', 'Gold', 'Diamond', 'Tomato'] as const;
export type Tier = (typeof tiers)[number];
