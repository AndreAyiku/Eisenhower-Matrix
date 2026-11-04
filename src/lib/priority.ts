import { addDaysISO, formatDue, todayISO } from "./dates";

export interface PriorityFlags {
  important: boolean;
  urgent: boolean;
}

export function flagsLabel({ important, urgent }: PriorityFlags): string {
  if (important && urgent) return "important + urgent";
  if (important) return "important, not urgent";
  if (urgent) return "urgent, not important";
  return "not important or urgent";
}

export function suggestPriority(dueDate?: string): PriorityFlags {
  const urgent = dueDate !== undefined && dueDate <= addDaysISO(1);
  return { important: true, urgent };
}

export function suggestionReason(dueDate?: string): string {
  if (!dueDate) return "No due date.";
  if (dueDate < todayISO()) return "Past its due date.";
  if (dueDate === todayISO()) return "Due today.";
  if (dueDate === addDaysISO(1)) return "Due tomorrow.";
  return `Due ${formatDue(dueDate)}.`;
}