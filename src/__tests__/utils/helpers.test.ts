import { describe, it, expect } from 'vitest';
import {
  formatDuration,
  formatMinutes,
  formatHoursDecimal,
  getToday,
  getStartOfWeek,
  getEndOfWeek,
  getStartOfMonth,
  getEndOfMonth,
  formatDate,
  formatTime,
  xpForLevel,
  xpProgress,
  getDayName,
  COLOR_PALETTE,
} from '../../utils/helpers';

describe('formatDuration', () => {
  it('should format 0 seconds as 00:00:00', () => {
    expect(formatDuration(0)).toBe('00:00:00');
  });

  it('should format seconds only', () => {
    expect(formatDuration(5)).toBe('00:00:05');
    expect(formatDuration(59)).toBe('00:00:59');
  });

  it('should format minutes and seconds', () => {
    expect(formatDuration(60)).toBe('00:01:00');
    expect(formatDuration(61)).toBe('00:01:01');
    expect(formatDuration(125)).toBe('00:02:05');
  });

  it('should format hours, minutes and seconds', () => {
    expect(formatDuration(3600)).toBe('01:00:00');
    expect(formatDuration(3661)).toBe('01:01:01');
    expect(formatDuration(7322)).toBe('02:02:02');
  });

  it('should handle large values', () => {
    expect(formatDuration(86400)).toBe('24:00:00');
    expect(formatDuration(360000)).toBe('100:00:00');
  });

  it('should pad single digit values with leading zeros', () => {
    expect(formatDuration(3723)).toBe('01:02:03');
  });
});

describe('formatMinutes', () => {
  it('should format 0 or sub-minute as 0min', () => {
    expect(formatMinutes(0)).toBe('0min');
    expect(formatMinutes(0.5)).toBe('0min');
  });

  it('should format minutes only (no hours)', () => {
    expect(formatMinutes(1)).toBe('1min');
    expect(formatMinutes(30)).toBe('30min');
    expect(formatMinutes(59)).toBe('59min');
  });

  it('should format exact hours', () => {
    expect(formatMinutes(60)).toBe('1h');
    expect(formatMinutes(120)).toBe('2h');
  });

  it('should format hours and minutes', () => {
    expect(formatMinutes(90)).toBe('1h 30min');
    expect(formatMinutes(150)).toBe('2h 30min');
    expect(formatMinutes(61)).toBe('1h 1min');
  });

  it('should round remaining minutes', () => {
    expect(formatMinutes(90.7)).toBe('1h 31min');
  });
});

describe('formatHoursDecimal', () => {
  it('should format 0 minutes as 0.0h', () => {
    expect(formatHoursDecimal(0)).toBe('0.0h');
  });

  it('should format 60 minutes as 1.0h', () => {
    expect(formatHoursDecimal(60)).toBe('1.0h');
  });

  it('should format 30 minutes as 0.5h', () => {
    expect(formatHoursDecimal(30)).toBe('0.5h');
  });

  it('should format 90 minutes as 1.5h', () => {
    expect(formatHoursDecimal(90)).toBe('1.5h');
  });

  it('should format 150 minutes as 2.5h', () => {
    expect(formatHoursDecimal(150)).toBe('2.5h');
  });

  it('should format with one decimal place', () => {
    expect(formatHoursDecimal(100)).toBe('1.7h');
    expect(formatHoursDecimal(45)).toBe('0.8h');
  });
});

