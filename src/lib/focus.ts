import type { QuadrantId, Task } from "../types/task";
import { quadrantOf } from "./quadrants";

export type FocusMode = "focus" | "short" | "long";
export type FocusStatus = "idle" | "running" | "paused";

export interface FocusSettings {
  focusMin: number;
  shortMin: number;
  longMin: number;
  cycle: number; // focus sessions before a long break
}

export const DEFAULT_SETTINGS: FocusSettings = {
  focusMin: 25,
  shortMin: 5,
  longMin: 15,
  cycle: 4,
};

export interface FocusState {
  mode: FocusMode;
  session: number; // 1-based position in the cycle
  status: FocusStatus;
  taskId?: string | null; // undefined = automatic, null = no task
  totalMs: number;
  remainingMs: number;
  endsAt?: number; // epoch ms, while running
  startedAt?: number; // epoch ms
  notice?: string;
}

export interface FocusLogEntry {
  id: string;
  taskId?: string;
  startedAt: string;
  minutes: number;
}

const SETTINGS_KEY = "ff-focus-settings-v1";
const STATE_KEY = "ff-focus-state-v1";
const LOG_KEY = "ff-focus-log-v1";

function read<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

function write(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // storage unavailable
  }
}

export function modeMs(mode: FocusMode, s: FocusSettings): number {
  const min = mode === "focus" ? s.focusMin : mode === "short" ? s.shortMin : s.longMin;
  return min * 60000;
}

export function loadSettings(): FocusSettings {
  return { ...DEFAULT_SETTINGS, ...(read<Partial<FocusSettings>>(SETTINGS_KEY) ?? {}) };
}

export function saveSettings(s: FocusSettings): void {
  write(SETTINGS_KEY, s);
}

export function initialState(settings: FocusSettings): FocusState {
  const total = modeMs("focus", settings);
  return { mode: "focus", session: 1, status: "idle", totalMs: total, remainingMs: total };
}

export function loadState(settings: FocusSettings): FocusState {
  const saved = read<FocusState>(STATE_KEY);
  const modes = ["focus", "short", "long"];
  const statuses = ["idle", "running", "paused"];
  if (!saved || !modes.includes(saved.mode) || !statuses.includes(saved.status)) {
    return initialState(settings);
  }
  return { ...initialState(settings), ...saved };
}

export function saveState(s: FocusState): void {
  write(STATE_KEY, s);
}

export function loadLog(): FocusLogEntry[] {
  const log = read<FocusLogEntry[]>(LOG_KEY);
  return Array.isArray(log) ? log : [];
}

/** Adds a finished focus session. Safe to call twice for the same session. */
export function logSession(entry: FocusLogEntry): void {
  const log = loadLog();
  if (log.some((e) => e.id === entry.id)) return;
  write(LOG_KEY, [...log, entry]);
}

/** The state after the running timer reaches zero. */
export function afterCompletion(state: FocusState, settings: FocusSettings): FocusState {
  if (state.mode === "focus") {
    const mode: FocusMode = state.session >= settings.cycle ? "long" : "short";
    const total = modeMs(mode, settings);
    const minutes = mode === "long" ? settings.longMin : settings.shortMin;
    return {
      mode,
      session: state.session,
      status: "idle",
      taskId: state.taskId,
      totalMs: total,
      remainingMs: total,
      notice: `Focus session complete. Time for a ${minutes}-minute break.`,
    };
  }

  const session =
    state.mode === "long" || state.session >= settings.cycle ? 1 : state.session + 1;
  const total = modeMs("focus", settings);
  return {
    mode: "focus",
    session,
    status: "idle",
    taskId: state.taskId,
    totalMs: total,
    remainingMs: total,
    notice: `Break over. Ready for session ${session} of ${settings.cycle}?`,
  };
}

const ORDER: Record<QuadrantId, number> = { do: 0, schedule: 1, delegate: 2, eliminate: 3 };

export function sortForFocus(tasks: Task[]): Task[] {
  return tasks
    .filter((t) => !t.completed)
    .sort(
      (a, b) =>
        ORDER[quadrantOf(a)] - ORDER[quadrantOf(b)] ||
        (a.dueDate ?? "9999-99-99").localeCompare(b.dueDate ?? "9999-99-99") ||
        (a.dueTime ?? "99:99").localeCompare(b.dueTime ?? "99:99")
    );
}

export function defaultTask(tasks: Task[]): Task | undefined {
  return sortForFocus(tasks)[0];
}

export function formatClock(ms: number): string {
  const total = Math.max(0, Math.ceil(ms / 1000));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export function formatElapsed(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return m > 0 ? `${m}m ${s}s` : `${s}s`;
}