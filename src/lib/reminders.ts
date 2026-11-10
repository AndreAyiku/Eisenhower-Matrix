import { formatDue } from "./dates";
import { currentSubscription, postJobs, type ReminderJob } from "./push";
import { dueMs, reminderMs } from "./reminder";
import type { Task } from "../types/task";

const MAX_JOBS = 100;
const HORIZON_MS = 90 * 24 * 60 * 60 * 1000;
const SAME_TIME_MS = 30_000;

function dueLabel(task: Task): string {
  if (!task.dueDate) return "";
  const when = formatDue(task.dueDate);
  const day = when === "Today" ? "today" : when;
  return task.dueTime ? `${day} at ${task.dueTime}` : day;
}

/** Reminders and "due now" notifications for open tasks, in this phone's time zone. */
export function buildTaskJobs(tasks: Task[], nowMs: number = Date.now()): ReminderJob[] {
  const jobs: ReminderJob[] = [];
  const upcoming = (at: number) => at > nowMs && at <= nowMs + HORIZON_MS;

  for (const task of tasks) {
    if (task.completed) continue;
    const due = dueMs(task);
    const remindAt = reminderMs(task);

    if (due !== null && upcoming(due)) {
      jobs.push({
        id: `${task.id}:due`,
        at: due,
        title: task.title,
        body: task.dueTime ? "Due now" : "Due today",
        url: `/tasks/${task.id}`,
        tag: `due-${task.id}`,
      });
    }

    // One notification when a reminder lands on the due time itself.
    const sameAsDue = due !== null && remindAt !== null && Math.abs(remindAt - due) < SAME_TIME_MS;
    if (remindAt !== null && upcoming(remindAt) && !sameAsDue) {
      jobs.push({
        id: `${task.id}:reminder`,
        at: remindAt,
        title: task.title,
        body: task.dueDate ? `Due ${dueLabel(task)}` : "Reminder",
        url: `/tasks/${task.id}`,
        tag: `reminder-${task.id}`,
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