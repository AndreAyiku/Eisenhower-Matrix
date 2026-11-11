import type { ReminderRule, RepeatRule, Task } from "../types/task";
import { formatDateTime, formatLocalDateTime, toISODate } from "./dates";
import { occurrenceDates } from "./recurrence";
import { shiftLocal } from "./schedule";

export const MORNING_TIME = "09:00";
export const MAX_REMINDERS = 6;
const MORNING_HOUR = 9;

type DueFields = Pick<Task, "dueDate" | "dueTime">;

const pad = (n: number) => String(n).padStart(2, "0");

function localMs(date: string, time: string): number {
  const [y, m, d] = date.split("-").map(Number);
  const [h, mi] = time.split(":").map(Number);
  return new Date(y, m - 1, d, h, mi || 0).getTime();
}

/** When the task is due, in epoch ms. A date with no time counts as 09:00. */
export function dueMs(task: DueFields): number | null {
  return task.dueDate ? localMs(task.dueDate, task.dueTime ?? MORNING_TIME) : null;
}

/** When one reminder fires for a given occurrence, in epoch ms. */
export function ruleMs(rule: ReminderRule, task: DueFields): number | null {
  if (rule.type === "custom") {
    const at = new Date(rule.at).getTime();
    return Number.isFinite(at) ? at : null;
  }
  if (!task.dueDate) return null;

  if (rule.type === "before") {
    const due = dueMs(task);
    return due === null ? null : due - rule.minutes * 60000;
  }

  const [y, m, d] = task.dueDate.split("-").map(Number);
  return new Date(y, m - 1, d - rule.daysBefore, MORNING_HOUR, 0).getTime();
}

export function describeRule(rule?: ReminderRule): string {
  if (!rule) return "None";
  if (rule.type === "custom") return formatLocalDateTime(rule.at);
  if (rule.type === "morning") {
    if (rule.daysBefore === 0) return "On the day at 9:00";
    if (rule.daysBefore === 1) return "The day before at 9:00";
    return `${rule.daysBefore} days before at 9:00`;
  }
  const m = rule.minutes;
  if (m === 0) return "At due time";
  if (m === 60) return "1 hour before";
  if (m === 1440) return "1 day before";
  if (m > 1440 && m % 1440 === 0) return `${m / 1440} days before`;
  if (m > 60 && m % 60 === 0) return `${m / 60} hours before`;
  return `${m} min before`;
}

export interface ReminderOption {
  value: string;
  label: string;
}

export function ruleValue(rule?: ReminderRule): string {
  if (!rule) return "none";
  if (rule.type === "before") return `before:${rule.minutes}`;
  if (rule.type === "morning") return `morning:${rule.daysBefore}`;
  return "custom";
}

const TIMED_MINUTES = [0, 5, 15, 30, 60, 1440];

export function reminderOptions(
  hasTime: boolean,
  allowCustom: boolean,
  current?: ReminderRule
): ReminderOption[] {
  const list: ReminderOption[] = [{ value: "none", label: "None" }];

  if (hasTime) {
    for (const minutes of TIMED_MINUTES) {
      list.push({
        value: `before:${minutes}`,
        label: describeRule({ type: "before", minutes }),
      });
    }
  } else {
    for (const daysBefore of [0, 1]) {
      list.push({
        value: `morning:${daysBefore}`,
        label: describeRule({ type: "morning", daysBefore }),
      });
    }
  }
  if (allowCustom) list.push({ value: "custom", label: "Custom date & time…" });

  if (current && current.type !== "custom" && !list.some((o) => o.value === ruleValue(current))) {
    list.splice(1, 0, { value: ruleValue(current), label: describeRule(current) });
  }
  return list;
}

