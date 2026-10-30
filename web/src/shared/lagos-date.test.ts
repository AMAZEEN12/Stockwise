import { describe, expect, it } from 'vitest';
import { isCalendarDate, lagosToday } from './lagos-date';

describe('Lagos calendar dates', () => {
  it('uses the Lagos day around UTC midnight', () => {
    expect(lagosToday(new Date('2026-10-28T23:30:00Z'))).toBe('2026-10-29');
  });
  it('rejects rollover dates', () => {
    expect(isCalendarDate('2026-02-29')).toBe(false);
    expect(isCalendarDate('2028-02-29')).toBe(true);
  });
});
