import { FALLBACK_QUESTION, localDayIndex, questionForDate } from '../questions';

const QUESTIONS = ['Q0', 'Q1', 'Q2'];

describe('questionForDate', () => {
  it('is stable for the same day', () => {
    const morning = new Date(2026, 6, 27, 8, 0);
    const night = new Date(2026, 6, 27, 23, 59);
    expect(questionForDate(morning, QUESTIONS)).toBe(questionForDate(night, QUESTIONS));
  });

  it('advances by one each day and wraps around', () => {
    const days = [27, 28, 29, 30].map((d) => new Date(2026, 6, d, 21, 30));
    const picks = days.map((d) => questionForDate(d, QUESTIONS));
    const startIdx = QUESTIONS.indexOf(picks[0]);
    expect(startIdx).toBeGreaterThanOrEqual(0);
    expect(picks[1]).toBe(QUESTIONS[(startIdx + 1) % 3]);
    expect(picks[2]).toBe(QUESTIONS[(startIdx + 2) % 3]);
    expect(picks[3]).toBe(QUESTIONS[startIdx]); // wrapped
  });

  it('ignores blank lines and trims whitespace', () => {
    expect(questionForDate(new Date(2026, 6, 27), ['  only one  ', '', '   '])).toBe(
      'only one',
    );
  });

  it('falls back when the list is empty', () => {
    expect(questionForDate(new Date(2026, 6, 27), [])).toBe(FALLBACK_QUESTION);
  });
});

describe('localDayIndex', () => {
  it('increments across midnight in local time', () => {
    const beforeMidnight = new Date(2026, 6, 27, 23, 59, 59);
    const afterMidnight = new Date(2026, 6, 28, 0, 0, 1);
    expect(localDayIndex(afterMidnight)).toBe(localDayIndex(beforeMidnight) + 1);
  });
});
