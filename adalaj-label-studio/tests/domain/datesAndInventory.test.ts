import { describe, it, expect } from 'vitest';
import {
  parseDateInput,
  formatCalendarDateDMY,
  calculateBestBeforeDate,
} from '../../src/domain/dates';
import {
  parsePackSizeToGrams,
  calculateExpectedPacks,
  validateMassBalance,
  calculateRatePerGram,
} from '../../src/domain/inventory';

describe('Domain: Date Calculations (DATA-09, DATA-10)', () => {
  it('parses YYYY-MM-DD correctly without UTC day shift', () => {
    const cd = parseDateInput('2026-11-04');
    expect(cd).toEqual({ year: 2026, month: 11, day: 4 });
    expect(formatCalendarDateDMY(cd)).toBe('04/11/26');
  });

  it('calculates standard shelf life expiry minus 1 day', () => {
    const mfd = parseDateInput('2026-10-10');
    const bb = calculateBestBeforeDate(mfd, 12);
    // 10 Oct 2026 + 12 months = 10 Oct 2027, minus 1 day = 09 Oct 2027
    expect(formatCalendarDateDMY(bb)).toBe('09/10/27');
  });

  it('correctly clamps Jan-31 + 1 month without overflowing into March (DATA-10)', () => {
    const mfd = parseDateInput('2026-01-31');
    const bb = calculateBestBeforeDate(mfd, 1);
    // 2026 is non-leap year: Feb has 28 days.
    // Jan 31 clamped to Feb 28, minus 1 day = Feb 27
    expect(bb).toEqual({ year: 2026, month: 2, day: 27 });
    expect(formatCalendarDateDMY(bb)).toBe('27/02/26');
  });

  it('correctly calculates leap year Feb-29 expiry', () => {
    const mfd = parseDateInput('2024-02-29');
    const bb = calculateBestBeforeDate(mfd, 12);
    // 2025 has 28 days in Feb. Clamped to Feb 28, minus 1 day = Feb 27
    expect(bb).toEqual({ year: 2025, month: 2, day: 27 });
  });

  it('handles first day of month rollover to previous month end', () => {
    const mfd = parseDateInput('2026-01-01');
    const bb = calculateBestBeforeDate(mfd, 1);
    // Target month = Feb 2026. Day 1 - 1 = day 0 -> Jan 31, 2026
    expect(bb).toEqual({ year: 2026, month: 1, day: 31 });
    expect(formatCalendarDateDMY(bb)).toBe('31/01/26');
  });
});

describe('Domain: Inventory and Mass Balance (DATA-07, DATA-08, P0-07)', () => {
  it('parses valid pack sizes to grams', () => {
    expect(parsePackSizeToGrams('100 g')).toBe(100);
    expect(parsePackSizeToGrams('500g')).toBe(500);
    expect(parsePackSizeToGrams('1 kg')).toBe(1000);
    expect(parsePackSizeToGrams('2.5 Kg')).toBe(2500);
  });

  it('throws on invalid pack sizes', () => {
    expect(() => parsePackSizeToGrams('')).toThrow();
    expect(() => parsePackSizeToGrams('abc')).toThrow();
  });

  it('calculates expected packs without forcing minimum 1 (DATA-08)', () => {
    expect(calculateExpectedPacks(0, 100)).toBe(0);
    expect(calculateExpectedPacks(15, 100)).toBe(150);
    expect(calculateExpectedPacks(15, 500)).toBe(30);
    expect(calculateExpectedPacks(0.05, 100)).toBe(0); // 50g / 100g = 0 packs
  });

  it('validates mass balance and rejects over-allocation (P0-07)', () => {
    const valid = validateMassBalance(50, [
      { allocatedKg: 15 },
      { allocatedKg: 15 },
    ]);
    expect(valid.valid).toBe(true);
    expect(valid.totalAllocatedKg).toBe(30);
    expect(valid.looseBalanceKg).toBe(20);

    const overAllocated = validateMassBalance(50, [
      { allocatedKg: 30 },
      { allocatedKg: 25 },
    ]);
    expect(overAllocated.valid).toBe(false);
    expect(overAllocated.error).toContain('exceeds raw material input');
    expect(overAllocated.totalAllocatedKg).toBe(55);
  });

  it('calculates rate per gram only when MRP is valid and positive', () => {
    expect(calculateRatePerGram(50, 100)).toBe(0.5);
    expect(calculateRatePerGram(220, 500)).toBe(0.44);
    expect(calculateRatePerGram(undefined, 100)).toBeNull();
    expect(calculateRatePerGram(-10, 100)).toBeNull();
    expect(calculateRatePerGram(0, 100)).toBeNull();
  });
});
