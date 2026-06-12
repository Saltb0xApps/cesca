// complete-round — server-validated round completion (Phase 1).
//
// Validates that >= 24:45 of real time elapsed since the server-stamped
// started_at and that the round was not already failed, then banks the pomo:
// flips status to 'completed', applies the daily league cap (16), updates the
// streak (+ freeze logic), and (Phase 3) increments league_members.pomos.
//
// Deploy: npx supabase functions deploy complete-round
//
// This is a stub wired for Phase 1 — the validation/scoring body is a TODO.

import { createClient } from 'jsr:@supabase/supabase-js@2';

const TOLERANCE_SECONDS = 15;
const ROUND_SECONDS = 25 * 60;

Deno.serve(async (req) => {
  try {
    const authHeader = req.headers.get('Authorization') ?? '';
    const { roundId } = await req.json();
    if (!roundId) {
      return json({ error: 'roundId required' }, 400);
    }

    // Acts as the calling user (RLS-scoped) for reads.
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } },
    );

    const { data: round, error } = await supabase
      .from('rounds')
      .select('*')
      .eq('id', roundId)
      .single();

    if (error || !round) return json({ error: 'round not found' }, 404);
    if (round.status === 'failed') return json({ error: 'round already failed' }, 409);

    const startedAt = new Date(round.started_at).getTime();
    const elapsed = (Date.now() - startedAt) / 1000;
    if (elapsed < ROUND_SECONDS - TOLERANCE_SECONDS) {
      return json({ error: 'round not long enough', elapsed }, 422);
    }

    // TODO(Phase 1): use a service-role client to:
    //   - set status='completed', completed_at=now()
    //   - apply daily cap (16) -> counts_for_league
    //   - update profiles streak/freezes
    //   - (Phase 3) increment league_members.pomos when counts_for_league
    return json({ ok: true, banked: true });
  } catch (e) {
    return json({ error: String(e) }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}
