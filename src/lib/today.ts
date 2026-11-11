import { blocksForDay, type Block } from "./calendar";
import { formatDue, toISODate } from "./dates";
import { loadLog } from "./focus";
import { quadrantOf } from "./quadrants";
import { shortRepeat } from "./recurrence";
import type { QuadrantId, Task } from "../types/task";

const ORDER: Record<QuadrantId, number> = { do: 0, schedule: 1, delegate: 2, eliminate: 3 };

function completedOn(task: Task): string | null {
  const stamp = task.completed ? (task.completedAt ?? task.updatedAt) : task.lastDoneAt;
  if (!stamp) return null;
  const d = new Date(stamp);
  return Number.isNaN(d.getTime()) ? null : toISODate(d);
}

/** Done today out of today's plan (due today, overdue, or finished today). */
export function dayProgress(tasks: Task[], today: string): { done: number; total: number } {
  let done = 0;
  let total = 0;
  for (const t of tasks) {
    if (completedOn(t) === today) {
      done++;
      total++;
    }
    if (!t.completed && t.dueDate && t.dueDate <= today) total++;
  }
  return { done, total };
}

export function focusedMinutesToday(today: string): number {
  return loadLog().reduce((sum, entry) => {
    const d = new Date(entry.startedAt);
    return !Number.isNaN(d.getTime()) && toISODate(d) === today ? sum + entry.minutes : sum;
  }, 0);
}

/** The top three open tasks. Tasks in `keep` stay in place even once done. */
export function bigThree(tasks: Task[], keep: ReadonlySet<string>): Task[] {
  return tasks
    .filter((t) => !t.completed || keep.has(t.id))
    .sort(
      (a, b) =>
        ORDER[quadrantOf(a)] - ORDER[quadrantOf(b)] ||
        (a.dueDate ?? "9999-99-99").localeCompare(b.dueDate ?? "9999-99-99") ||
        (a.dueTime ?? "99:99").localeCompare(b.dueTime ?? "99:99")
    )
    .slice(0, 3);
}

/** The block happening now, or the next one today. */
export function nextBlock(tasks: Task[], today: string, nowMin: number): Block | null {
  return (
    blocksForDay(tasks, today).find((b) => !b.task.completed && b.endMin > nowMin) ?? null
  );
}

export function formatFocused(min: number): string {
  const h = Math.floor(min / 60);
  const m = min % 60;
  if (h > 0) return m > 0 ? `${h}h ${m}m` : `${h}h`;
  return `${m}m`;
}

export function shortSpan(min: number): string {
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

export function greeting(hour: number): string {
  if (hour < 12) return "Good morning.";
  if (hour < 18) return "Good afternoon.";
  return "Good evening.";
}

export function taskMeta(task: Task, today: string): string {
  let due: string;
  if (!task.dueDate) due = "No due date";
  else if (task.dueDate < today) due = `Overdue since ${formatDue(task.dueDate)}`;
  else due = `Due ${formatDue(task.dueDate).replace(/^Today/, "today")}`;

  return [
    due,
    task.estimateMinutes ? `${task.estimateMinutes} min` : null,
    task.tags[0] ?? null,
    task.repeat ? shortRepeat(task.repeat) : null,
  ]
    .filter(Boolean)
    .join(" · ");
}