import type { RepeatRule, RepeatUnit, Task } from "../types/task";
import { toISODate } from "./dates";

const DAY_MS = 86_400_000;
const SEARCH_LIMIT_DAYS = 3700;

const WEEKDAY_SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

/** Display order for weekday buttons: Monday first. */
export const WEEK_ORDER = [1, 2, 3, 4, 5, 6, 0];
export const WEEKDAYS = [1, 2, 3, 4, 5];

export function weekdayShort(day: number): string {
  return WEEKDAY_SHORT[day] ?? "";
}

function parse(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d);
}

/** Whole days since 1970 for a date, ignoring daylight saving. */
function dayNumber(iso: string): number {
  const [y, m, d] = iso.split("-").map(Number);
  return Math.floor(Date.UTC(y, m - 1, d) / DAY_MS);
}

/** Day number of the Monday of that date's week. */
function mondayNumber(iso: string): number {
  const dow = parse(iso).getDay();
  return dayNumber(iso) - ((dow + 6) % 7);
}

/** `month` is 1 to 12. */
function daysInMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate();
}

function weekdaysOf(rule: RepeatRule): number[] {
  return rule.weekdays && rule.weekdays.length > 0
    ? rule.weekdays
    : [parse(rule.anchor).getDay()];
}

/** Does this rule produce an occurrence on that date? */
export function ruleMatches(rule: RepeatRule, iso: string): boolean {
  if (iso < rule.anchor) return false;
  const n = Math.max(1, Math.round(rule.interval) || 1);

  if (rule.unit === "day") {
    return (dayNumber(iso) - dayNumber(rule.anchor)) % n === 0;
  }

  if (rule.unit === "week") {
    if (!weekdaysOf(rule).includes(parse(iso).getDay())) return false;
    const weeks = (mondayNumber(iso) - mondayNumber(rule.anchor)) / 7;
    return weeks % n === 0;
  }

  const [ay, am, ad] = rule.anchor.split("-").map(Number);
  const [y, m, d] = iso.split("-").map(Number);

  if (rule.unit === "month") {
    const months = (y - ay) * 12 + (m - am);
    return months % n === 0 && d === Math.min(ad, daysInMonth(y, m));
  }

  return (y - ay) % n === 0 && m === am && d === Math.min(ad, daysInMonth(y, m));
}

/** Is the task on that date? Its own due date always counts. */
export function occursOn(task: Pick<Task, "dueDate" | "repeat">, iso: string): boolean {
  if (!task.dueDate) return false;
  if (iso === task.dueDate) return true;
  if (!task.repeat || iso < task.dueDate) return false;
  return ruleMatches(task.repeat, iso);
}

/** The first occurrence strictly after a date. */
export function nextAfter(rule: RepeatRule, afterIso: string): string | null {
  const d = parse(afterIso);
  for (let i = 0; i < SEARCH_LIMIT_DAYS; i++) {
    d.setDate(d.getDate() + 1);
    const iso = toISODate(d);
    if (ruleMatches(rule, iso)) return iso;
  }
  return null;
}

/** Occurrence dates between two dates (inclusive), at most `maxCount`. */
export function occurrenceDates(
  task: Pick<Task, "dueDate" | "repeat">,
  fromIso: string,
  toIso: string,
  maxCount: number
): string[] {
  if (!task.dueDate) return [];
  const out: string[] = [];
  if (task.dueDate >= fromIso && task.dueDate <= toIso) out.push(task.dueDate);
  if (!task.repeat) return out;

  const d = parse(task.dueDate > fromIso ? task.dueDate : fromIso);
  for (let i = 0; i < 4000 && out.length < maxCount; i++) {
    const iso = toISODate(d);
    if (iso > toIso) break;
    if (iso > task.dueDate && ruleMatches(task.repeat, iso)) out.push(iso);
    d.setDate(d.getDate() + 1);
  }
  return out;
}

/** Marks a repeating task done by moving it to its next time. Null if it doesn't repeat. */
export function advanceTask(task: Task, todayIso: string, nowIso: string): Task | null {
  if (!task.repeat || !task.dueDate) return null;
  const from = task.dueDate > todayIso ? task.dueDate : todayIso;
  const next = nextAfter(task.repeat, from);
  if (!next) return null;
  return {
    ...task,
    dueDate: next,
    subtasks: task.subtasks.map((s) => ({ ...s, done: false, completedAt: undefined })),
    lastDoneAt: nowIso,
    updatedAt: nowIso,
  };
}

// ---------- Wording and presets ----------

const UNIT_WORD: Record<RepeatUnit, [string, string]> = {
  day: ["day", "days"],
  week: ["week", "weeks"],
  month: ["month", "months"],
  year: ["year", "years"],
};

export function unitWord(unit: RepeatUnit, n: number): string {
  return UNIT_WORD[unit][n === 1 ? 0 : 1];
}

function isWeekdaySet(days?: number[]): boolean {
  if (!days || days.length !== 5) return false;
  return WEEKDAYS.every((d) => days.includes(d));
}

export function describeRepeat(rule?: RepeatRule): string {
  if (!rule) return "Never";
  const n = Math.max(1, rule.interval);

  if (rule.unit === "week") {
    const days = rule.weekdays ?? [];
    if (n === 1 && isWeekdaySet(days)) return "Every weekday";
    const names = WEEK_ORDER.filter((d) => days.includes(d)).map(weekdayShort).join(", ");
    if (n === 1) return names ? `Every ${names}` : "Every week";
    return names ? `Every ${n} weeks on ${names}` : `Every ${n} weeks`;
  }

  return n === 1 ? `Every ${rule.unit}` : `Every ${n} ${unitWord(rule.unit, n)}`;
}

export function shortRepeat(rule?: RepeatRule): string {
  if (!rule) return "";
  if (Math.max(1, rule.interval) === 1) {
    if (rule.unit === "day") return "Daily";
    if (rule.unit === "month") return "Monthly";
    if (rule.unit === "year") return "Yearly";
    if (isWeekdaySet(rule.weekdays)) return "Weekdays";
    if (!rule.weekdays || rule.weekdays.length === 0) return "Weekly";
  }
  return describeRepeat(rule);
}

export type RepeatPreset =
  | "none"
  | "daily"
  | "weekdays"
  | "weekly"
  | "monthly"
  | "yearly"
  | "custom";

export function repeatPreset(rule?: RepeatRule): RepeatPreset {
  if (!rule) return "none";
  if (Math.max(1, rule.interval) === 1) {
    if (rule.unit === "day") return "daily";
    if (rule.unit === "month") return "monthly";
    if (rule.unit === "year") return "yearly";
    if (isWeekdaySet(rule.weekdays)) return "weekdays";
    if (!rule.weekdays || rule.weekdays.length === 0) return "weekly";
  }
  return "custom";
}

export function ruleFromPreset(preset: RepeatPreset, anchor: string): RepeatRule | undefined {
  if (preset === "daily") return { unit: "day", interval: 1, anchor };
  if (preset === "weekdays") {
    return { unit: "week", interval: 1, weekdays: [...WEEKDAYS], anchor };
  }
  if (preset === "weekly") return { unit: "week", interval: 1, anchor };
  if (preset === "monthly") return { unit: "month", interval: 1, anchor };
  if (preset === "yearly") return { unit: "year", interval: 1, anchor };
  if (preset === "custom") return { unit: "day", interval: 2, anchor };
  return undefined;
}