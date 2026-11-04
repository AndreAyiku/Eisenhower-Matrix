const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export function toISODate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function todayISO(): string {
  return toISODate(new Date());
}

export function addDaysISO(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return toISODate(d);
}

export function formatDue(iso?: string): string {
  if (!iso) return "Someday";
  if (iso === todayISO()) return "Today";
  const [y, m, d] = iso.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  return `${DAYS[date.getDay()]}, ${d} ${MONTHS[m - 1]}`;
}

export function formatDateTime(date?: string, time?: string): string {
  if (!date) return "Not set";
  return time ? `${formatDue(date)}, ${time}` : formatDue(date);
}

/** value like "2026-11-03T16:30" (what <input type="datetime-local"> uses) */
export function formatLocalDateTime(value?: string): string {
  if (!value) return "Not set";
  const [date, time] = value.split("T");
  return formatDateTime(date, time?.slice(0, 5));
}

export function toLocalInput(date?: string, time?: string): string {
  if (!date) return "";
  return `${date}T${time ?? "09:00"}`;
}

export function fromLocalInput(value: string): { date?: string; time?: string } {
  if (!value) return {};
  const [date, time] = value.split("T");
  return { date, time: time?.slice(0, 5) };
}

export function completedLabel(iso?: string): string {
  if (!iso) return "Completed";
  const d = new Date(iso);
  if (toISODate(d) === todayISO()) {
    const hh = String(d.getHours()).padStart(2, "0");
    const mm = String(d.getMinutes()).padStart(2, "0");
    return `Completed at ${hh}:${mm}`;
  }
  return `Completed ${formatDue(toISODate(d))}`;
}