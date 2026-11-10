export type QuadrantId = "do" | "schedule" | "delegate" | "eliminate";

export interface Subtask {
  id: string;
  title: string;
  done: boolean;
  completedAt?: string; // ISO date-time
  estimateMinutes?: number;
}
export type ReminderRule =
  | { type: "before"; minutes: number } // before the due time (0 = at the due time)
  | { type: "morning"; daysBefore: number } // at 09:00, for tasks with a date but no time
  | { type: "custom"; at: string }; // exact local date-time "YYYY-MM-DDTHH:mm"

export interface Task {
  id: string;
  title: string;
  notes?: string;
  important: boolean;
  urgent: boolean;
  completed: boolean;
  completedAt?: string; // set automatically when a task is marked done
  tags: string[];
  project?: string;
  dueDate?: string; // "YYYY-MM-DD" (local date); missing = "Someday"
  dueTime?: string; // "HH:mm"
  reminder?: ReminderRule;
  calendar?: string; // "Work", "Personal"
  estimateMinutes?: number;
  subtasks: Subtask[];
  createdAt: string;
  updatedAt: string;
}