export function ruleFromValue(
  value: string,
  dueDate: string | undefined,
  dueTime: string | undefined
): ReminderRule | undefined {
  if (value === "none") return undefined;

  if (value === "custom") {
    const at = dueDate
      ? shiftLocal(dueDate, dueTime ?? MORNING_TIME, -30)
      : `${toISODate(new Date())}T${MORNING_TIME}`;
    return { type: "custom", at };
  }

  const [kind, raw] = value.split(":");
  const n = Number(raw);
  if (!Number.isFinite(n)) return undefined;
  if (kind === "before") return { type: "before", minutes: n };
  if (kind === "morning") return { type: "morning", daysBefore: n };
  return undefined;
}

/** A sensible next reminder to add: the first common option not already used. */
export function defaultRule(
  existing: ReminderRule[],
  hasTime: boolean,
  allowCustom: boolean,
  dueDate?: string,
  dueTime?: string
): ReminderRule {
  const candidates: ReminderRule[] = hasTime
    ? [15, 5, 30, 60, 0, 1440].map((minutes): ReminderRule => ({ type: "before", minutes }))
    : [0, 1].map((daysBefore): ReminderRule => ({ type: "morning", daysBefore }));

  const used = new Set(existing.map(ruleValue));
  const free = candidates.find((c) => !used.has(ruleValue(c)));
  if (free) return free;

  if (allowCustom) {
    const custom = ruleFromValue("custom", dueDate, dueTime);
    if (custom) return custom;
  }
  return candidates[0];
}

type WithReminders = DueFields & { reminders?: ReminderRule[]; repeat?: RepeatRule };

/** One-line explanation of when notifications will arrive for this task. */
export function remindersHint(task: WithReminders, nowMs: number = Date.now()): string {
  if (!task.dueDate) return "Add a due date to set reminders.";

  const dueNote = "You’ll also get a notification when it’s due.";
  const rules = task.reminders ?? [];
  if (rules.length === 0) return dueNote;

  const today = toISODate(new Date(nowMs));
  const horizon = toISODate(new Date(nowMs + 60 * 86_400_000));
  const dates = task.repeat
    ? occurrenceDates({ dueDate: task.dueDate, repeat: task.repeat }, today, horizon, 14)
    : [task.dueDate];

  let next: number | null = null;
  let sameAsDue = false;

  for (const date of dates) {
    const occurrence = { dueDate: date, dueTime: task.dueTime };
    const due = dueMs(occurrence);
    for (const rule of rules) {
      const at = ruleMs(rule, occurrence);
      if (at === null || at <= nowMs) continue;
      if (due !== null && Math.abs(at - due) < 30_000) {
        sameAsDue = true;
        continue;
      }
      if (next === null || at < next) next = at;
    }
  }

  if (next !== null) {
    const d = new Date(next);
    const when = formatDateTime(toISODate(d), `${pad(d.getHours())}:${pad(d.getMinutes())}`);
    return `Next reminder: ${when}. ${dueNote}`;
  }
  if (sameAsDue) return "You’ll get a notification when it’s due.";
  return `Those times have already passed, so no reminder will be sent. ${dueNote}`;
}

/** A task as saved by an older version of the app. */
export type LegacyTask = Task & { reminder?: ReminderRule; reminderAt?: string };

/** Converts older reminder formats (one reminder, or a fixed time) to a list of rules. */
export function migrateTask(raw: LegacyTask): Task {
  const { reminder, reminderAt, ...task } = raw;
  if (task.reminders) return task;

  const rules: ReminderRule[] = [];
  if (reminder) {
    rules.push(reminder);
  } else if (reminderAt) {
    const at = new Date(reminderAt).getTime();
    const due = dueMs(task);
    if (Number.isFinite(at) && due !== null && task.dueTime) {
      const minutes = Math.round((due - at) / 60000);
      rules.push(
        minutes >= 0 && minutes <= 10080
          ? { type: "before", minutes }
          : { type: "custom", at: reminderAt }
      );
    } else {
      rules.push({ type: "custom", at: reminderAt });
    }
  }
  return rules.length > 0 ? { ...task, reminders: rules } : task;
}