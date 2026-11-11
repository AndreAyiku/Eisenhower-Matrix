import { createContext, useContext } from "react";
import type { Subtask, Task } from "../types/task";

export interface TasksContextValue {
  tasks: Task[];
  getTask: (id: string) => Task | undefined;
  addTask: (task: Task) => void;
  updateTask: (id: string, patch: Partial<Omit<Task, "id">>) => void;
  /** Marks a task done. A repeating task moves to its next time instead of closing. */
  completeTask: (id: string) => void;
  deleteTask: (id: string) => void;
  addSubtask: (taskId: string, title: string) => void;
  updateSubtask: (
    taskId: string,
    subtaskId: string,
    patch: Partial<Omit<Subtask, "id">>
  ) => void;
  deleteSubtask: (taskId: string, subtaskId: string) => void;
}

export const TasksContext = createContext<TasksContextValue | null>(null);

export function useTasks(): TasksContextValue {
  const ctx = useContext(TasksContext);
  if (!ctx) throw new Error("useTasks must be used inside <TasksProvider>");
  return ctx;
}