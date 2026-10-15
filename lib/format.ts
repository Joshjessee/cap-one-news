// Formats a date in Eastern Time, e.g. "Oct 4, 9:05 AM ET".
// Built from parts so the server and browser always produce exactly the same text.
const formatter = new Intl.DateTimeFormat("en-US", {
  timeZone: "America/New_York",
  month: "short",
  day: "numeric",
  hour: "numeric",
  minute: "2-digit",
  hour12: true,
});

const dayFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: "America/New_York",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

/** Pass `{ year: true }` for "Oct 4, 2026, 9:05 AM ET" (used in the archive). */
export function formatEastern(iso: string | null | undefined, { year = false } = {}): string {
  if (!iso) return "";
  const date = new Date(iso);
  if (isNaN(date.getTime())) return "";
  const p = Object.fromEntries(formatter.formatToParts(date).map((x) => [x.type, x.value]));
  const y = year ? ` ${easternDay(iso).slice(0, 4)},` : "";
  return `${p.month} ${p.day},${y} ${p.hour}:${p.minute} ${p.dayPeriod} ET`;
}

/** The calendar day in Eastern Time as "2026-10-04", for comparing against date pickers. */
export function easternDay(iso: string): string {
  return dayFormatter.format(new Date(iso));
}
