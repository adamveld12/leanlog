import { localDate, msUntilNextLocalMidnight } from './date';

describe('localDate', () => {
  it('formats the local calendar day, not the UTC day', () => {
    // 23:30 local on Oct 6 is already Oct 7 in UTC for any zone behind UTC.
    expect(localDate(new Date(2026, 9, 6, 23, 30))).toBe('2026-10-06');
    expect(localDate(new Date(2026, 0, 2, 0, 5))).toBe('2026-01-02');
  });
});

describe('msUntilNextLocalMidnight', () => {
  it('counts to the next local midnight', () => {
    expect(msUntilNextLocalMidnight(new Date(2026, 9, 6, 23, 59, 0))).toBe(60_000);
    expect(msUntilNextLocalMidnight(new Date(2026, 9, 6, 0, 0, 0))).toBe(24 * 60 * 60 * 1000);
  });
});
