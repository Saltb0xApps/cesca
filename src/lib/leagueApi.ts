import { supabase } from '@/lib/supabase';
import type { Cohort, Member } from '@/lib/demoLeague';
import { TIER_NAMES, tierIndexFor } from '@/lib/tiers';

const TEAM_GOAL = 300;

function startOfWeek(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  const mondayIndex = (x.getDay() + 6) % 7;
  x.setDate(x.getDate() - mondayIndex);
  return x;
}

/** Fetch the caller's real current-week standings from Supabase. */
export async function fetchStandings(totalPomos: number): Promise<Cohort> {
  const { data, error } = await supabase.rpc('league_standings');
  if (error) throw error;

  const members: Member[] = (data ?? []).map((r) => ({
    id: r.user_id,
    name: r.is_you ? 'You' : r.display_name,
    avatar: r.avatar ?? '🍅',
    pomos: r.pomos,
    isYou: r.is_you,
  }));

  const weekStart = startOfWeek(new Date());
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekEnd.getDate() + 6);

  const yourRank = members.findIndex((m) => m.isYou) + 1;
  const teamTotal = members.reduce((sum, m) => sum + m.pomos, 0);
  const tIdx = tierIndexFor(totalPomos);

  return {
    tierName: TIER_NAMES[tIdx]!,
    tierIndex: tIdx,
    weekStart,
    weekEnd,
    members,
    yourRank: yourRank === 0 ? members.length : yourRank,
    teamTotal,
    teamGoal: TEAM_GOAL,
    promoteCount: 5,
    relegateCount: 5,
  };
}
