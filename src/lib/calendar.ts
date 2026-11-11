import type { Task } from "../types/task";
import { toISODate } from "./dates";
import { occursOn } from "./recurrence";

const WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

export const DEFAULT_BLOCK_MIN = 30;

export interface Block {
  task: Task;
  date: string; // "YYYY-MM-DD"
  startMin: number; // minutes after midnight
  endMin: number;
}

export interface PositionedBlock extends Block {
  lane: number;
  lanes: number;
}

const pad = (n: number) => String(n).padStart(2, "0");

export function parseISO(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d);
}

export function addDays(iso: string, days: number): string {
  const d = parseISO(iso);
  d.setDate(d.getDate() + days);
  return toISODate(d);
}

/** Monday-first list of the 7 days in the week containing `iso`. */
export function weekDays(iso: string): string[] {
  const mondayOffset = (parseISO(iso).getDay() + 6) % 7;
  const monday = addDays(iso, -mondayOffset);
  return Array.from({ length: 7 }, (_, i) => addDays(monday, i));
}

export function fmtMin(total: number): string {
  if (total >= 1440) return "24:00";
  return `${pad(Math.floor(total / 60))}:${pad(total % 60)}`;
}

/** "09" for whole hours, "10:30" otherwise (used in the tight week grid). */
export function fmtMinShort(total: number): string {
  return total % 60 === 0 ? pad(Math.floor(total / 60)) : fmtMin(total);
}

function parseTime(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + (m || 0);
}

export function blockFor(task: Task, date: string): Block | null {
  if (!task.dueTime || !occursOn(task, date)) return null;
  const startMin = parseTime(task.dueTime);
  const length = task.estimateMinutes ?? DEFAULT_BLOCK_MIN;
  return {
    task,
    date,
    startMin,
    endMin: Math.min(startMin + length, 1440),
  };
}

export function blocksForDay(tasks: Task[], date: string): Block[] {
  const result: Block[] = [];
  for (const task of tasks) {
    const block = blockFor(task, date);
    if (block) result.push(block);
  }
  return result.sort((a, b) => a.startMin - b.startMin || a.endMin - b.endMin);
}

export function unscheduledForDay(tasks: Task[], date: string): Task[] {
  return tasks.filter((t) => !t.dueTime && !t.completed && occursOn(t, date));
}

/** Places overlapping blocks side by side. */
export function layoutOverlaps(blocks: Block[]): PositionedBlock[] {
  const sorted = [...blocks].sort(
    (a, b) => a.startMin - b.startMin || a.endMin - b.endMin
  );
  const result: PositionedBlock[] = [];
  let cluster: { block: Block; lane: number }[] = [];
  let laneEnds: number[] = [];
  let clusterEnd = 0;

  const flush = () => {
    const lanes = Math.max(laneEnds.length, 1);
    for (const item of cluster) {
      result.push({ ...item.block, lane: item.lane, lanes });
    }
    cluster = [];
    laneEnds = [];
  };

  for (const block of sorted) {
    if (cluster.length > 0 && block.startMin >= clusterEnd) {
      flush();
      clusterEnd = 0;
    }
    let lane = laneEnds.findIndex((end) => end <= block.startMin);
    if (lane === -1) {
      lane = laneEnds.length;
      laneEnds.push(block.endMin);
    } else {
      laneEnds[lane] = block.endMin;
    }
    cluster.push({ block, lane });
    clusterEnd = Math.max(clusterEnd, block.endMin);
  }
  flush();
  return result;
}

export function formatDayLong(iso: string): string {
  const d = parseISO(iso);
  return `${WEEKDAYS[d.getDay()]}, ${d.getDate()} ${MONTHS[d.getMonth()]}`;
}

export function formatMonthYear(iso: string): string {
  const d = parseISO(iso);
  return `${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}

export function formatWeekRange(days: string[]): string {
  const a = parseISO(days[0]);
  const b = parseISO(days[days.length - 1]);
  if (a.getMonth() === b.getMonth()) {
    return `${a.getDate()}–${b.getDate()} ${MONTHS[b.getMonth()]}`;
  }
  return `${a.getDate()} ${MONTHS[a.getMonth()]} – ${b.getDate()} ${MONTHS[b.getMonth()]}`;
}

export function weekdayShort(iso: string): string {
  return WEEKDAYS[parseISO(iso).getDay()].slice(0, 3);
}

export function formatShortDay(iso: string): string {
  return `${weekdayShort(iso)} ${parseISO(iso).getDate()}`;
}

/** Local date-time for the add-task sheet when opened from the calendar. */
export function defaultDue(day: string, now: Date): string {
  if (day !== toISODate(now)) return `${day}T09:00`;
  const mins = now.getHours() * 60 + now.getMinutes();
  const next = Math.min(Math.ceil((mins + 1) / 30) * 30, 23 * 60 + 30);
  return `${day}T${fmtMin(next)}`;
}

export function timeZoneLabel(): string {
  try {
    const part = new Intl.DateTimeFormat("en", { timeZoneName: "short" })
      .formatToParts(new Date())
      .find((p) => p.type === "timeZoneName");
    return part?.value ?? "";
  } catch {
    return "";
  }
}