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

export function formatEastern(iso: string | null | undefined): string {
  if (!iso) return "";
  const date = new Date(iso);
  if (isNaN(date.getTime())) return "";
  const p = Object.fromEntries(formatter.formatToParts(date).map((x) => [x.type, x.value]));
  return `${p.month} ${p.day}, ${p.hour}:${p.minute} ${p.dayPeriod} ET`;
}
