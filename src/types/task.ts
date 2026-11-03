export type QuadrantId = "do" | "schedule" | "delegate" | "eliminate";

export interface Subtask {
  id: string;
  title: string;
  done: boolean;
  completedAt?: string; // ISO date-time
  estimateMinutes?: number;
}

export interface Task {
  id: string;
  title: string;
  notes?: string;
  important: boolean;
  urgent: boolean;
  completed: boolean;
  tags: string[];
  project?: string;
  dueDate?: string; // "YYYY-MM-DD" (local date); missing = "Someday"
  dueTime?: string; // "HH:mm"
  reminderAt?: string; // ISO date-time
  estimateMinutes?: number;
  subtasks: Subtask[];
  createdAt: string;
  updatedAt: string;
}