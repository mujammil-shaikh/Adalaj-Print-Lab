/**
 * Domain Date Calculations for Manufacturing and Expiry
 * Ensures date-only calendar math without UTC shifts or month-end rollover bugs.
 */

export interface CalendarDate {
  year: number;
  month: number; // 1-12
  day: number;   // 1-31
}

export function parseDateInput(value: string | Date): CalendarDate {
  if (value instanceof Date) {
    return {
      year: value.getFullYear(),
      month: value.getMonth() + 1,
      day: value.getDate(),
    };
  }

  // Handle YYYY-MM-DD
  const isoMatch = value.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (isoMatch) {
    return {
      year: parseInt(isoMatch[1], 10),
      month: parseInt(isoMatch[2], 10),
      day: parseInt(isoMatch[3], 10),
    };
  }

  // Handle DD/MM/YY or DD/MM/YYYY
  const dmyMatch = value.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/);
  if (dmyMatch) {
    let year = parseInt(dmyMatch[3], 10);
    if (year < 100) year += 2000;
    return {
      year,
      month: parseInt(dmyMatch[2], 10),
      day: parseInt(dmyMatch[1], 10),
    };
  }

  const d = new Date(value);
  if (isNaN(d.getTime())) {
    throw new Error(`Invalid date string: "${value}"`);
  }
  return {
    year: d.getFullYear(),
    month: d.getMonth() + 1,
    day: d.getDate(),
  };
}

export function formatCalendarDateDMY(date: CalendarDate, twoDigitYear = true): string {
  const d = String(date.day).padStart(2, '0');
  const m = String(date.month).padStart(2, '0');
  const y = twoDigitYear ? String(date.year).slice(-2) : String(date.year);
  return `${d}/${m}/${y}`;
}

export function daysInMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate();
}

/**
 * Calculates Best Before date: MFD + shelfLifeMonths - 1 day.
 * Correctly clamps to month ends so that Jan 31 + 1 month does NOT spill into March.
 */
export function calculateBestBeforeDate(mfd: CalendarDate, shelfLifeMonths: number): CalendarDate {
  if (shelfLifeMonths <= 0) {
    throw new Error('Shelf life months must be greater than 0');
  }

  const totalMonths = (mfd.year * 12) + (mfd.month - 1) + shelfLifeMonths;
  const targetYear = Math.floor(totalMonths / 12);
  const targetMonth = (totalMonths % 12) + 1; // 1-12

  const maxDays = daysInMonth(targetYear, targetMonth);
  let targetDay = Math.min(mfd.day, maxDays);

  // Minus 1 day rule for "Best Before"
  targetDay -= 1;
  if (targetDay === 0) {
    // Go to the last day of the previous month
    let prevMonth = targetMonth - 1;
    let prevYear = targetYear;
    if (prevMonth === 0) {
      prevMonth = 12;
      prevYear -= 1;
    }
    return {
      year: prevYear,
      month: prevMonth,
      day: daysInMonth(prevYear, prevMonth),
    };
  }

  return {
    year: targetYear,
    month: targetMonth,
    day: targetDay,
  };
}
