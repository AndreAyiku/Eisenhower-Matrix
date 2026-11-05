import type { Task } from "../types/task";
import { DEFAULT_BLOCK_MIN, fmtMin, parseISO } from "./calendar";
import { toISODate } from "./dates";

export const WORK_HOURS = { startMin: 9 * 60, endMin: 17 * 60, days: [1, 2, 3, 4, 5] };

export const CALENDAR_OPTIONS = ["Work", "Personal"];

export const REMINDER_OPTIONS = [
  { minutes: 0, label: "At start" },
  { minutes: 5, label: "5 min before" },
  { minutes: 10, label: "10 min before" },
  { minutes: 15, label: "15 min before" },
  { minutes: 30, label: "30 min before" },
  { minutes: 60, label: "1 hour before" },
  { minutes: 1440, label: "1 day before" },
];

const pad = (n: number) => String(n).padStart(2, "0");

export function timeToMin(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + (m || 0);
}

export function minToTime(total: number): string {
  const clamped = Math.max(0, Math.min(total, 24 * 60 - 1));
  return `${pad(Math.floor(clamped / 60))}:${pad(clamped % 60)}`;
}

/** Returns a local date-time string "YYYY-MM-DDTHH:mm", shifted by deltaMin. */
export function shiftLocal(date: string, time: string, deltaMin: number): string {
  const [y, m, d] = date.split("-").map(Number);
  const [h, mi] = time.split(":").map(Number);
  const dt = new Date(y, m - 1, d, h, mi + deltaMin);
  return `${toISODate(dt)}T${pad(dt.getHours())}:${pad(dt.getMinutes())}`;
}

/** Minutes between the reminder and the start, or null if not applicable. */
export function reminderOffset(
  task: Pick<Task, "dueDate" | "dueTime" | "reminderAt">
): number | null {
  if (!task.reminderAt || !task.dueDate || !task.dueTime) return null;
  const [y, m, d] = task.dueDate.split("-").map(Number);
  const [h, mi] = task.dueTime.split(":").map(Number);
  const start = new Date(y, m - 1, d, h, mi).getTime();
  const reminder = new Date(task.reminderAt).getTime();
  if (Number.isNaN(reminder)) return null;
  const diff = Math.round((start - reminder) / 60000);
  return diff >= 0 ? diff : null;
}

export function formatOffset(minutes: number): string {
  const known = REMINDER_OPTIONS.find((o) => o.minutes === minutes);
  if (known) return known.label;
  if (minutes % 1440 === 0) return `${minutes / 1440} days before`;
  if (minutes % 60 === 0) return `${minutes / 60} hours before`;
  return `${minutes} min before`;
}

export interface ScheduleStatus {
  tone: "ok" | "warn" | "error";
  text: string;
}

interface StatusArgs {
  taskId: string;
  date: string;
  startMin: number;
  endMin: number;
  tasks: Task[];
}

export function scheduleStatus({
  taskId,
  date,
  startMin,
  endMin,
  tasks,
}: StatusArgs): ScheduleStatus {
  if (endMin <= startMin) {
    return { tone: "error", text: "The end time must be after the start time." };
  }

  const clashes = tasks
    .filter((t) => t.id !== taskId && !t.completed && t.dueDate === date && t.dueTime)
    .map((t) => {
      const s = timeToMin(t.dueTime!);
      return {
        title: t.title,
        s,
        e: Math.min(s + (t.estimateMinutes ?? DEFAULT_BLOCK_MIN), 1440),
      };
    })
    .filter((c) => c.s < endMin && c.e > startMin);

  if (clashes.length > 0) {
    const first = clashes[0];
    const more = clashes.length > 1 ? ` and ${clashes.length - 1} more` : "";
    return {
      tone: "warn",
      text: `Overlaps with “${first.title}” (${fmtMin(first.s)}–${fmtMin(first.e)})${more}.`,
    };
  }

  const weekday = parseISO(date).getDay();
  const inHours =
    WORK_HOURS.days.includes(weekday) &&
    startMin >= WORK_HOURS.startMin &&
    endMin <= WORK_HOURS.endMin;

  if (!inHours) {
    return {
      tone: "warn",
      text: `Outside your work hours (Mon–Fri, ${fmtMin(WORK_HOURS.startMin)}–${fmtMin(WORK_HOURS.endMin)}). No scheduling conflicts.`,
    };
  }

  return { tone: "ok", text: "Fits your work hours. No scheduling conflicts." };
}