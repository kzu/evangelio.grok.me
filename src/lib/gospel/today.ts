export const GOSPEL_TZ = "America/Argentina/Buenos_Aires";

export function todayISO() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: GOSPEL_TZ }).format(new Date());
}

export function isIsoDate(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(value);
}
