import type { Account } from "./accounts";
import {
  fetchUpcomingRows,
  markHeadsUpSent,
} from "./notion/queries";
import { formatHeadsUp, sendTelegramMessage } from "./notify/telegram";

const HEADS_UP_WINDOW_MINUTES = 15;

export async function runHeadsUp(account: Account) {
  const upcoming = await fetchUpcomingRows(
    account.notionDatabaseId,
    HEADS_UP_WINDOW_MINUTES,
  );

  for (const row of upcoming) {
    try {
      await sendTelegramMessage(
        formatHeadsUp(account.name, row.name, row.minutesAway),
      );
      await markHeadsUpSent(row.pageId);
    } catch (e) {
      console.error(`heads-up failed for ${row.pageId}:`, e);
    }
  }

  return { account: account.name, notified: upcoming.length };
}
