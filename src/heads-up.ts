import {
  fetchUpcomingRows,
  markHeadsUpSent,
} from "./notion/queries";
import { formatHeadsUp, sendTelegramMessage } from "./notify/telegram";

const HEADS_UP_WINDOW_MINUTES = 15;

export async function runHeadsUp(databaseId: string) {
  const upcoming = await fetchUpcomingRows(databaseId, HEADS_UP_WINDOW_MINUTES);

  for (const row of upcoming) {
    try {
      await sendTelegramMessage(formatHeadsUp(row.name, row.minutesAway));
      await markHeadsUpSent(row.pageId);
    } catch (e) {
      console.error(`heads-up failed for ${row.pageId}:`, e);
    }
  }

  return { notified: upcoming.length };
}
