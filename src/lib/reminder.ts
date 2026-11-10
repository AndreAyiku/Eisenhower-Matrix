import type { ReminderRule, Task } from "../types/task";
import { formatDateTime, formatLocalDateTime, toISODate } from "./dates";
import { shiftLocal } from "./schedule";

export const MORNING_TIME = "09:00";
const MORNING_HOUR = 9;

type DueFields = Pick<Task, "dueDate" | "dueTime">;
type WithReminder = DueFields & { reminder?: ReminderRule };

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

/** When the reminder should fire, in epoch ms. */
export function reminderMs(task: WithReminder): number | null {
  const rule = task.reminder;
  if (!rule) return null;

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

export function reminderOptions(hasTime: boolean, current?: ReminderRule): ReminderOption[] {
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
  list.push({ value: "custom", label: "Custom date & time…" });

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

/** One-line explanation of when notifications will arrive for this task. */
export function reminderHint(task: WithReminder, nowMs: number = Date.now()): string {
  if (!task.dueDate) return "Add a due date to set a reminder.";

  const dueNote = "You’ll also get a notification when it’s due.";
  const at = reminderMs(task);
  if (!task.reminder || at === null) return dueNote;

  const due = dueMs(task);
  if (due !== null && Math.abs(at - due) < 30_000) {
    return "You’ll get a notification when it’s due.";
  }
  if (at <= nowMs) {
    return `That time has already passed, so this reminder won’t be sent. ${dueNote}`;
  }

  const d = new Date(at);
  const when = formatDateTime(toISODate(d), `${pad(d.getHours())}:${pad(d.getMinutes())}`);
  return `Reminder: ${when}. ${dueNote}`;
}

/** Converts a task saved by the old version (a fixed reminder time) to the new format. */
export function migrateTask(raw: Task & { reminderAt?: string }): Task {
  const { reminderAt, ...task } = raw;
  if (task.reminder || !reminderAt) return task;

  const at = new Date(reminderAt).getTime();
  const due = dueMs(task);
  if (Number.isFinite(at) && due !== null && task.dueTime) {
    const minutes = Math.round((due - at) / 60000);
    if (minutes >= 0 && minutes <= 10080) {
      return { ...task, reminder: { type: "before", minutes } };
    }
  }
  return { ...task, reminder: { type: "custom", at: reminderAt } };
}