import { formatDue, toISODate } from "./dates";
import { currentSubscription, postJobs, type ReminderJob } from "./push";
import { occurrenceDates } from "./recurrence";
import { dueMs, ruleMs } from "./reminder";
import type { Task } from "../types/task";

const MAX_JOBS = 200;
const DAY_MS = 86_400_000;
const REPEAT_HORIZON_DAYS = 14;
const MAX_OCCURRENCES = 14;
const SINGLE_HORIZON_DAYS = 90;
const SAME_TIME_MS = 30_000;

function dueLabel(date: string, time?: string): string {
  const when = formatDue(date);
  const day = when === "Today" ? "today" : when;
  return time ? `${day} at ${time}` : day;
}

/** Reminders and "due now" notifications for open tasks, in this phone's time zone. */
export function buildTaskJobs(tasks: Task[], nowMs: number = Date.now()): ReminderJob[] {
  const jobs: ReminderJob[] = [];
  const today = toISODate(new Date(nowMs));
  const scanTo = toISODate(new Date(nowMs + (REPEAT_HORIZON_DAYS + 2) * DAY_MS));

  for (const task of tasks) {
    if (task.completed || !task.dueDate) continue;

    const repeating = Boolean(task.repeat);
    const limit = nowMs + (repeating ? REPEAT_HORIZON_DAYS : SINGLE_HORIZON_DAYS) * DAY_MS;
    const dates = repeating
      ? occurrenceDates(task, today, scanTo, MAX_OCCURRENCES)
      : [task.dueDate];

    for (const date of dates) {
      const occurrence = { dueDate: date, dueTime: task.dueTime };
      const due = dueMs(occurrence);
      const url = `/tasks/${task.id}`;

      if (due !== null && due > nowMs && due <= limit) {
        jobs.push({
          id: `${task.id}:${date}:due`,
          at: due,
          title: task.title,
          body: task.dueTime ? "Due now" : "Due today",
          url,
          tag: `due-${task.id}-${date}`,
        });
      }

      (task.reminders ?? []).forEach((rule, index) => {
        const at = ruleMs(rule, occurrence);
        if (at === null || at <= nowMs || at > limit) return;
        // One notification when a reminder lands on the due time itself.
        if (due !== null && Math.abs(at - due) < SAME_TIME_MS) return;
        jobs.push({
          id: `${task.id}:${date}:r${index}`,
          at,
          title: task.title,
          body: `Due ${dueLabel(date, task.dueTime)}`,
          url,
          tag: `reminder-${task.id}-${date}-${index}`,
        });
      });
    }
  }

  return jobs.sort((a, b) => a.at - b.at).slice(0, MAX_JOBS);
}

let lastSignature: string | null = null;

/** Sends the current notifications to the server, unless nothing changed since the last send. */
export async function syncTaskReminders(tasks: Task[], force = false): Promise<void> {
  try {
    if (typeof Notification === "undefined" || Notification.permission !== "granted") return;
    if (!(await currentSubscription())) return;

    const jobs = buildTaskJobs(tasks);
    const signature = JSON.stringify(jobs.map((j) => [j.id, j.at, j.title, j.body]));
    if (!force && signature === lastSignature) return;

    const result = await postJobs("task", jobs);
    if (result.ok) lastSignature = signature;
  } catch {
    // try again on the next change
  }
}