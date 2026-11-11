import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { toISODate } from "../lib/dates";
import { newId } from "../lib/id";
import { advanceTask } from "../lib/recurrence";
import { migrateTask, type LegacyTask } from "../lib/reminder";
import type { Task } from "../types/task";
import { TasksContext, type TasksContextValue } from "./tasksContext";

const KEY = "ff-tasks-v1";

function load(): Task[] {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const parsed: unknown = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return (parsed as LegacyTask[]).map((t) => migrateTask(t));
      }
    }
  } catch {
    // storage unavailable or unreadable: start empty
  }
  return [];
}

function save(tasks: Task[]): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(tasks));
  } catch {
    // storage unavailable
  }
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
  const latest = useRef(tasks);

  useEffect(() => {
    latest.current = tasks;
    save(tasks);
  }, [tasks]);

  // iOS can drop recent changes if the app is closed right away, so save again when leaving.
  useEffect(() => {
    const flush = () => save(latest.current);
    const onVisibility = () => {
      if (document.visibilityState === "hidden") flush();
    };
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("pagehide", flush);
    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("pagehide", flush);
    };
  }, []);

  const value = useMemo<TasksContextValue>(
    () => ({
      tasks,
      getTask: (id) => tasks.find((t) => t.id === id),
      addTask: (task) => setTasks((prev) => [...prev, task]),
      updateTask: (id, patch) =>
        setTasks((prev) => prev.map((t) => (t.id === id ? touch(t, patch) : t))),
      completeTask: (id) =>
        setTasks((prev) =>
          prev.map((t) => {
            if (t.id !== id) return t;
            const now = new Date();
            return (
              advanceTask(t, toISODate(now), now.toISOString()) ??
              touch(t, { completed: true })
            );
          })
        ),
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