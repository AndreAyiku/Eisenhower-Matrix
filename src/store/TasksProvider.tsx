import { useEffect, useMemo, useState, type ReactNode } from "react";
import { newId } from "../lib/id";
import { SAMPLE_TASKS } from "../lib/sampleTasks";
import type { Task } from "../types/task";
import { TasksContext, type TasksContextValue } from "./tasksContext";

const KEY = "ff-tasks-v1";

function load(): Task[] {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const parsed: unknown = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed as Task[];
    }
  } catch {
    // storage unavailable or corrupted: fall back to samples
  }
  return SAMPLE_TASKS;
}

function touch(task: Task, patch: Partial<Task>): Task {
  const now = new Date().toISOString();
  const next: Task = { ...task, ...patch, updatedAt: now };
  if (patch.completed !== undefined && patch.completed !== task.completed) {
    next.completedAt = patch.completed ? now : undefined;
  }
  return next;
}

interface Props {
  children: ReactNode;
}

export default function TasksProvider({ children }: Props) {
  const [tasks, setTasks] = useState<Task[]>(load);

  useEffect(() => {
    try {
      localStorage.setItem(KEY, JSON.stringify(tasks));
    } catch {
      // storage unavailable
    }
  }, [tasks]);

  const value = useMemo<TasksContextValue>(
    () => ({
      tasks,
      getTask: (id) => tasks.find((t) => t.id === id),
      addTask: (task) => setTasks((prev) => [...prev, task]),
      updateTask: (id, patch) =>
        setTasks((prev) => prev.map((t) => (t.id === id ? touch(t, patch) : t))),
      deleteTask: (id) => setTasks((prev) => prev.filter((t) => t.id !== id)),
      addSubtask: (taskId, title) =>
        setTasks((prev) =>
          prev.map((t) =>
            t.id === taskId
              ? touch(t, {
                  subtasks: [...t.subtasks, { id: newId(), title, done: false }],
                })
              : t
          )
        ),
      updateSubtask: (taskId, subtaskId, patch) =>
        setTasks((prev) =>
          prev.map((t) =>
            t.id === taskId
              ? touch(t, {
                  subtasks: t.subtasks.map((s) =>
                    s.id === subtaskId ? { ...s, ...patch } : s
                  ),
                })
              : t
          )
        ),
      deleteSubtask: (taskId, subtaskId) =>
        setTasks((prev) =>
          prev.map((t) =>
            t.id === taskId
              ? touch(t, { subtasks: t.subtasks.filter((s) => s.id !== subtaskId) })
              : t
          )
        ),
    }),
    [tasks]
  );

  return <TasksContext.Provider value={value}>{children}</TasksContext.Provider>;
}