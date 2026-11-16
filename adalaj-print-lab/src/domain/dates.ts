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

  const trimmed = (value || '').trim();
  if (!trimmed) {
    throw new Error('Empty date string');
  }

  // Reject bare numbers (e.g. "1", "20", "2026") which new Date() parses unpredictably
  if (/^\d+$/.test(trimmed)) {
    throw new Error(`Incomplete date string: "${value}"`);
  }

  // Handle YYYY-MM-DD or YYYY/MM/DD or YYYY.MM.DD
  const isoMatch = trimmed.match(/^(\d{4})\s*[-/.]\s*(\d{1,2})\s*[-/.]\s*(\d{1,2})$/);
  if (isoMatch) {
    const year = parseInt(isoMatch[1], 10);
    const month = parseInt(isoMatch[2], 10);
    const day = parseInt(isoMatch[3], 10);
    if (month >= 1 && month <= 12 && day >= 1 && day <= 31) {
      return { year, month, day };
    }
    throw new Error(`Invalid calendar numbers in date: "${value}"`);
  }

  // Handle DD/MM/YY or DD/MM/YYYY or DD-MM-YY or DD-MM-YYYY or DD.MM.YY with optional spaces
  const dmyMatch = trimmed.match(/^(\d{1,2})\s*[-/.]\s*(\d{1,2})\s*[-/.]\s*(\d{2,4})$/);
  if (dmyMatch) {
    let year = parseInt(dmyMatch[3], 10);
    if (year < 100) year += 2000;
    const month = parseInt(dmyMatch[2], 10);
    const day = parseInt(dmyMatch[1], 10);
    if (month >= 1 && month <= 12 && day >= 1 && day <= 31) {
      return { year, month, day };
    }
    throw new Error(`Invalid calendar numbers in date: "${value}"`);
  }

  // Handle textual dates like "16 Nov 2026" or full ISO timestamps like "2026-11-16T12:00:00Z"
  if (/[a-zA-Z]/.test(trimmed) || trimmed.includes('T')) {
    const d = new Date(trimmed);
    if (!isNaN(d.getTime())) {
      return {
        year: d.getFullYear(),
        month: d.getMonth() + 1,
        day: d.getDate(),
      };
    }
  }

  throw new Error(`Invalid date string: "${value}"`);
}

export function formatCalendarDateDMY(date: CalendarDate, twoDigitYear = true): string {
  const d = String(date.day).padStart(2, '0');
  const m = String(date.month).padStart(2, '0');
  const y = twoDigitYear ? String(date.year).slice(-2) : String(date.year);
  return `${d}/${m}/${y}`;
}

export function formatCalendarDateISO(date: CalendarDate): string {
  const d = String(date.day).padStart(2, '0');
  const m = String(date.month).padStart(2, '0');
  return `${date.year}-${m}-${d}`;
}

/**
 * Extracts a date substring if present in a formatted string like 'MFD: 16/11/26' or 'EXP: 15/11/27'
 */
export function extractDateFromText(text: string): string | null {
  if (!text) return null;
  // Match YYYY-MM-DD first so 4-digit years are not truncated
  const iso = text.match(/(\d{4}\s*[-/.]\s*\d{1,2}\s*[-/.]\s*\d{1,2})/);
  if (iso) return iso[1].replace(/\s+/g, '');
  // Match DD/MM/YY or DD/MM/YYYY or DD-MM-YY or DD-MM-YYYY or DD.MM.YY with optional spaces
  const dmy = text.match(/(\d{1,2}\s*[-/.]\s*\d{1,2}\s*[-/.]\s*\d{2,4})/);
  if (dmy) return dmy[1].replace(/\s+/g, '');
  return null;
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
