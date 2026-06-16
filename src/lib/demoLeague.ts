import type { Pomo } from '@/stores/ledgerStore';
import { TIER_NAMES, tierIndexFor } from '@/lib/tiers';

// Offline "demo" league so the competitive board is playable without a backend.
// A stable cohort is generated per week (seeded by week-start); rivals accrue
// pomos through the week; the player's live weekly count slots in. The real
// version replaces this with Supabase Realtime standings — same shapes.

export interface Member {
  id: string;
  name: string;
  avatar: string;
  pomos: number;
  isYou: boolean;
}

export interface Cohort {
  tierName: string;
  tierIndex: number;
  weekStart: Date;
  weekEnd: Date;
  members: Member[]; // ranked desc
  yourRank: number;
  teamTotal: number;
  teamGoal: number;
  promoteCount: number;
  relegateCount: number;
}

const NAMES = [
  'Maya', 'Leo', 'Aria', 'Kai', 'Nora', 'Eli', 'Zoe', 'Omar', 'Ivy', 'Finn',
  'Luna', 'Jude', 'Mira', 'Theo', 'Sana', 'Cole', 'Remy', 'Nina', 'Asha', 'Dev',
  'Yuki', 'Bea', 'Hugo', 'Lena', 'Rey', 'Tariq', 'Esme', 'Niko', 'Priya', 'Wren',
];
const AVATARS = ['🦉', '🔥', '📚', '🧠', '⚡️', '🌙', '☕️', '🎯', '🐢', '🦊', '🌵', '🍀'];

const COHORT_SIZE = 20;
const TEAM_GOAL = 300;

function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function hashString(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i += 1) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function startOfWeek(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  const mondayIndex = (x.getDay() + 6) % 7;
  x.setDate(x.getDate() - mondayIndex);
  return x;
}

function dayKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(
    d.getDate(),
  ).padStart(2, '0')}`;
}

function weeklyPomos(pomos: Pomo[], weekStartMs: number): number {
  return pomos.filter((p) => new Date(p.completedAt).getTime() >= weekStartMs).length;
}

export function buildCohort(
  pomos: Pomo[],
  totalPomos: number,
  youName = 'You',
  youAvatar = '🍅',
  now = new Date(),
): Cohort {
  const weekStart = startOfWeek(now);
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekEnd.getDate() + 6);

  const rand = mulberry32(hashString(dayKey(weekStart)));
  const hoursIntoWeek = Math.max(0, Math.min(168, (now.getTime() - weekStart.getTime()) / 3_600_000));

  const pool = [...NAMES];
  for (let i = pool.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rand() * (i + 1));
    [pool[i], pool[j]] = [pool[j]!, pool[i]!];
  }

  const members: Member[] = [];
  for (let i = 0; i < COHORT_SIZE - 1; i += 1) {
    const base = Math.floor(rand() * 3);
    const ratePerHour = 0.03 + rand() * 0.24;
    const pomoCount = Math.min(60, base + Math.floor(ratePerHour * hoursIntoWeek));
    members.push({
      id: `bot-${i}`,
      name: pool[i] ?? `Rival ${i}`,
      avatar: AVATARS[Math.floor(rand() * AVATARS.length)] ?? '🦉',
      pomos: pomoCount,
      isYou: false,
    });
  }

  members.push({
    id: 'you',
    name: youName,
    avatar: youAvatar,
    pomos: weeklyPomos(pomos, weekStart.getTime()),
    isYou: true,
  });

  members.sort((a, b) => b.pomos - a.pomos || (a.isYou ? -1 : 1));

  const yourRank = members.findIndex((m) => m.isYou) + 1;
  const teamTotal = members.reduce((sum, m) => sum + m.pomos, 0);
  const tIdx = tierIndexFor(totalPomos);

  return {
    tierName: TIER_NAMES[tIdx]!,
    tierIndex: tIdx,
    weekStart,
    weekEnd,
    members,
    yourRank,
    teamTotal,
    teamGoal: TEAM_GOAL,
    promoteCount: 5,
    relegateCount: 5,
  };
}
