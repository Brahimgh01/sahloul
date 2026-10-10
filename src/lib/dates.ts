// Date helpers. Everything shows as day/month/year. Money uses TND with 3 decimals.

/** dd/MM/yyyy */
export function formatDate(iso: string | null | undefined): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  return `${dd}/${mm}/${d.getFullYear()}`;
}

export function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export function startOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

export function addDays(d: Date, days: number): Date {
  const x = new Date(d);
  x.setDate(x.getDate() + days);
  return x;
}

export function isWeekend(d: Date, weekendDays: number[]): boolean {
  return weekendDays.includes(d.getDay());
}

/** Add N business days, skipping the chosen weekend days. */
export function addBusinessDays(from: Date | string, days: number, weekendDays: number[]): Date {
  const d = startOfDay(typeof from === 'string' ? new Date(from) : from);
  let left = days;
  while (left > 0) {
    d.setDate(d.getDate() + 1);
    if (!isWeekend(d, weekendDays)) left -= 1;
  }
  return d;
}

/** Whole days between two dates (b - a). */
export function daysBetween(a: Date | string, b: Date | string): number {
  const da = startOfDay(typeof a === 'string' ? new Date(a) : a).getTime();
  const db = startOfDay(typeof b === 'string' ? new Date(b) : b).getTime();
  return Math.round((db - da) / 86400000);
}

export function daysLate(expected: string, today: Date = new Date()): number {
  return Math.max(0, daysBetween(expected, today));
}

export function daysLeft(expected: string, today: Date = new Date()): number {
  return daysBetween(today, expected);
}

export function greetingKey(hour = new Date().getHours()): 'greetingMorning' | 'greetingAfternoon' | 'greetingEvening' | 'greetingNight' {
  if (hour >= 5 && hour < 12) return 'greetingMorning';
  if (hour >= 12 && hour < 18) return 'greetingAfternoon';
  if (hour >= 18 && hour < 22) return 'greetingEvening';
  return 'greetingNight';
}
