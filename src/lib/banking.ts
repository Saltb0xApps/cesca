import { isSupabaseConfigured, supabase } from '@/lib/supabase';
import { queryClient } from '@/lib/queryClient';
import { useLedgerStore } from '@/stores/ledgerStore';

/**
 * Bank one completed pomo.
 *
 * Always writes to the local ledger (powers personal stats / heatmap / garden,
 * and keeps demo mode working). When Supabase is configured and the user is
 * signed in, it also records the pomo server-side via the `bank_pomo` RPC,
 * which updates the real league standings, then refreshes the league query.
 */
export async function bankPomo(chainIndex: number, task?: string): Promise<void> {
  await useLedgerStore.getState().bankLocal(chainIndex, task);

  if (!isSupabaseConfigured) return;
  const { data } = await supabase.auth.getSession();
  if (!data.session) return;

  try {
    const { error } = await supabase.rpc('bank_pomo', {
      p_task: task ?? null,
      p_chain_index: chainIndex,
    });
    if (error) throw error;
    void queryClient.invalidateQueries({ queryKey: ['standings'] });
  } catch (e) {
    // Local ledger already captured the pomo; surface for debugging but don't
    // block the user's session on a network/server hiccup.
    console.warn('[bank_pomo] failed', e);
  }
}
