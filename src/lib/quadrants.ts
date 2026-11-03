import type { QuadrantId, Task } from "../types/task";

export interface QuadrantDef {
  id: QuadrantId;
  label: string;
  hint: string;
}

export const QUADRANTS: QuadrantDef[] = [
  { id: "do", label: "Do first", hint: "Important + urgent" },
  { id: "schedule", label: "Schedule", hint: "Important + not urgent" },
  { id: "delegate", label: "Delegate", hint: "Urgent + not important" },
  { id: "eliminate", label: "Let go", hint: "Not important or urgent" },
];

export function quadrantOf(task: Pick<Task, "important" | "urgent">): QuadrantId {
  if (task.important && task.urgent) return "do";
  if (task.important) return "schedule";
  if (task.urgent) return "delegate";
  return "eliminate";
}