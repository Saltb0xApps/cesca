// league-rollover — weekly scoring + promotion/relegation + re-cohort (Phase 3).
//
// Runs on a cron at Sunday 23:59 in each cohort's anchor timezone. For every
// finished league: rank members by pomos, write league_results, promote the
// top 5 / relegate the bottom 5, then form next week's cohorts (~20 per tier).
// Also schedules the next week's single synced "Power Hour" event (Phase 4).
//
// Deploy: npx supabase functions deploy league-rollover
// Schedule: configure a Supabase cron / scheduled trigger to hit this hourly;
//           the function decides which anchor timezones just crossed Sun 23:59.
//
// This is a stub — the rollover body is a TODO for Phase 3.

import { createClient } from 'jsr:@supabase/supabase-js@2';

const PROMOTE = 5;
const RELEGATE = 5;

Deno.serve(async () => {
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    // Service role: this function owns all scoring/league mutations.
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );

  // TODO(Phase 3):
  //   1. Find leagues whose week just ended in their anchor_tz.
  //   2. Rank league_members by pomos desc.
  //   3. Insert league_results rows with final_rank + movement.
  //   4. Promote top PROMOTE to tier+1, relegate bottom RELEGATE to tier-1.
  //   5. Re-cohort everyone into next week's leagues (<=20 per league per tier).
  //   6. Schedule one synced_event per new league (Phase 4).
  void supabase;
  void PROMOTE;
  void RELEGATE;

  return new Response(JSON.stringify({ ok: true, note: 'stub — implement in Phase 3' }), {
    headers: { 'Content-Type': 'application/json' },
  });
});
