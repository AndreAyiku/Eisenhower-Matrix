import { formatDue } from "./dates";
import { currentSubscription, postJobs, type ReminderJob } from "./push";
import type { Task } from "../types/task";

const MAX_JOBS = 100;
const HORIZON_MS = 90 * 24 * 60 * 60 * 1000;

function bodyFor(task: Task): string {
  const parts: string[] = [];
  if (task.dueDate) {
    const when = formatDue(task.dueDate);
    const day = when === "Today" ? "today" : when;
    parts.push(task.dueTime ? `Due ${day}, ${task.dueTime}` : `Due ${day}`);
  }
  if (task.estimateMinutes) parts.push(`${task.estimateMinutes} min`);
  return parts.length > 0 ? parts.join(" · ") : "Reminder";
}

/** Upcoming reminders from open tasks. The reminder time is read in this phone's time zone. */
export function buildTaskJobs(tasks: Task[], nowMs: number = Date.now()): ReminderJob[] {
  const jobs: ReminderJob[] = [];
  for (const task of tasks) {
    if (task.completed || !task.reminderAt) continue;
    const at = new Date(task.reminderAt).getTime();
    if (!Number.isFinite(at) || at <= nowMs || at > nowMs + HORIZON_MS) continue;
    jobs.push({
      id: task.id,
      at,
      title: task.title,
      body: bodyFor(task),
      url: `/tasks/${task.id}`,
      tag: `reminder-${task.id}`,
    });
  }
  return jobs.sort((a, b) => a.at - b.at).slice(0, MAX_JOBS);
}

let lastSignature: string | null = null;

/** Sends the current reminders to the server, unless nothing changed since the last send. */
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