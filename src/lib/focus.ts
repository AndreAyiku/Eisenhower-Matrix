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

const DEV = import.meta.env.DEV;

export const LIMITS = {
  focus: { min: DEV ? 1 : 5, max: 180 },
  short: { min: DEV ? 1 : 5, max: 10 },
  long: { min: DEV ? 1 : 10, max: 20 },
  cycle: { min: 2, max: 6 },
};

export const MAX_SESSIONS = 10;

/** A task's estimated time split into equal focus sessions. */
export interface Plan {
  taskId: string;
  sessions: number;
  estimateMin: number;
}

export interface FocusState {
  mode: FocusMode;
  session: number; // 1-based position in the plan (or in the loop)
  status: FocusStatus;
  taskId?: string | null; // undefined = automatic, null = no task
  plan?: Plan | null; // null/undefined = plain loop
  planDone?: string; // id of a task whose plan just finished
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

function clampTo(value: unknown, range: { min: number; max: number }, fallback: number): number {
  const n = Math.round(Number(value));
  if (!Number.isFinite(n)) return fallback;
  return Math.min(range.max, Math.max(range.min, n));
}

export function clampSettings(s: FocusSettings): FocusSettings {
  return {
    focusMin: clampTo(s.focusMin, LIMITS.focus, DEFAULT_SETTINGS.focusMin),
    shortMin: clampTo(s.shortMin, LIMITS.short, DEFAULT_SETTINGS.shortMin),
    longMin: clampTo(s.longMin, LIMITS.long, DEFAULT_SETTINGS.longMin),
    cycle: clampTo(s.cycle, LIMITS.cycle, DEFAULT_SETTINGS.cycle),
  };
}

export function loadSettings(): FocusSettings {
  return clampSettings({
    ...DEFAULT_SETTINGS,
    ...(read<Partial<FocusSettings>>(SETTINGS_KEY) ?? {}),
  });
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

// ---------- Splitting a task into sessions ----------

/** Session counts offered for a task, each at least the minimum focus length. */
export function sessionOptions(estimateMin: number): number[] {
  const options: number[] = [];
  for (let n = 1; n <= MAX_SESSIONS; n++) {
    if (n === 1 || estimateMin / n >= LIMITS.focus.min) options.push(n);
  }
  return options;
}

/** The fewest sessions that keep each one within the preferred focus length. */
export function defaultSessions(estimateMin: number, focusMin: number, options: number[]): number {
  const wanted = Math.max(1, Math.ceil(estimateMin / Math.max(focusMin, 1)));
  return options.find((n) => n >= wanted) ?? options[options.length - 1];
}

/** The saved plan if it still fits the task, otherwise a fresh default. */
export function resolvePlan(
  task: Task | undefined,
  saved: Plan | null | undefined,
  settings: FocusSettings
): Plan | null {
  const estimateMin = task?.estimateMinutes;
  if (!task || !estimateMin) return null;
  const options = sessionOptions(estimateMin);
  if (
    saved &&
    saved.taskId === task.id &&
    saved.estimateMin === estimateMin &&
    options.includes(saved.sessions)
  ) {
    return saved;
  }
  return {
    taskId: task.id,
    estimateMin,
    sessions: defaultSessions(estimateMin, settings.focusMin, options),
  };
}

export function planSessionMs(plan: Plan): number {
  return Math.round((plan.estimateMin * 60000) / plan.sessions);
}

/** "15 min" or "22m 30s". */
export function formatSessionLength(estimateMin: number, sessions: number): string {
  const totalSec = Math.round((estimateMin * 60) / sessions);
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  if (s === 0) return `${m} min`;
  return m === 0 ? `${s}s` : `${m}m ${s}s`;
}

/** A long break after every Nth session, a short one otherwise. */
export function breakAfter(session: number, settings: FocusSettings): "short" | "long" {
  return session % settings.cycle === 0 ? "long" : "short";
}

export function planSummary(estimateMin: number, sessions: number, settings: FocusSettings) {
  let shorts = 0;
  let longs = 0;
  for (let k = 1; k < sessions; k++) {
    if (breakAfter(k, settings) === "long") longs++;
    else shorts++;
  }
  return {
    shorts,
    longs,
    totalMin: estimateMin + shorts * settings.shortMin + longs * settings.longMin,
  };
}

export function describeBreaks(shorts: number, longs: number): string {
  const parts: string[] = [];
  if (shorts) parts.push(`${shorts} short ${shorts === 1 ? "break" : "breaks"}`);
  if (longs) parts.push(`${longs} long ${longs === 1 ? "break" : "breaks"}`);
  return parts.length ? parts.join(" + ") : "no breaks";
}

// ---------- What happens when a timer reaches zero ----------

export function afterCompletion(state: FocusState, settings: FocusSettings): FocusState {
  const plan = state.plan ?? null;

  if (state.mode === "focus") {
    if (plan && state.session >= plan.sessions) {
      const total = modeMs("focus", settings);
      return {
        mode: "focus",
        session: 1,
        status: "idle",
        taskId: state.taskId,
        plan: null,
        planDone: plan.taskId,
        totalMs: total,
        remainingMs: total,
        notice: `All ${plan.sessions} ${plan.sessions === 1 ? "session" : "sessions"} done. Nice work.`,
      };
    }

    const mode: FocusMode = plan
      ? breakAfter(state.session, settings)
      : state.session >= settings.cycle
        ? "long"
        : "short";
    const total = modeMs(mode, settings);
    return {
      mode,
      session: state.session,
      status: "idle",
      taskId: state.taskId,
      plan,
      totalMs: total,
      remainingMs: total,
      notice: `Focus session complete. Time for a ${Math.round(total / 60000)}-minute break.`,
    };
  }

  // A break just ended.
  const sessionsTotal = plan ? plan.sessions : settings.cycle;
  const session = plan
    ? Math.min(state.session + 1, sessionsTotal)
    : state.mode === "long" || state.session >= settings.cycle
      ? 1
      : state.session + 1;
  const total = modeMs("focus", settings);
  return {
    mode: "focus",
    session,
    status: "idle",
    taskId: state.taskId,
    plan,
    totalMs: total,
    remainingMs: total,
    notice: `Break over. Ready for session ${session} of ${sessionsTotal}?`,
  };
}

// ---------- Choosing a task ----------

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