describe('getToday', () => {
  it('should return a string in YYYY-MM-DD format', () => {
    const result = getToday();
    expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it('should return today\'s date', () => {
    const now = new Date();
    const expected = now.toISOString().split('T')[0];
    expect(getToday()).toBe(expected);
  });
});

describe('getStartOfWeek', () => {
  // Note: Dates use noon (12:00) to avoid UTC offset shifting the day in toISOString()
  it('should return Monday for a Wednesday', () => {
    // 2024-01-03 is a Wednesday
    const wed = new Date(2024, 0, 3, 12);
    expect(getStartOfWeek(wed)).toBe('2024-01-01');
  });

  it('should return Monday for a Monday', () => {
    const mon = new Date(2024, 0, 1, 12);
    expect(getStartOfWeek(mon)).toBe('2024-01-01');
  });

  it('should return Monday for a Sunday', () => {
    // 2024-01-07 is a Sunday
    const sun = new Date(2024, 0, 7, 12);
    expect(getStartOfWeek(sun)).toBe('2024-01-01');
  });

  it('should return Monday for a Saturday', () => {
    // 2024-01-06 is a Saturday
    const sat = new Date(2024, 0, 6, 12);
    expect(getStartOfWeek(sat)).toBe('2024-01-01');
  });

  it('should handle month boundary', () => {
    // 2024-02-01 is a Thursday → Monday is 2024-01-29
    const thu = new Date(2024, 1, 1, 12);
    expect(getStartOfWeek(thu)).toBe('2024-01-29');
  });
});

describe('getEndOfWeek', () => {
  it('should return Sunday for a Wednesday', () => {
    // 2024-01-03 is a Wednesday
    const wed = new Date(2024, 0, 3, 12);
    expect(getEndOfWeek(wed)).toBe('2024-01-07');
  });

  it('should return Sunday for a Monday', () => {
    const mon = new Date(2024, 0, 1, 12);
    expect(getEndOfWeek(mon)).toBe('2024-01-07');
  });

  it('should return Sunday for a Sunday', () => {
    // 2024-01-07 is a Sunday
    const sun = new Date(2024, 0, 7, 12);
    expect(getEndOfWeek(sun)).toBe('2024-01-07');
  });

  it('should handle month boundary', () => {
    // 2024-01-29 is a Monday → Sunday is 2024-02-04
    const mon = new Date(2024, 0, 29, 12);
    expect(getEndOfWeek(mon)).toBe('2024-02-04');
  });
});

describe('getStartOfMonth', () => {
  it('should return first day of the month', () => {
    const date = new Date(2024, 5, 15, 12);
    expect(getStartOfMonth(date)).toBe('2024-06-01');
  });

  it('should return first day for January', () => {
    const date = new Date(2024, 0, 20, 12);
    expect(getStartOfMonth(date)).toBe('2024-01-01');
  });

  it('should handle already being on the first', () => {
    const date = new Date(2024, 2, 1, 12);
    expect(getStartOfMonth(date)).toBe('2024-03-01');
  });

  it('should handle December', () => {
    const date = new Date(2024, 11, 25, 12);
    expect(getStartOfMonth(date)).toBe('2024-12-01');
  });
});

describe('getEndOfMonth', () => {
  it('should return last day of a 31-day month', () => {
    const date = new Date(2024, 0, 15, 12);
    expect(getEndOfMonth(date)).toBe('2024-01-31');
  });

  it('should return last day of a 30-day month', () => {
    const date = new Date(2024, 3, 10, 12);
    expect(getEndOfMonth(date)).toBe('2024-04-30');
  });

  it('should return 29 for February in a leap year', () => {
    const date = new Date(2024, 1, 10, 12);
    expect(getEndOfMonth(date)).toBe('2024-02-29');
  });

  it('should return 28 for February in a non-leap year', () => {
    const date = new Date(2023, 1, 10, 12);
    expect(getEndOfMonth(date)).toBe('2023-02-28');
  });

  it('should handle December', () => {
    const date = new Date(2024, 11, 5, 12);
    expect(getEndOfMonth(date)).toBe('2024-12-31');
  });
});

describe('formatDate', () => {
  it('should format a date string with default de-DE locale', () => {
    const result = formatDate('2024-01-15');
    expect(typeof result).toBe('string');
    expect(result.length).toBeGreaterThan(0);
  });

  it('should format with en-US locale', () => {
    const result = formatDate('2024-06-15', 'en-US');
    expect(typeof result).toBe('string');
    expect(result.length).toBeGreaterThan(0);
  });

  it('should include weekday, day, and month', () => {
    // de-DE: "Mo., 15. Jan."
    const result = formatDate('2024-01-15', 'de-DE');
    expect(result).toContain('15');
  });
});

describe('formatTime', () => {
  it('should format an ISO string to HH:MM', () => {
    const result = formatTime('2024-01-15T14:30:00.000Z');
    expect(typeof result).toBe('string');
    // Should be in format HH:MM (locale-dependent, but always 2-digit hour and minute)
    expect(result).toMatch(/^\d{2}:\d{2}$/);
  });

  it('should handle midnight', () => {
    const result = formatTime('2024-01-15T00:00:00.000Z');
    expect(result).toMatch(/^\d{2}:\d{2}$/);
  });
});

describe('xpForLevel', () => {
  it('should return 100 for level 1', () => {
    expect(xpForLevel(1)).toBe(100);
  });

  it('should return 200 for level 2', () => {
    expect(xpForLevel(2)).toBe(200);
  });

  it('should return 500 for level 5', () => {
    expect(xpForLevel(5)).toBe(500);
  });

  it('should return 1000 for level 10', () => {
    expect(xpForLevel(10)).toBe(1000);
  });

  it('should return 0 for level 0', () => {
    expect(xpForLevel(0)).toBe(0);
  });
});

describe('xpProgress', () => {
  it('should return 0 at the start of level 1', () => {
    expect(xpProgress(0, 1)).toBe(0);
  });

  it('should return 50 when 50 XP into level 1', () => {
    expect(xpProgress(50, 1)).toBe(50);
  });

  it('should return 0 at the start of level 2', () => {
    expect(xpProgress(100, 2)).toBe(0);
  });

  it('should return 25 when 25 XP into level 2', () => {
    expect(xpProgress(125, 2)).toBe(25);
  });

  it('should return progress for higher levels', () => {
    // Level 5: base XP = 400, so 450 XP = 50 progress
    expect(xpProgress(450, 5)).toBe(50);
  });

  it('should handle level 1 with 99 XP', () => {
    expect(xpProgress(99, 1)).toBe(99);
  });
});

describe('getDayName', () => {
  it('should return a string for each day index', () => {
    for (let i = 0; i < 7; i++) {
      const name = getDayName(i);
      expect(typeof name).toBe('string');
      expect(name.length).toBeGreaterThan(0);
    }
  });

  it('should return short format by default', () => {
    const short = getDayName(0, 'en-US', 'short');
    const long = getDayName(0, 'en-US', 'long');
    expect(long.length).toBeGreaterThanOrEqual(short.length);
  });

  it('should respect locale parameter', () => {
    const de = getDayName(0, 'de-DE');
    const en = getDayName(0, 'en-US');
    // Monday in German vs English — both valid strings
    expect(typeof de).toBe('string');
    expect(typeof en).toBe('string');
  });
});

describe('COLOR_PALETTE', () => {
  it('should be a non-empty array', () => {
    expect(Array.isArray(COLOR_PALETTE)).toBe(true);
    expect(COLOR_PALETTE.length).toBeGreaterThan(0);
  });

  it('should contain valid hex color strings', () => {
    for (const color of COLOR_PALETTE) {
      expect(color).toMatch(/^#[0-9a-fA-F]{6}$/);
    }
  });

  it('should have 16 colors', () => {
    expect(COLOR_PALETTE).toHaveLength(16);
  });
});
