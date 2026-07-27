import { formatDuration, formatHHMM, parseHHMM } from '../format';

describe('formatDuration', () => {
  it('formats seconds and minutes', () => {
    expect(formatDuration(0)).toBe('0:00');
    expect(formatDuration(47_000)).toBe('0:47');
    expect(formatDuration(723_000)).toBe('12:03');
  });

  it('never goes negative', () => {
    expect(formatDuration(-500)).toBe('0:00');
  });
});

describe('parseHHMM / formatHHMM', () => {
  it('round-trips valid times', () => {
    expect(parseHHMM('21:30')).toEqual({ hour: 21, minute: 30 });
    expect(parseHHMM('9:05')).toEqual({ hour: 9, minute: 5 });
    expect(formatHHMM(9, 5)).toBe('09:05');
  });

  it('rejects invalid input', () => {
    expect(parseHHMM('24:00')).toBeNull();
    expect(parseHHMM('12:60')).toBeNull();
    expect(parseHHMM('nope')).toBeNull();
    expect(parseHHMM('12.30')).toBeNull();
  });
});
