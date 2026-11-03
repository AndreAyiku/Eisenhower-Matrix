import type { Task } from "../types/task";
import { addDaysISO, todayISO } from "./dates";

function make(
  id: string,
  title: string,
  flags: { important: boolean; urgent: boolean },
  extra: Partial<Task> = {}
): Task {
  const now = new Date().toISOString();
  return {
    id,
    title,
    important: flags.important,
    urgent: flags.urgent,
    completed: false,
    tags: [],
    subtasks: [],
    createdAt: now,
    updatedAt: now,
    ...extra,
  };
}

export const SAMPLE_TASKS: Task[] = [
  make("1", "Launch proposal", { important: true, urgent: true }, {
    notes: "Bring the launch story, success metrics and rollout plan together for Maya’s review.",
    tags: ["Strategy"],
    dueDate: todayISO(),
    dueTime: "17:00",
    estimateMinutes: 45,
    subtasks: [
      { id: "1a", title: "Outline the launch story", done: true },
      { id: "1b", title: "Define success metrics", done: false, estimateMinutes: 20 },
      { id: "1c", title: "Draft rollout timeline", done: false, estimateMinutes: 25 },
    ],
  }),
  make("2", "Q4 roadmap", { important: true, urgent: false }, {
    tags: ["Planning"],
    dueDate: addDaysISO(2),
    estimateMinutes: 45,
  }),
  make("3", "Read research notes", { important: true, urgent: false }, {
    dueDate: addDaysISO(3),
    estimateMinutes: 30,
  }),
  make("4", "Reply to Maya", { important: false, urgent: true }, {
    dueDate: todayISO(),
    estimateMinutes: 15,
  }),
  make("5", "Organise desktop", { important: false, urgent: false }, {
    estimateMinutes: 15,
  }),
];