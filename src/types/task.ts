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

export type RepeatUnit = "day" | "week" | "month" | "year";

export interface RepeatRule {
  unit: RepeatUnit;
  interval: number; // every N units
  weekdays?: number[]; // weeks only: 0 = Sunday ... 6 = Saturday. Empty = same weekday as the start
  anchor: string; // "YYYY-MM-DD" the series is counted from
}

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
  dueDate?: string; // "YYYY-MM-DD" (local date); for a repeating task, its next time
  dueTime?: string; // "HH:mm"
  reminders?: ReminderRule[];
  repeat?: RepeatRule;
  lastDoneAt?: string; // when a repeating task was last marked done
  estimateMinutes?: number;
  calendar?: string; // "Work", "Personal"
  subtasks: Subtask[];
  createdAt: string;
  updatedAt: string;
}