const DATE_REG = /^\d{4}-\d{2}-\d{2}$/;
const YEAR_MS = 366 * 24 * 60 * 60 * 1000;

export function isValidDate(date?: string): date is string {
  if (!date || typeof date !== 'string') {
    return false;
  }
  return DATE_REG.test(date);
}

export function parseDate(data?: string) {
  if (!isValidDate(data)) {
    throw new Error('Invalid date format');
  }

  const [year, month, day] = data.split('-').map(Number);
  return new Date(Date.UTC(year, Math.max(month - 1, 0), day));
}

export function isValidRange(startDate?: string, endDate?: string, maxRangeMs = YEAR_MS): boolean {
  try {
    const start = parseDate(startDate);
    const end = parseDate(endDate);
    return end.getTime() - start.getTime() <= maxRangeMs;
  } catch (err) {
    return false;
  }
}
