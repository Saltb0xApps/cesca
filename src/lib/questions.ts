/**
 * Nightly question rotation. Pure — safe to unit test.
 *
 * Every local calendar day maps to one question from the list, cycling in
 * order. The mapping is stable: asking twice on the same day always returns
 * the same question, and consecutive days advance by one.
 */

export const FALLBACK_QUESTION = 'What happened today?';

/** Days since Unix epoch in *local* calendar terms (DST-safe). */
export function localDayIndex(date: Date): number {
  return Math.floor(
    Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) / 86_400_000,
  );
}

export function questionForDate(date: Date, questions: string[]): string {
  const usable = questions.map((q) => q.trim()).filter((q) => q.length > 0);
  if (usable.length === 0) return FALLBACK_QUESTION;
  const idx = localDayIndex(date) % usable.length;
  return usable[idx];
}
